import { syncTasksDb } from "../db/sync-tasks.js";
import { getDb } from "../db/index.js";
import { loadConfig } from "../config.js";
import type { SyncTask, Episode } from "@ls-pull-video/shared";
import { fetch } from "undici";

const config = loadConfig();
const db = getDb(config.DB_PATH);

export class BatchSyncWorker {
	private isRunning = false;
	private currentConcurrency = 0;
	private maxConcurrency = 5;

	public async start() {
		if (this.isRunning) return;
		this.isRunning = true;
		this.processQueue();
	}

	public stop() {
		this.isRunning = false;
	}

	private async processQueue() {
		if (!this.isRunning) return;
		
		// Find available slots
		while (this.currentConcurrency < this.maxConcurrency) {
			// Get next pending task
			const tasks = syncTasksDb.findAll({ status: "pending" });
			const nextTask = tasks.find(t => t.status === "pending"); // Just picking first
			
			if (!nextTask) {
				// No more pending tasks
				break;
			}

			// Mark as syncing so it's not picked up again
			syncTasksDb.updateStatus(nextTask.task_id, "syncing");
			this.currentConcurrency++;

			// Process async
			this.processTask(nextTask).finally(() => {
				this.currentConcurrency--;
				// Trigger next pick
				if (this.isRunning) {
					setTimeout(() => this.processQueue(), 100);
				}
			});
		}
	}

	private async processTask(task: SyncTask) {
		try {
			// 1. Data Matcher: find episodes by drama_title (matched with parent_folder)
			const episodes = db.prepare("SELECT * FROM episodes WHERE parent_folder = ? AND status = 'uploaded'").all(task.drama_title) as Episode[];
			
			if (!episodes || episodes.length === 0) {
				throw new Error("缺失源文件: 未在数据库中找到匹配的文件 (需确保文件已上传至R2)");
			}

			// Separate video parts and posters
			const videos = episodes.filter(ep => ep.content_type?.startsWith("video/") || ep.filename.match(/\.(mp4|mkv|mov)$/i));
			const images = episodes.filter(ep => ep.content_type?.startsWith("image/") || ep.filename.match(/\.(jpg|jpeg|png)$/i));

			if (videos.length === 0) {
				throw new Error("缺失视频源文件");
			}

			// Parse metadata
			const metadata = JSON.parse(task.metadata);

			// Map videos
			metadata.parts = videos.map(v => {
				// Try to extract partIdx from filename if episode_number is missing
				let partIdx = v.episode_number;
				if (partIdx == null) {
					const match = v.filename.match(/(\d+)/);
					partIdx = match ? parseInt(match[1] || "1", 10) : 1;
				}

				return {
					taskId: String(v.baidu_fs_id),
					originalName: v.filename,
					transtoreStatus: "transtored",
					uploadUrl: v.r2_url || "",
					addWay: "upload",
					partIdx: Number(partIdx)
				};
			});

			// Map poster
			if (images.length > 0) {
				const poster = images[0]; // Just take first image as poster
				if (poster) {
					metadata.posters = [{
						taskId: String(poster.baidu_fs_id),
						originalName: poster.filename,
						uploadUrl: poster.r2_url || "",
						type: "general",
						title: task.drama_title,
						defaulted: true,
						horizontal: false,
						remark: ""
					}];
				}
			} else {
				// If no image found, fallback (API might require poster, but let's try our best)
				// throw new Error("缺失海报源文件");
			}

			// 2. Call API
			const saveApiUrl = "https://studio.luckyshort.net/episodes";
			const response = await fetch(saveApiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(metadata)
			});

			if (!response.ok) {
				const responseText = await response.text();
				throw new Error(`API Sync Failed (${response.status}): ${responseText}`);
			}

			// 3. Mark success
			syncTasksDb.updateStatus(task.task_id, "success");

		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			syncTasksDb.updateStatus(task.task_id, "failed", errorMsg);
		}
	}
}

export const batchSyncWorker = new BatchSyncWorker();
