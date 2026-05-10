import { Router } from "express";
import { progressEmitter } from "../utils/progress-emitter.js";

export function createSSERoutes(): Router {
	const router = Router();

	router.get("/events", (req, res) => {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("X-Accel-Buffering", "no");

		res.flushHeaders();

		const sendEvent = (type: string, data: unknown) => {
			res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
		};

		const onProgress = (event: unknown) => sendEvent("episode_progress", event);
		const onStatus = (event: unknown) => sendEvent("episode_status", event);
		const onTaskUpdate = (event: unknown) => sendEvent("task_update", event);
		const onPipelineStatus = (event: unknown) => sendEvent("pipeline_status", event);

		progressEmitter.onProgress(onProgress);
		progressEmitter.onStatus(onStatus);
		progressEmitter.onTaskUpdate(onTaskUpdate);
		progressEmitter.onPipelineStatus(onPipelineStatus);

		req.on("close", () => {
			progressEmitter.off("episode_progress", onProgress);
			progressEmitter.off("episode_status", onStatus);
			progressEmitter.off("task_update", onTaskUpdate);
			progressEmitter.off("pipeline_status", onPipelineStatus);
		});
	});

	return router;
}
