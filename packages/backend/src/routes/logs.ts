import { Router } from "express";
import type { Database } from "better-sqlite3";
import { createApiLogsRepo } from "../db/api-logs.js";

export function createLogsRouter(db: Database): Router {
	const router = Router();
	const repo = createApiLogsRepo(db);

	router.get("/", (req, res) => {
		try {
			const limit = parseInt(req.query.limit as string) || 100;
			const offset = parseInt(req.query.offset as string) || 0;
			const logs = repo.list(limit, offset);
			res.json({ success: true, data: logs });
		} catch (err) {
			console.error("Failed to fetch logs:", err);
			res.status(500).json({ success: false, error: "Failed to fetch logs" });
		}
	});

	router.post("/clear", (req, res) => {
		try {
			repo.clear();
			res.json({ success: true });
		} catch (err) {
			console.error("Failed to clear logs:", err);
			res.status(500).json({ success: false, error: "Failed to clear logs" });
		}
	});

	return router;
}
