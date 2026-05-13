import { extname } from "node:path";
import { IMAGE_CONTENT_TYPES, VIDEO_CONTENT_TYPES } from "@ls-pull-video/shared";

const ALL_CONTENT_TYPES: Record<string, string> = {
	...VIDEO_CONTENT_TYPES,
	...IMAGE_CONTENT_TYPES,
};

export function getContentType(filename: string): string {
	const ext = extname(filename).toLowerCase();
	return ALL_CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export function isVideoFile(filename: string): boolean {
	const ext = extname(filename).toLowerCase();
	return ext in VIDEO_CONTENT_TYPES;
}
