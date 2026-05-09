export const EPISODE_STATUSES = [
	"pending",
	"downloading",
	"downloaded",
	"uploading",
	"uploaded",
	"failed",
] as const;

export const TASK_STATUSES = ["running", "completed", "cancelled", "failed"] as const;

export const VIDEO_CONTENT_TYPES: Record<string, string> = {
	".mp4": "video/mp4",
	".mkv": "video/x-matroska",
	".avi": "video/x-msvideo",
	".mov": "video/quicktime",
	".wmv": "video/x-ms-wmv",
	".flv": "video/x-flv",
	".webm": "video/webm",
	".ts": "video/mp2t",
	".m4v": "video/mp4",
};

export const VIDEO_EXTENSIONS = Object.keys(VIDEO_CONTENT_TYPES);

export const DEFAULT_CONCURRENCY = 1;
export const MAX_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 1000;
export const R2_PART_SIZE = 8 * 1024 * 1024; // 8MB
export const R2_QUEUE_SIZE = 3;
