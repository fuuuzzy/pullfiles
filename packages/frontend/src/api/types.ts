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
