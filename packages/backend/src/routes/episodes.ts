import type { EpisodeStatus } from "@ls-pull-video/shared";
import { Router } from "express";
import type { EpisodesRepo } from "../db/episodes.js";

export function createEpisodesRoutes(episodesRepo: EpisodesRepo): Router {
	const router = Router();

	router.get("/", (req, res) => {
		const statusParam = req.query.status as string | undefined;
		const page = Number(req.query.page ?? 1);
		const limit = Number(req.query.limit ?? 50);

		// Support multiple statuses: ?status=downloading&status=uploading
		const statuses = statusParam
			? (Array.isArray(statusParam) ? statusParam : [statusParam]).filter((s): s is EpisodeStatus =>
					[
						"pending",
						"downloading",
						"downloaded",
						"compressing",
						"uploading",
						"uploaded",
						"failed",
						"unparsed",
					].includes(s),
				)
			: undefined;

		const opts: { status?: EpisodeStatus; page: number; limit: number } = { page, limit };
		if (statuses && statuses.length === 1) {
			opts.status = statuses[0];
		}

		const episodes = statuses
			? episodesRepo.listByStatuses(statuses, limit)
			: episodesRepo.list({ page, limit });
		const counts = episodesRepo.count();

		res.json({ success: true, data: { episodes, counts } });
	});

	router.get("/grouped", (req, res) => {
		const statusParam = req.query.status as string | undefined;
		const validStatuses: EpisodeStatus[] = [
			"pending",
			"downloading",
			"downloaded",
			"compressing",
			"uploading",
			"uploaded",
			"failed",
			"unparsed",
		];
		const status =
			statusParam && validStatuses.includes(statusParam as EpisodeStatus)
				? (statusParam as EpisodeStatus)
				: undefined;

		const grouped = episodesRepo.listGroupedByFolder(status ? { status } : undefined);
		const counts = episodesRepo.count();

		const folders = Array.from(grouped.entries()).map(([folder, episodes]) => ({
			folder,
			episodes,
			count: episodes.length,
		}));

		res.json({ success: true, data: { folders, counts } });
	});

	router.get("/:id", (req, res) => {
		const episode = episodesRepo.getById(Number(req.params.id));
		if (!episode) {
			res.status(404).json({ success: false, error: "Episode not found" });
			return;
		}
		res.json({ success: true, data: episode });
	});

	router.post("/retry/all", (_req, res) => {
		const count = episodesRepo.retryAllFailed();
		res.json({ success: true, data: { message: `Added ${count} failed episodes back to queue` } });
	});

	router.post("/:id/retry", (req, res) => {
		const success = episodesRepo.retryFailed(Number(req.params.id));
		if (!success) {
			res
				.status(404)
				.json({ success: false, error: "Failed episode not found or already retrying" });
			return;
		}
		res.json({ success: true, data: { message: "Episode added back to queue" } });
	});

	return router;
}
