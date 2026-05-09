import { VIDEO_CONTENT_TYPES } from "@ls-pull-video/shared";
import { extname } from "path";

export function getContentType(filename: string): string {
	const ext = extname(filename).toLowerCase();
	return VIDEO_CONTENT_TYPES[ext] ?? "application/octet-stream";
}
