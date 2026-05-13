import { Router } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { syncTasksDb } from "../db/sync-tasks.js";
import { getDb } from "../db/index.js";
import { loadConfig } from "../config.js";
import type { SyncTask, SyncTaskStatus } from "@ls-pull-video/shared";

const config = loadConfig();

import { batchSyncWorker } from "../services/batch-sync.js";

// Configure multer for memory storage since Excel files are usually small enough
const upload = multer({ storage: multer.memoryStorage() });

export function createSyncRoutes(): Router {
	const router = Router();

	router.post("/upload-excel", upload.single("file"), (req, res) => {
		try {
			if (!req.file) {
				res.status(400).json({ success: false, error: "No file uploaded" });
				return;
			}

			// Read workbook from buffer
			const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
			const firstSheetName = workbook.SheetNames[0];
			if (!firstSheetName) {
				res.status(400).json({ success: false, error: "Excel file has no sheets" });
				return;
			}

			const worksheet = workbook.Sheets[firstSheetName];
			if (!worksheet) {
				res.status(400).json({ success: false, error: "Sheet is empty or invalid" });
				return;
			}
			// Convert to json, array of arrays to map rows
			const rows = xlsx.utils.sheet_to_json<any>(worksheet);

			if (!rows || rows.length === 0) {
				res.status(400).json({ success: false, error: "Excel file is empty" });
				return;
			}

			const tasksToInsert: Array<Omit<SyncTask, "task_id" | "status" | "error_message" | "created_at" | "updated_at"> & { status?: SyncTaskStatus }> = [];

			for (const row of rows) {
				// We expect "剧标题" or similar from the plan
				// Usually headers are extracted by xlsx, let's look for known fields or fallback
				const title = row["剧标题"] || row["标题"] || row["title"];
				if (!title) {
					continue; // Skip rows without title
				}

				const metadata = {
					episodeNo: row["剧编号"] || row["episodeNo"] || "",
					title: title,
					language: row["语言"] || row["language"] || "zh",
					alias: row["别名"] || row["alias"] || title,
					episodeDesc: {
						intro: row["简介"] || row["intro"] || "",
						description: row["描述"] || row["description"] || "",
						subtitle: row["字幕"] || row["subtitle"] || "",
						tags: [],
						categories: [],
					},
					episodeCopyright: {
						releasedBy: "luckyshort",
						startedAt: "2026-01-05",
						endAt: "2099-01-01",
					},
					// To be populated during match
					parts: [],
					posters: [],
				};

				tasksToInsert.push({
					drama_title: String(title).trim(),
					metadata: JSON.stringify(metadata),
					status: "pending",
				});
			}

			if (tasksToInsert.length === 0) {
				res.status(400).json({ success: false, error: "No valid rows found (missing title)" });
				return;
			}

			// Save to DB
			const ids = syncTasksDb.createMany(tasksToInsert);

			res.json({
				success: true,
				data: {
					insertedCount: ids.length,
				},
			});
		} catch (error) {
			console.error("Excel upload error:", error);
			const errorMsg = error instanceof Error ? error.message : String(error);
			res.status(500).json({ success: false, error: errorMsg });
		}
	});

	router.post("/start", (req, res) => {
		batchSyncWorker.start();
		res.json({ success: true, message: "Sync started" });
	});

	router.post("/stop", (req, res) => {
		batchSyncWorker.stop();
		res.json({ success: true, message: "Sync stopped" });
	});

	router.get("/tasks", (req, res) => {
		try {
			const tasks = syncTasksDb.findAll();
			res.json({ success: true, data: tasks });
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			res.status(500).json({ success: false, error: errorMsg });
		}
	});

	router.post("/retry", (req, res) => {
		try {
			const { taskIds } = req.body as { taskIds: number[] };
			if (!Array.isArray(taskIds) || taskIds.length === 0) {
				res.status(400).json({ success: false, error: "taskIds must be a non-empty array" });
				return;
			}

			let retriedCount = 0;
			for (const id of taskIds) {
				const task = syncTasksDb.findById(id);
				if (task && task.status === "failed") {
					syncTasksDb.updateStatus(id, "pending");
					retriedCount++;
				}
			}

			// Automatically start worker if not running
			batchSyncWorker.start();

			res.json({ success: true, data: { retriedCount } });
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			res.status(500).json({ success: false, error: errorMsg });
		}
	});

	router.get("/progress", (req, res) => {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");

		// Send initial progress immediately
		const sendProgress = () => {
			const tasks = syncTasksDb.findAll();
			const total = tasks.length;
			const success = tasks.filter(t => t.status === "success").length;
			const failed = tasks.filter(t => t.status === "failed").length;
			const syncing = tasks.filter(t => t.status === "syncing").length;
			const pending = tasks.filter(t => t.status === "pending").length;

			const percent = total === 0 ? 0 : Math.round((success + failed) / total * 100);

			res.write(`data: ${JSON.stringify({ total, success, failed, syncing, pending, percent })}\n\n`);
		};

		sendProgress();

		// Poll every 1 second
		const intervalId = setInterval(sendProgress, 1000);

		req.on("close", () => {
			clearInterval(intervalId);
		});
	});

	return router;
}
