import type { ProjectEpisodesRepo, ProjectsRepo } from "../db/projects.js";
import type { ProjectEpisode, Project } from "@ls-pull-video/shared";
import { Router } from "express";
import multer from "multer";
import { parseExcel } from "../services/excel-parser.js";
import type { ProjectSyncContext } from "../services/project-sync.js";
import { getSyncStatus } from "../services/project-sync.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

export function createProjectsRoutes(
	projectsRepo: ProjectsRepo,
	projectEpisodesRepo: ProjectEpisodesRepo,
	syncCtx?: ProjectSyncContext,
): Router {
	const router = Router();

	router.post("/import", upload.single("file"), (req, res, next) => {
		try {
			if (!req.file) {
				res.status(400).json({ success: false, error: "Excel file is required" });
				return;
			}

			const rows = parseExcel(req.file.buffer);
			if (rows.length === 0) {
				res.status(400).json({ success: false, error: "No valid rows found in Excel" });
				return;
			}

			const projectName = `Project-${Date.now()}`;
			const projectId = projectsRepo.create(projectName);

			for (const row of rows) {
				projectEpisodesRepo.insert({
					project_id: projectId,
					title: row.title,
					episode_no: row.episode_no,
					total_parts: row.total_parts,
					language: row.language,
					description: row.description,
					baidu_link: row.baidu_link,
				});
			}

			projectsRepo.setTotalEpisodes(projectId, rows.length);

			res.json({
				success: true,
				data: {
					projectId,
					episodeCount: rows.length,
				},
			});
		} catch (error) {
			next(error);
		}
	});

	router.get("/", (_req, res) => {
		const projects = projectsRepo.list();
		res.json({ success: true, data: projects });
	});

	router.get("/:id", (req, res) => {
		const project = projectsRepo.getById(Number(req.params.id));
		if (!project) {
			res.status(404).json({ success: false, error: "Project not found" });
			return;
		}
		res.json({ success: true, data: project });
	});

	router.delete("/:id", (req, res) => {
		const projectId = Number(req.params.id);
		const project = projectsRepo.getById(projectId);
		if (!project) {
			res.status(404).json({ success: false, error: "Project not found" });
			return;
		}

		projectEpisodesRepo.deleteByProjectId(projectId);
		projectsRepo.delete(projectId);

		res.json({ success: true, data: { message: "Project deleted" } });
	});

	router.get("/:id/episodes", (req, res) => {
		const projectId = Number(req.params.id);
		const project = projectsRepo.getById(projectId);
		if (!project) {
			res.status(404).json({ success: false, error: "Project not found" });
			return;
		}

		const episodes = projectEpisodesRepo.listByProjectId(projectId);
		res.json({ success: true, data: episodes });
	});

	router.get("/:id/status", (req, res) => {
		const projectId = Number(req.params.id);
		const project = projectsRepo.getById(projectId);
		if (!project) {
			res.status(404).json({ success: false, error: "Project not found" });
			return;
		}

		const episodes = projectEpisodesRepo.listByProjectId(projectId);
		const pending = episodes.filter((e) => e.status === "pending").length;
		const downloading = episodes.filter((e) => e.status === "downloading").length;
		const uploaded = episodes.filter((e) => e.status === "uploaded").length;
		const saved = episodes.filter((e) => e.status === "saved").length;
		const failed = episodes.filter((e) => e.status === "failed").length;

		res.json({
			success: true,
			data: {
				projectId,
				status: project.status,
				total: episodes.length,
				pending,
				downloading,
				uploaded,
				saved,
				failed,
			},
		});
	});

	router.get("/sync/status", (_req, res) => {
		res.json({ success: true, data: getSyncStatus() });
	});

	router.post("/:id/start", async (req, res, next) => {
		try {
			const projectId = Number(req.params.id);
			const project = projectsRepo.getById(projectId);
			if (!project) {
				res.status(404).json({ success: false, error: "Project not found" });
				return;
			}

			if (!syncCtx) {
				res.status(500).json({ success: false, error: "Sync service not configured" });
				return;
			}

			if (getSyncStatus().isRunning) {
				res.status(400).json({ success: false, error: "Sync is already running" });
				return;
			}

			const { runProjectSync } = await import("../services/project-sync.js");
			runProjectSync(syncCtx).catch((_err) => {});

			res.json({ success: true, data: { message: "Sync started" } });
		} catch (error) {
			next(error);
		}
	});

	return router;
}