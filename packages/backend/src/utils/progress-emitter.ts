import { EventEmitter } from "events";
import type { ProgressEvent } from "@ls-pull-video/shared";

export interface EpisodeStatusEvent {
	episodeId: number;
	status: string;
	errorMessage?: string;
}

export interface TaskUpdateEvent {
	taskId: number;
	totalFiles: number;
	completedFiles: number;
	failedFiles: number;
}

class ProgressEmitter extends EventEmitter {
	emitProgress(event: ProgressEvent): void {
		this.emit("progress", event);
	}

	emitStatus(event: EpisodeStatusEvent): void {
		this.emit("status", event);
	}

	emitTaskUpdate(event: TaskUpdateEvent): void {
		this.emit("task_update", event);
	}

	onProgress(listener: (event: ProgressEvent) => void): void {
		this.on("progress", listener);
	}

	onStatus(listener: (event: EpisodeStatusEvent) => void): void {
		this.on("status", listener);
	}

	onTaskUpdate(listener: (event: TaskUpdateEvent) => void): void {
		this.on("task_update", listener);
	}
}

export const progressEmitter = new ProgressEmitter();
