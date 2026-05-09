import type { ProgressEvent } from "@ls-pull-video/shared";
import type { EpisodeStatusEvent, TaskUpdateEvent } from "./types.js";

export type SSECallbacks = {
	onProgress?: (event: ProgressEvent) => void;
	onStatus?: (event: EpisodeStatusEvent) => void;
	onTaskUpdate?: (event: TaskUpdateEvent) => void;
};

export function createSSEConnection(callbacks: SSECallbacks): EventSource {
	const es = new EventSource("/api/events");

	if (callbacks.onProgress) {
		es.addEventListener("episode_progress", (e) => {
			callbacks.onProgress!(JSON.parse(e.data));
		});
	}

	if (callbacks.onStatus) {
		es.addEventListener("episode_status", (e) => {
			callbacks.onStatus!(JSON.parse(e.data));
		});
	}

	if (callbacks.onTaskUpdate) {
		es.addEventListener("task_update", (e) => {
			callbacks.onTaskUpdate!(JSON.parse(e.data));
		});
	}

	return es;
}
