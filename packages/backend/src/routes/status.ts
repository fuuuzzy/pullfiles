import { Router } from "express";
import type { EpisodesRepo } from "../db/episodes.js";

export function createStatusRoutes(episodesRepo: EpisodesRepo): Router {
	const router = Router();

	router.get("/summary", (_req, res) => {
		const counts = episodesRepo.count();
		const sizes = episodesRepo.totalSize();

		res.json({
			success: true,
			data: {
				...counts,
				totalSizeBytes: sizes.total,
				transferredSizeBytes: sizes.transferred,
			},
		});
	});

	return router;
}
