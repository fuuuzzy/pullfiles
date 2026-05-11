import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import type { ProjectEpisodesRepo, ProjectsRepo } from "../db/projects.js";
import type { BaiduShareClient } from "./baidu-share.js";
import type { BaiduPanClient } from "./baidu-pan.js";
import type { R2Client } from "./r2-upload.js";
import { getContentType } from "../utils/content-type.js";
import { parseEpisodeNumber } from "../utils/episode-parser.js";

export interface ProjectSyncContext {
	projectsRepo: ProjectsRepo;
	projectEpisodesRepo: ProjectEpisodesRepo;
	shareClient: BaiduShareClient;
	baidu: BaiduPanClient;
	r2: R2Client;
	tempDir: string;
	r2Prefix: string;
	saveApiUrl: string;
}

interface UploadedFile {
	fs_id: number;
	filename: string;
	r2_url: string;
	partIdx: number | null;
}

let isRunning = false;

export function getSyncStatus() {
	return { isRunning };
}

export async function runProjectSync(ctx: ProjectSyncContext): Promise<void> {
	if (isRunning) {
		return;
	}

	isRunning = true;

	try {
		const projects = ctx.projectsRepo.list();
		const pendingProjects = projects.filter((p) => p.status === "created" || p.status === "failed");

		for (const project of pendingProjects) {
			await syncProject(ctx, project.id);
		}
	} finally {
		isRunning = false;
	}
}

async function syncProject(ctx: ProjectSyncContext, projectId: number): Promise<void> {
	ctx.projectsRepo.updateStatus(projectId, "parsing");

	const episodes = ctx.projectEpisodesRepo.listPendingByProjectId(projectId);
	if (episodes.length === 0) {
		ctx.projectsRepo.updateStatus(projectId, "completed");
		return;
	}

	for (const episode of episodes) {
		try {
			await syncEpisode(ctx, episode.id);
			ctx.projectsRepo.incrementCompleted(projectId);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			ctx.projectEpisodesRepo.updateStatus(episode.id, "failed", msg);
		}
	}

	const remainingPending = ctx.projectEpisodesRepo.countByProjectIdAndStatus(projectId, "pending");
	const allUploaded = remainingPending === 0;

	if (allUploaded) {
		ctx.projectsRepo.updateStatus(projectId, "syncing");
		await callSaveApis(ctx, projectId);
		ctx.projectsRepo.updateStatus(projectId, "completed");
	} else {
		const hasFailed = ctx.projectEpisodesRepo.countByProjectIdAndStatus(projectId, "failed") > 0;
		ctx.projectsRepo.updateStatus(projectId, hasFailed ? "failed" : "parsing");
	}
}

async function syncEpisode(ctx: ProjectSyncContext, episodeId: number): Promise<void> {
	ctx.projectEpisodesRepo.updateStatus(episodeId, "downloading");

	const episode = ctx.projectEpisodesRepo.getById(episodeId);
	if (!episode) {
		throw new Error("Episode not found");
	}

	const shareFiles = await ctx.shareClient.listFilesFromLink(episode.baidu_link);

	const videoFiles = shareFiles.filter((f) => {
		const ext = f.server_filename.substring(f.server_filename.lastIndexOf(".")).toLowerCase();
		return [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"].includes(ext);
	});

	const coverFile = shareFiles.find((f) => {
		const ext = f.server_filename.substring(f.server_filename.lastIndexOf(".")).toLowerCase();
		return ext === ".jpg" || ext === ".jpeg" || ext === ".png";
	});

	if (videoFiles.length === 0) {
		throw new Error("No video files found in share link");
	}

	if (episode.total_parts && videoFiles.length !== episode.total_parts) {
		console.warn(
			`Episode ${episodeId}: expected ${episode.total_parts} parts but found ${videoFiles.length} videos`,
		);
	}

	mkdirSync(ctx.tempDir, { recursive: true });

	const uploadedFiles: UploadedFile[] = [];

	for (const file of videoFiles) {
		const tempPath = resolve(ctx.tempDir, file.server_filename);

		try {
			const dlink = await getDlink(ctx, file.fs_id);
			await ctx.baidu.downloadFile(dlink, tempPath);

			const contentType = getContentType(file.server_filename);
			const r2Key = `${ctx.r2Prefix}/${episode.episode_no}/${file.server_filename}`;
			const r2Url = await ctx.r2.uploadFile(tempPath, r2Key, contentType);

			uploadedFiles.push({
				fs_id: file.fs_id,
				filename: file.server_filename,
				r2_url: r2Url,
				partIdx: parseEpisodeNumber(file.server_filename),
			});
		} finally {
			cleanupTemp(tempPath);
		}
	}

	let coverR2Url: string | null = null;
	if (coverFile) {
		const coverTempPath = resolve(ctx.tempDir, coverFile.server_filename);
		try {
			const dlink = await getDlink(ctx, coverFile.fs_id);
			await ctx.baidu.downloadFile(dlink, coverTempPath);

			const contentType = getContentType(coverFile.server_filename);
			const r2Key = `${ctx.r2Prefix}/${episode.episode_no}/cover${coverFile.server_filename.substring(coverFile.server_filename.lastIndexOf("."))}`;
			coverR2Url = await ctx.r2.uploadFile(coverTempPath, r2Key, contentType);

			ctx.projectEpisodesRepo.updateCover(episodeId, coverFile.server_filename);
		} finally {
			cleanupTemp(coverTempPath);
		}
	}

	uploadedFiles.sort((a, b) => {
		if (a.partIdx !== null && b.partIdx !== null) {
			return a.partIdx - b.partIdx;
		}
		return a.filename.localeCompare(b.filename);
	});

	// Store the uploaded files info for later use in save API call
	ctx.projectEpisodesRepo.updateUploadedFiles(
		episodeId,
		JSON.stringify(uploadedFiles),
		coverR2Url,
	);

	ctx.projectEpisodesRepo.updateStatus(episodeId, "uploaded");
}

async function getDlink(ctx: ProjectSyncContext, fsId: number): Promise<string> {
	const metas = await ctx.baidu.getFileMetas([fsId]);
	if (!metas[0]?.dlink) {
		throw new Error(`Failed to get download link for fs_id: ${fsId}`);
	}
	return metas[0].dlink;
}

async function callSaveApis(ctx: ProjectSyncContext, projectId: number): Promise<void> {
	const episodes = ctx.projectEpisodesRepo.listUploadedByProjectId(projectId);

	for (const episode of episodes) {
		try {
			// Retrieve stored uploaded files info
			const uploadedFiles: UploadedFile[] = episode.uploaded_files
				? JSON.parse(episode.uploaded_files)
				: [];

			if (uploadedFiles.length === 0) {
				throw new Error("No uploaded files info found");
			}

			const parts = uploadedFiles.map((f) => ({
				taskId: f.fs_id.toString(),
				originalName: f.filename,
				transtoreStatus: "transtored",
				uploadUrl: f.r2_url,
				addWay: "upload",
				partIdx: f.partIdx ?? 1,
			}));

			const posters = episode.cover_r2_url
				? [
						{
							taskId: "",
							originalName: episode.cover_filename || "",
							uploadUrl: episode.cover_r2_url,
							type: "general",
							title: episode.title,
							defaulted: true,
							horizontal: false,
							remark: "",
						},
					]
				: [];

			const payload = {
				remark: "百度云",
				episodeNo: episode.episode_no,
				title: episode.title,
				language: episode.language || "unknown",
				alias: episode.title,
				episodeDesc: {
					intro: episode.description || "",
					description: episode.description || "",
					subtitle: "",
					tags: [],
					categories: [],
				},
				episodeCopyright: {
					releasedBy: "luckyshort",
					startedAt: "2026-01-05",
					endAt: "2099-01-01",
				},
				parts,
				posters,
			};

			const response = await fetch(ctx.saveApiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(`Save API error: ${response.status}`);
			}

			const responseText = await response.text();
			ctx.projectEpisodesRepo.updateSaved(episode.id, responseText);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			ctx.projectEpisodesRepo.updateStatus(episode.id, "failed", msg);
		}
	}
}

function cleanupTemp(path: string): void {
	try {
		if (existsSync(path)) {
			unlinkSync(path);
		}
	} catch {
		// Best effort cleanup
	}
}