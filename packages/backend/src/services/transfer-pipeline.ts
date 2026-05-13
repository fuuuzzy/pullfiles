import { existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Episode } from "@ls-pull-video/shared";
import type { CompressSettingsRepo } from "../db/compress-settings.js";
import type { EpisodesRepo } from "../db/episodes.js";
import type { TasksRepo } from "../db/tasks.js";
import { getContentType, isVideoFile } from "../utils/content-type.js";
import { progressEmitter } from "../utils/progress-emitter.js";
import {
	compressVideo,
	getVideoDuration,
	shouldCompress,
} from "../utils/video-compress.js";
import type { BaiduPanClient, FileMeta } from "./baidu-pan.js";
import type { R2Client } from "./r2-upload.js";

export interface TransferContext {
	baidu: BaiduPanClient;
	r2: R2Client;
	episodesRepo: EpisodesRepo;
	tasksRepo: TasksRepo;
	tempDir: string;
	r2Prefix: string;
	customDomain: string;
	concurrentTransfers: number;
	ffmpegPath: string | null;
	ffprobePath: string | null;
	compressSettingsRepo: CompressSettingsRepo;
}

let abortController: AbortController | null = null;
let isPipelineRunning = false;

export function getTransferStatus() {
	return { isRunning: isPipelineRunning };
}

export function cancelTransfer(): void {
	if (abortController) {
		abortController.abort();
		abortController = null;
	}
}

function isAbortError(err: unknown): boolean {
	if (!err) return false;
	if (err instanceof Error) {
		if (err.name === "AbortError") return true;
		const msg = err.message.toLowerCase();
		return (
			msg.includes("aborted") || msg.includes("transfer cancelled") || msg.includes("abortsignal")
		);
	}
	return false;
}

export async function runTransfer(ctx: TransferContext): Promise<void> {
	if (isPipelineRunning) {
		return;
	}

	const pendingEpisodes = ctx.episodesRepo.listPending();
	if (pendingEpisodes.length === 0) {
		isPipelineRunning = false;
		progressEmitter.emitPipelineStatus({ isRunning: false });
		return;
	}

	isPipelineRunning = true;
	progressEmitter.emitPipelineStatus({ isRunning: true });

	try {
		abortController = new AbortController();
		const signal = abortController.signal;

		mkdirSync(ctx.tempDir, { recursive: true });

		const taskId = ctx.tasksRepo.create("batch", pendingEpisodes.length);

		progressEmitter.emitTaskUpdate({
			taskId,
			totalFiles: pendingEpisodes.length,
			completedFiles: 0,
			failedFiles: 0,
		});

		let completed = 0;
		let failed = 0;
		let cancelledMidway = false;

		const BATCH_SIZE = 100;
		for (let i = 0; i < pendingEpisodes.length; i += BATCH_SIZE) {
			if (signal.aborted) {
				cancelledMidway = true;
				break;
			}

			const batch = pendingEpisodes.slice(i, i + BATCH_SIZE);

			let metaMap: Map<number, FileMeta>;
			try {
				const metas = await ctx.baidu.getFileMetas(batch.map((e) => e.baidu_fs_id));
				metaMap = new Map<number, FileMeta>();
				for (const meta of metas) {
					metaMap.set(meta.fs_id, meta);
				}
			} catch (batchError) {
				// Network error fetching metas: keep these episodes as pending so the next
				// run can retry them, instead of marking 100 episodes as failed at once.
				const _msg = batchError instanceof Error ? batchError.message : String(batchError);
				// Stop processing further batches — likely systemic network issue
				break;
			}

			const queue = [...batch];
			const workers = Array.from({
				length: Math.min(ctx.concurrentTransfers, queue.length),
			}).map(async (_, index) => {
				if (index > 0) {
					await new Promise((res) => setTimeout(res, index * 1000));
				}
				while (queue.length > 0) {
					if (signal.aborted) return;
					const episode = queue.shift();
					if (!episode) continue;

					try {
						const meta = metaMap.get(episode.baidu_fs_id);
						await processEpisode(ctx, episode, meta, signal);

						completed++;
						ctx.tasksRepo.incrementCompleted(taskId);
					} catch (error) {
						// Always clean up partial temp files
						cleanupTemp(resolve(ctx.tempDir, episode.filename));

						const msg = error instanceof Error ? error.message : String(error);

						if (signal.aborted || isAbortError(error)) {
							// User-initiated cancel: roll back to pending instead of failing.
							ctx.episodesRepo.updateStatus(episode.id, "pending");
							progressEmitter.emitStatus({
								episodeId: episode.id,
								status: "pending",
							});
							cancelledMidway = true;
						} else {
							ctx.episodesRepo.updateStatus(episode.id, "failed", msg);
							ctx.episodesRepo.incrementRetry(episode.id);
							progressEmitter.emitStatus({
								episodeId: episode.id,
								status: "failed",
								errorMessage: msg,
							});
							failed++;
							ctx.tasksRepo.incrementFailed(taskId);
						}
					}

					progressEmitter.emitTaskUpdate({
						taskId,
						totalFiles: pendingEpisodes.length,
						completedFiles: completed,
						failedFiles: failed,
					});
				}
			});

			await Promise.all(workers);
		}

		if (cancelledMidway || signal.aborted) {
			ctx.tasksRepo.cancel(taskId);
		} else if (failed === 0) {
			ctx.tasksRepo.complete(taskId);
		} else if (completed === 0) {
			ctx.tasksRepo.fail(taskId, "All files failed");
		} else {
			ctx.tasksRepo.complete(taskId);
		}
	} finally {
		isPipelineRunning = false;
		progressEmitter.emitPipelineStatus({ isRunning: false });
	}
}

async function processEpisode(
	ctx: TransferContext,
	episode: Episode,
	cachedMeta: FileMeta | undefined,
	signal: AbortSignal,
): Promise<void> {
	const tempPath = resolve(ctx.tempDir, episode.filename);

	ctx.episodesRepo.updateStatus(episode.id, "downloading");
	progressEmitter.emitStatus({ episodeId: episode.id, status: "downloading" });

	if (signal.aborted) throw new Error("Transfer cancelled");

	// Resolve dlink — refresh on-demand if expired or missing.
	const meta = await resolveDlink(ctx, episode, cachedMeta);
	if (!meta?.dlink) {
		throw new Error("File not found in Baidu Pan (may have been deleted)");
	}

	const startTime = Date.now();
	try {
		await ctx.baidu.downloadFile(
			meta.dlink,
			tempPath,
			(bytes, total) => {
				const elapsed = (Date.now() - startTime) / 1000;
				const speed = elapsed > 0 ? bytes / elapsed : 0;
				progressEmitter.emitProgress({
					episodeId: episode.id,
					phase: "download",
					percent: total > 0 ? Math.round((bytes / total) * 100) : 0,
					bytesTransferred: bytes,
					totalBytes: total,
					speed,
				});
			},
			signal,
		);
	} catch (err) {
		// Treat 403/410 as dlink expiration — refresh once and retry.
		if (!signal.aborted && isLikelyDlinkExpired(err)) {
			cleanupTemp(tempPath);
			const refreshed = await refreshDlink(ctx, episode);
			if (!refreshed?.dlink) {
				throw err;
			}
			await ctx.baidu.downloadFile(
				refreshed.dlink,
				tempPath,
				(bytes, total) => {
					const elapsed = (Date.now() - startTime) / 1000;
					const speed = elapsed > 0 ? bytes / elapsed : 0;
					progressEmitter.emitProgress({
						episodeId: episode.id,
						phase: "download",
						percent: total > 0 ? Math.round((bytes / total) * 100) : 0,
						bytesTransferred: bytes,
						totalBytes: total,
						speed,
					});
				},
				signal,
			);
		} else {
			throw err;
		}
	}

	ctx.episodesRepo.updateStatus(episode.id, "downloaded");
	progressEmitter.emitStatus({ episodeId: episode.id, status: "downloaded" });

	if (signal.aborted) {
		cleanupTemp(tempPath);
		throw new Error("Transfer cancelled");
	}

	// --- Compression step (video files only) ---
	let uploadPath = tempPath;
	const compressedPath = resolve(ctx.tempDir, `compressed_${episode.filename}`);
	let compressed = false;

	if (isVideoFile(episode.filename) && ctx.ffmpegPath && ctx.ffprobePath) {
		const settings = ctx.compressSettingsRepo.get();
		if (settings.enabled) {
			const check = await shouldCompress(tempPath, settings.skip_threshold_mb);
			if (check.should) {
				ctx.episodesRepo.updateStatus(episode.id, "compressing");
				progressEmitter.emitStatus({ episodeId: episode.id, status: "compressing" });

				try {
					const duration = await getVideoDuration(ctx.ffprobePath, tempPath);
					await compressVideo(
						ctx.ffmpegPath,
						tempPath,
						compressedPath,
						settings,
						duration,
						signal,
						(percent) => {
							progressEmitter.emitProgress({
								episodeId: episode.id,
								phase: "compress",
								percent,
								bytesTransferred: 0,
								totalBytes: 0,
								speed: 0,
							});
						},
					);
					uploadPath = compressedPath;
					compressed = true;
				} catch (compressErr) {
					// Compression failed — fall back to original file
					cleanupTemp(compressedPath);
					if (signal.aborted) {
						cleanupTemp(tempPath);
						throw new Error("Transfer cancelled");
					}
					// Log but continue with original file
					progressEmitter.emitStatus({
						episodeId: episode.id,
						status: "downloading",
						errorMessage: "Compression failed, uploading original",
					});
				}
			}
		}
	}

	if (signal.aborted) {
		cleanupTemp(tempPath);
		if (compressed) cleanupTemp(compressedPath);
		throw new Error("Transfer cancelled");
	}

	// --- Upload step ---
	ctx.episodesRepo.updateStatus(episode.id, "uploading");
	progressEmitter.emitStatus({ episodeId: episode.id, status: "uploading" });

	const contentType = getContentType(episode.filename);
	const ext = extname(episode.filename);
	const r2Key = `${ctx.r2Prefix}/${randomUUID()}${ext}`;

	try {
		const uploadStart = Date.now();
		const r2Url = await ctx.r2.uploadFile(
			uploadPath,
			r2Key,
			contentType,
			(loaded, total) => {
				const elapsed = (Date.now() - uploadStart) / 1000;
				const speed = elapsed > 0 ? loaded / elapsed : 0;
				progressEmitter.emitProgress({
					episodeId: episode.id,
					phase: "upload",
					percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
					bytesTransferred: loaded,
					totalBytes: total,
					speed,
				});
			},
			signal,
		);

		ctx.episodesRepo.updateR2Info(episode.id, r2Key, r2Url);
		progressEmitter.emitStatus({ episodeId: episode.id, status: "uploaded" });
	} finally {
		cleanupTemp(tempPath);
		if (compressed) cleanupTemp(compressedPath);
	}
}

async function resolveDlink(
	ctx: TransferContext,
	episode: Episode,
	cached: FileMeta | undefined,
): Promise<FileMeta | undefined> {
	if (cached?.dlink) return cached;
	return refreshDlink(ctx, episode);
}

async function refreshDlink(ctx: TransferContext, episode: Episode): Promise<FileMeta | undefined> {
	const metas = await ctx.baidu.getFileMetas([episode.baidu_fs_id]);
	return metas[0];
}

function isLikelyDlinkExpired(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const msg = err.message.toLowerCase();
	// Baidu returns 403 when sign is invalid/expired, 404/410 when link gone.
	return (
		msg.includes("403") ||
		msg.includes("404") ||
		msg.includes("410") ||
		msg.includes("forbidden") ||
		msg.includes("not found")
	);
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
