import type { Database } from "better-sqlite3";
import { Router } from "express";
import { createApiLogsRepo } from "../db/api-logs.js";

export function createLogsRouter(db: Database): Router {
	const router = Router();
	const repo = createApiLogsRepo(db);

	router.get("/", (req, res) => {
		try {
			const limit = parseInt(req.query.limit as string, 10) || 100;
			const offset = parseInt(req.query.offset as string, 10) || 0;
			const logs = repo.list(limit, offset);
			res.json({ success: true, data: logs });
		} catch (_err) {
			res.status(500).json({ success: false, error: "Failed to fetch logs" });
		}
	});

	router.post("/clear", (_req, res) => {
		try {
			repo.clear();
			res.json({ success: true });
		} catch (_err) {
			res.status(500).json({ success: false, error: "Failed to clear logs" });
		}
	});

	return router;
}
