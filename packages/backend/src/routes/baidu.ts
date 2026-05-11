import { basename, extname } from "node:path";
import { VIDEO_EXTENSIONS } from "@ls-pull-video/shared";
import { Router } from "express";
import type { EpisodesRepo } from "../db/episodes.js";
import type { BaiduPanClient } from "../services/baidu-pan.js";
import { getContentType } from "../utils/content-type.js";
import { parseEpisodeNumber } from "../utils/episode-parser.js";

export function createBaiduRoutes(baidu: BaiduPanClient, episodesRepo: EpisodesRepo): Router {
	const router = Router();

	router.post("/sync", async (req, res, next) => {
		try {
			const { path } = req.body;
			if (!path || typeof path !== "string") {
				res.status(400).json({ success: false, error: "path is required" });
				return;
			}

			const files = await baidu.listAllFiles(path);

			const videoFiles = files.filter((f) => {
				const name = f.server_filename || f.filename || (f.path ? basename(f.path) : "");
				const ext = extname(name).toLowerCase();
				return VIDEO_EXTENSIONS.includes(ext);
			});

			let newFiles = 0;
			let skippedFiles = 0;

			for (const file of videoFiles) {
				const name =
					file.server_filename || file.filename || (file.path ? basename(file.path) : "");
				const inserted = episodesRepo.insert({
					baidu_fs_id: file.fs_id,
					baidu_path: file.path,
					filename: name,
					episode_number: parseEpisodeNumber(name),
					file_size: file.size,
					content_type: getContentType(name),
				});

				if (inserted) {
					newFiles++;
				} else {
					skippedFiles++;
				}
			}

			res.json({
				success: true,
				data: { newFiles, skippedFiles, totalFiles: videoFiles.length },
			});
		} catch (error) {
			next(error);
		}
	});

	router.get("/files", async (req, res, next) => {
		try {
			const path = req.query.path as string;
			if (!path) {
				res.status(400).json({ success: false, error: "path query param is required" });
				return;
			}

			const files = await baidu.listAllFiles(path);
			res.json({ success: true, data: files });
		} catch (error) {
			next(error);
		}
	});

	return router;
}
