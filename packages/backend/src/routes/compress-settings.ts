import { Router } from "express";
import type { CompressSettingsRepo } from "../db/compress-settings.js";

export function createCompressSettingsRoutes(repo: CompressSettingsRepo): Router {
	const router = Router();

	router.get("/", (_req, res) => {
		const settings = repo.get();
		res.json({ success: true, data: settings });
	});

	router.put("/", (req, res) => {
		const allowed = [
			"enabled",
			"skip_threshold_mb",
			"target_size_mb",
			"resolution",
			"crf",
			"preset",
			"audio_bitrate",
			"fps",
			"threads",
		] as const;

		const updates: Record<string, unknown> = {};
		for (const key of allowed) {
			if (req.body[key] !== undefined) {
				updates[key] = req.body[key];
			}
		}

		if (Object.keys(updates).length === 0) {
			res.status(400).json({ success: false, error: "No valid fields to update" });
			return;
		}

		// Validate ranges
		if (updates.skip_threshold_mb !== undefined) {
			const v = Number(updates.skip_threshold_mb);
			if (v < 1 || v > 500) {
				res.status(400).json({ success: false, error: "skip_threshold_mb must be 1-500" });
				return;
			}
		}
		if (updates.target_size_mb !== undefined) {
			const v = Number(updates.target_size_mb);
			if (v < 1 || v > 2000) {
				res.status(400).json({ success: false, error: "target_size_mb must be 1-2000" });
				return;
			}
		}
		if (updates.crf !== undefined) {
			const v = Number(updates.crf);
			if (v < 18 || v > 51) {
				res.status(400).json({ success: false, error: "crf must be 18-51" });
				return;
			}
		}
		if (updates.fps !== undefined) {
			const v = Number(updates.fps);
			if (v < 24 || v > 60) {
				res.status(400).json({ success: false, error: "fps must be 24-60" });
				return;
			}
		}
		if (updates.threads !== undefined) {
			const v = Number(updates.threads);
			if (v < 0 || v > 16) {
				res.status(400).json({ success: false, error: "threads must be 0-16" });
				return;
			}
		}

		repo.update(updates);
		const settings = repo.get();
		res.json({ success: true, data: settings });
	});

	return router;
}
