import { extname } from "node:path";
import { VIDEO_CONTENT_TYPES } from "@ls-pull-video/shared";

export function getContentType(filename: string): string {
	const ext = extname(filename).toLowerCase();
	return VIDEO_CONTENT_TYPES[ext] ?? "application/octet-stream";
}
