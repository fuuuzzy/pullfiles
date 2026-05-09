export type EpisodeStatus =
	| "pending"
	| "downloading"
	| "downloaded"
	| "uploading"
	| "uploaded"
	| "failed"
	| "unparsed";

export interface Episode {
	id: number;
	baidu_fs_id: number;
	baidu_path: string;
	filename: string;
	episode_number: number | null;
	file_size: number | null;
	content_type: string | null;
	r2_key: string | null;
	r2_url: string | null;
	r2_uploaded_at: string | null;
	status: EpisodeStatus;
	error_message: string | null;
	retry_count: number;
	created_at: string;
	updated_at: string;
}

export interface TransferTask {
	id: number;
	baidu_path: string;
	status: "running" | "completed" | "cancelled" | "failed";
	total_files: number;
	completed_files: number;
	failed_files: number;
	started_at: string;
	finished_at: string | null;
	error_message: string | null;
}

export interface ApiLog {
	id: number;
	method: string;
	url: string;
	request_params: string | null;
	response_status: number;
	response_body: string | null;
	duration_ms: number;
	created_at: string;
}

export interface ProgressEvent {
	episodeId: number;
	phase: "download" | "upload";
	percent: number;
	bytesTransferred: number;
	totalBytes: number;
	speed: number;
}

export interface StatusSummary {
	total: number;
	pending: number;
	unparsed: number;
	downloading: number;
	downloaded: number;
	uploading: number;
	uploaded: number;
	failed: number;
	totalSizeBytes: number;
	transferredSizeBytes: number;
}

export interface SyncResult {
	newFiles: number;
	skippedFiles: number;
	totalFiles: number;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}
