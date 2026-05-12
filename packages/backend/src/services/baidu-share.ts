import type { Database } from "better-sqlite3";
import { createApiLogsRepo } from "../db/api-logs.js";
import { withRetry } from "../utils/retry.js";

const SHARE_API_BASE = "https://pan.baidu.com/rest/2.0/xpan/share";
const SHARE_INFO_BASE = "https://pan.baidu.com/apaas/1.0/share/info";

function enrichFetchError(err: unknown): Error {
	if (!(err instanceof Error)) return new Error(String(err));
	const cause = (err as { cause?: { message?: string; code?: string } }).cause;
	if (!cause) return err;
	const causeMsg = cause.message?.trim();
	const causeCode = cause.code;
	const detail = causeMsg && causeMsg.length > 0 ? causeMsg : causeCode;
	if (!detail) return err;
	const suffix = causeCode && detail !== causeCode ? ` (${causeCode})` : "";
	const enriched = new Error(`${err.message}: ${detail}${suffix}`);
	enriched.cause = err;
	if (err.stack) enriched.stack = err.stack;
	return enriched;
}

export interface ShareFile {
	fs_id: number;
	path: string;
	server_filename: string;
	size: number;
	isdir: number;
	category: number;
	md5?: string;
}

interface ShareLinkInfo {
	short_url: string;
	pwd: string;
}

function extractShareLinkInfo(text: string): ShareLinkInfo | null {
	const urlMatch = text.match(/https?:\/\/pan\.baidu\.com\/s\/[a-zA-Z0-9_-]+[^\s]*/);
	if (!urlMatch) {
		return null;
	}

	try {
		const urlObj = new URL(urlMatch[0]);
		const pathMatch = urlObj.pathname.match(/\/s\/([a-zA-Z0-9_-]+)/);
		if (!pathMatch?.[1]) {
			return null;
		}

		const short_url = pathMatch[1];
		const pwd = urlObj.searchParams.get("pwd") || "";

		return { short_url, pwd };
	} catch {
		return null;
	}
}

export function createBaiduShareClient(accessToken: string, appId: string, db?: Database) {
	const apiLogsRepo = db ? createApiLogsRepo(db) : null;

	async function fetchPostJson<T>(
		url: string,
		body: URLSearchParams | FormData,
		headers: Record<string, string> = {},
	): Promise<T> {
		const start = Date.now();
		let status = 0;
		let responseBody = "";
		let errorMsg = "";

		try {
			const res = await fetch(url, {
				method: "POST",
				headers: {
					Referer: "pan.baidu.com",
					...headers,
				},
				body,
				signal: AbortSignal.timeout(30000),
			}).catch((err) => {
				throw enrichFetchError(err);
			});

			status = res.status;

			if (!res.ok) {
				errorMsg = `Baidu Share API error: ${res.status} ${res.statusText}`;
				throw new Error(errorMsg);
			}

			const text = await res.text();
			responseBody = text;

			const data = JSON.parse(text) as T & { errno?: number; errmsg?: string; show_msg?: string };
			if ("errno" in data && data.errno !== 0) {
				const msg = data.show_msg ?? data.errmsg ?? "unknown error";
				errorMsg = `Baidu Share API errno ${data.errno}: ${msg}`;
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
			const logUrl = new URL(url);
			const logParams: Record<string, string> = {};
			for (const [k, v] of logUrl.searchParams.entries()) {
				if (k !== "access_token") logParams[k] = v;
			}

			if (apiLogsRepo) {
				try {
					apiLogsRepo.insert({
						method: "POST",
						url: logUrl.origin + logUrl.pathname,
						request_params: JSON.stringify(logParams),
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

	async function fetchGetJson<T>(url: string): Promise<T> {
		const start = Date.now();
		let status = 0;
		let responseBody = "";
		let errorMsg = "";

		try {
			const res = await fetch(url, {
				headers: { "User-Agent": "pan.baidu.com" },
				signal: AbortSignal.timeout(30000),
			}).catch((err) => {
				throw enrichFetchError(err);
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
			const params: Record<string, string> = {};
			for (const [k, v] of parsedUrl.searchParams.entries()) {
				if (k !== "access_token") params[k] = v;
			}

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
		extractShareLinkInfo,

		async getShareInfo(
			short_url: string,
		): Promise<{ share_id: number; share_uk: number }> {
			const url = new URL(SHARE_INFO_BASE);
			url.searchParams.set("appid", appId);
			url.searchParams.set("access_token", accessToken);
			url.searchParams.set("product", "netdisk");
			url.searchParams.set("short_url", short_url);

			const data = await withRetry(() =>
				fetchPostJson<{
					errno: number;
					data: {
						link_info: {
							share_id: number;
							share_uk: number;
							short_url: string;
							pwd: string;
							status: number;
						};
					};
				}>(url.toString(), new URLSearchParams()),
			);

			return {
				share_id: data.data.link_info.share_id,
				share_uk: data.data.link_info.share_uk,
			};
		},

		async verifyShare(
			shareid: number,
			uk: number,
			pwd: string,
		): Promise<{ randsk: string }> {
			const url = new URL(SHARE_API_BASE);
			url.searchParams.set("access_token", accessToken);
			url.searchParams.set("method", "verify");
			url.searchParams.set("shareid", String(shareid));
			url.searchParams.set("uk", String(uk));

			const body = new URLSearchParams();
			body.set("pwd", pwd);
			body.set("third_type", "9999");
			body.set("redirect", "0");

			const data = await withRetry(() =>
				fetchPostJson<{ errno: number; randsk: string }>(
					url.toString(),
					body,
					{ "Content-Type": "application/x-www-form-urlencoded" },
				),
			);

			return { randsk: data.randsk };
		},

		async listShareFiles(shareid: number, uk: number, sekey: string): Promise<ShareFile[]> {
			const allFiles: ShareFile[] = [];
			let page = 1;
			const num = 100;

			while (true) {
				const url = new URL(SHARE_API_BASE);
				url.searchParams.set("access_token", accessToken);
				url.searchParams.set("method", "list");
				url.searchParams.set("shareid", String(shareid));
				url.searchParams.set("uk", String(uk));
				url.searchParams.set("sekey", sekey);
				url.searchParams.set("page", String(page));
				url.searchParams.set("num", String(num));
				url.searchParams.set("root", "1");
				url.searchParams.set("recursion", "1");

				const data = await withRetry(() =>
					fetchGetJson<{ list?: ShareFile[] }>(url.toString()),
				);

				if (data.list) {
					allFiles.push(...data.list.filter((f) => f.isdir === 0));
				}

				if (!data.list || data.list.length < num) {
					break;
				}
				page++;
			}

			return allFiles;
		},

		async listFilesFromLink(text: string): Promise<ShareFile[]> {
			const info = extractShareLinkInfo(text);
			if (!info) {
				throw new Error("Invalid Baidu share link format");
			}

			if (!info.pwd) {
				throw new Error("Share link requires a password (提取码)");
			}

			const { share_id, share_uk } = await withRetry(() =>
				this.getShareInfo(info.short_url),
			);

			const { randsk } = await withRetry(() =>
				this.verifyShare(share_id, share_uk, info.pwd),
			);

			return this.listShareFiles(share_id, share_uk, randsk);
		},
	};
}

export type BaiduShareClient = ReturnType<typeof createBaiduShareClient>;
