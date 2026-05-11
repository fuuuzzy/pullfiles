import type { Database } from "better-sqlite3";
import { createApiLogsRepo } from "../db/api-logs.js";
import { withRetry } from "../utils/retry.js";

const SHARE_API_BASE = "https://pan.baidu.com/rest/2.0/xpan/share";

export interface ShareFile {
	fs_id: number;
	path: string;
	server_filename: string;
	size: number;
	isdir: number;
	category: number;
	md5?: string;
}

export interface ShareFileListResult {
	list: ShareFile[];
	request_id: number;
	uk: number;
	shareid: number;
}

function extractShareIdAndUk(url: string): { shareid: string; uk: string } | null {
	try {
		const urlObj = new URL(url);
		const path = urlObj.pathname;

		const shareIdMatch = path.match(/\/s\/([a-zA-Z0-9_-]+)/);
		if (!shareIdMatch?.[1]) {
			return null;
		}

		const shareid = shareIdMatch[1];
		const ukMatch = url.match(/uk[=_](\d+)/);
		const uk = ukMatch?.[1] || "";

		return { shareid, uk };
	} catch {
		return null;
	}
}

export function createBaiduShareClient(accessToken: string, db?: Database) {
	const apiLogsRepo = db ? createApiLogsRepo(db) : null;

	async function fetchJson<T>(url: string): Promise<T> {
		const start = Date.now();
		let status = 0;
		let responseBody = "";
		let errorMsg = "";

		try {
			const res = await fetch(url, {
				headers: { "User-Agent": "pan.baidu.com" },
				signal: AbortSignal.timeout(30000),
			});

			status = res.status;

			if (!res.ok) {
				errorMsg = `Baidu Share API error: ${res.status} ${res.statusText}`;
				throw new Error(errorMsg);
			}

			const text = await res.text();
			responseBody = text;

			const data = JSON.parse(text) as T & { errno?: number; errmsg?: string };
			if ("errno" in data && data.errno !== 0) {
				errorMsg = `Baidu Share API errno ${data.errno}: ${data.errmsg ?? "unknown error"}`;
				throw new Error(errorMsg);
			}
			return data as T;
		} catch (err) {
			if (!errorMsg) {
				errorMsg = err instanceof Error ? err.message : String(err);
			}
			throw err;
		} finally {
			const duration = Date.now() - start;
			const parsedUrl = new URL(url);
			const params = Object.fromEntries(parsedUrl.searchParams.entries());
			delete params.access_token;

			if (apiLogsRepo) {
				try {
					apiLogsRepo.insert({
						method: "GET",
						url: parsedUrl.origin + parsedUrl.pathname,
						request_params: JSON.stringify(params),
						response_status: status || 500,
						response_body: responseBody
							? responseBody.length > 2000
								? `${responseBody.substring(0, 2000)}...`
								: responseBody
							: errorMsg,
						duration_ms: duration,
					});
				} catch (_logErr) {}
			}
		}
	}

	return {
		extractShareIdAndUk,

		async listShareFiles(shareid: string, uk: string): Promise<ShareFile[]> {
			const allFiles: ShareFile[] = [];
			let start = 0;
			const limit = 100;

			while (true) {
				const url = new URL(SHARE_API_BASE);
				url.searchParams.set("access_token", accessToken);
				url.searchParams.set("shareid", shareid);
				url.searchParams.set("uk", uk);
				url.searchParams.set("method", "list");
				url.searchParams.set("page", String(Math.floor(start / limit) + 1));
				url.searchParams.set("num", String(limit));
				url.searchParams.set("recursion", "1");

				const data = await withRetry(() => fetchJson<ShareFileListResult>(url.toString()));

				if (data.list) {
					allFiles.push(...data.list.filter((f) => f.isdir === 0));
				}

				if (!data.list || data.list.length < limit) {
					break;
				}
				start += limit;
			}

			return allFiles;
		},

		async listFilesFromLink(link: string): Promise<ShareFile[]> {
			const extracted = extractShareIdAndUk(link);
			if (!extracted) {
				throw new Error("Invalid Baidu share link format");
			}

			const { shareid, uk } = extracted;
			if (!uk) {
				throw new Error("UK not found in share link. Please provide a link with uk parameter");
			}

			return this.listShareFiles(shareid, uk);
		},
	};
}

export type BaiduShareClient = ReturnType<typeof createBaiduShareClient>;
