import { basename, extname } from "node:path";
import { VIDEO_EXTENSIONS } from "@ls-pull-video/shared";
import { Router } from "express";
import type { EpisodesRepo } from "../db/episodes.js";
import type { BaiduPanClient } from "../services/baidu-pan.js";
import { getContentType } from "../utils/content-type.js";

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

function parseChineseNumber(str: string): number {
	const numMap: Record<string, number> = {
		零: 0,
		一: 1,
		二: 2,
		三: 3,
		四: 4,
		五: 5,
		六: 6,
		七: 7,
		八: 8,
		九: 9,
		十: 10,
		百: 100,
		千: 1000,
		两: 2,
	};

	let result = 0;
	let temp = 0;
	let sec = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charAt(i);
		const num = numMap[char];

		if (num === undefined) continue;

		if (num === 10 || num === 100 || num === 1000) {
			if (temp === 0) temp = 1;
			if (num === 10) {
				sec += temp * num;
				temp = 0;
			} else {
				sec += temp * num;
				temp = 0;
			}
		} else {
			temp = num;
		}
	}
	result += sec + temp;
	return result;
}

function parseEpisodeNumber(filename: string): number | null {
	// Chinese numbers
	const zhMatch = filename.match(/第([零一二三四五六七八九十百千两]+)集/);
	if (zhMatch?.[1]) {
		return parseChineseNumber(zhMatch[1]);
	}

	const patterns = [
		/第(\d+)集/,
		/[Ee][Pp]?\.?(\d+)/i, // E02, EP02, ep.02
		/[Ss]\d+[Ee](\d+)/i, // S01E02
		/-\s*(\d+)(?:\.\w+)?$/, // -07.mp4
		/^\[?(\d{2,3})\]?/, // [02], 02
		/(?:\s|^)(\d+)\.\w+$/, // 1.mp4
	];

	for (const pattern of patterns) {
		const match = filename.match(pattern);
		if (match?.[1]) {
			return parseInt(match[1], 10);
		}
	}

	return null;
}
