import { createWriteStream } from "node:fs";
import type { Database } from "better-sqlite3";
import { createApiLogsRepo } from "../db/api-logs.js";
import { withRetry } from "../utils/retry.js";

const BASE_URL = "https://pan.baidu.com/rest/2.0/xpan";

/**
 * Wraps a raw fetch error and surfaces the underlying cause (errno/code/host)
 * so logs and DB error_message are actionable instead of just "fetch failed".
 */
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

export interface BaiduFile {
	fs_id: number;
	path: string;
	filename: string;
	server_filename: string;
	size: number;
	isdir: number;
	category: number;
}

export interface FileMeta {
	fs_id: number;
	path: string;
	filename: string;
	size: number;
	dlink: string;
	category: number;
}

export function createBaiduPanClient(accessToken: string, db?: Database) {
	const apiLogsRepo = db ? createApiLogsRepo(db) : null;

	function buildUrl(base: string, params: Record<string, string>): string {
		const url = new URL(base);
		url.searchParams.set("access_token", accessToken);
		for (const [k, v] of Object.entries(params)) {
			url.searchParams.set(k, v);
		}
		return url.toString();
	}

	async function fetchJson<T>(url: string): Promise<T> {
		const start = Date.now();
		let status = 0;
		let responseBody = "";
		let errorMsg = "";

		try {
			const res = await fetch(url, {
				headers: { "User-Agent": "pan.baidu.com" },
				signal: AbortSignal.timeout(30000),
			}).catch((err) => {
				const detail = err?.cause?.message || err?.cause?.code || err?.message || String(err);
				throw new Error(`fetch failed: ${detail}`);
			});
			status = res.status;

			if (!res.ok) {
				errorMsg = `Baidu API error: ${res.status} ${res.statusText}`;
				throw new Error(errorMsg);
			}

			const text = await res.text();
			responseBody = text;

			const data = JSON.parse(text) as T & { errno?: number; errmsg?: string };
			if ("errno" in data && data.errno !== 0) {
				errorMsg = `Baidu API errno ${data.errno}: ${data.errmsg ?? "unknown error"}`;
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
			delete params.access_token; // don't log token

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
		async listAllFiles(path: string): Promise<BaiduFile[]> {
			const allFiles: BaiduFile[] = [];
			let start = 0;
			const limit = 1000;

			while (true) {
				const url = buildUrl(`${BASE_URL}/multimedia`, {
					method: "listall",
					path,
					start: String(start),
					limit: String(limit),
					recursion: "1",
					order: "time",
				});

				const data = await withRetry(() => fetchJson<{ list: BaiduFile[] }>(url));
				const files = data.list ?? [];
				allFiles.push(...files.filter((f) => f.isdir === 0));

				if (files.length < limit) break;
				start += limit;
			}

			return allFiles;
		},

		async getFileMetas(fsIds: number[]): Promise<FileMeta[]> {
			const allMetas: FileMeta[] = [];
			const batchSize = 100;

			for (let i = 0; i < fsIds.length; i += batchSize) {
				const batch = fsIds.slice(i, i + batchSize);
				const url = buildUrl(`${BASE_URL}/multimedia`, {
					method: "filemetas",
					fsids: JSON.stringify(batch),
					dlink: "1",
					from_apaas: "1",
				});

				const data = await withRetry(() => fetchJson<{ list: FileMeta[] }>(url));
				allMetas.push(...(data.list ?? []));
			}

			return allMetas;
		},

		async downloadFile(
			dlink: string,
			destPath: string,
			onProgress?: (bytes: number, total: number) => void,
			signal?: AbortSignal,
		): Promise<void> {
			const url = `${dlink}&access_token=${accessToken}`;
			let downloadedBytes = 0;
			let totalBytes = 0;
			const maxRetries = 3;
			let attempt = 0;
			const IDLE_TIMEOUT_MS = 60_000;

			// We write incrementally. If we resume, we append.
			const fileStream = createWriteStream(destPath, { flags: "a" });

			try {
				while (attempt <= maxRetries) {
					if (signal?.aborted) {
						throw new Error("Transfer cancelled");
					}

					let response: Response;
					try {
						const headers: Record<string, string> = { "User-Agent": "pan.baidu.com" };
						if (downloadedBytes > 0) {
							headers.Range = `bytes=${downloadedBytes}-`;
						}

						response = await fetch(url, {
							headers,
							redirect: "follow",
							signal: signal ?? null,
						});

						if (!response.ok && response.status !== 206) {
							// 416 (Range Not Satisfiable) often means we already have everything
							if (response.status === 416 && totalBytes > 0 && downloadedBytes >= totalBytes) {
								break;
							}
							// 403/404/410 typically mean the dlink expired; bail out fast
							// so the upper layer can refresh and retry with a new link.
							if (response.status === 403 || response.status === 404 || response.status === 410) {
								throw new Error(
									`Download failed: ${response.status} ${response.statusText} (likely expired link)`,
								);
							}
							throw new Error(`Download failed: ${response.status} ${response.statusText}`);
						}
					} catch (err: unknown) {
						if (signal?.aborted) throw err;
						const detailed = enrichFetchError(err);
						// Don't retry expired link errors — let caller refresh.
						if (detailed.message.includes("likely expired link")) throw detailed;
						attempt++;
						if (attempt > maxRetries) throw detailed;
						await new Promise((res) => setTimeout(res, 2000 * attempt));
						continue;
					}

					if (totalBytes === 0) {
						const contentLen = Number(response.headers.get("content-length") ?? 0);
						totalBytes = response.status === 206 ? downloadedBytes + contentLen : contentLen;
					}

					if (!response.body) {
						throw new Error("Response body is null");
					}

					const reader = response.body.getReader();
					let idleTimeout: NodeJS.Timeout | null = null;
					let streamError: Error | null = null;

					try {
						while (true) {
							const readPromise = reader.read();
							const timeoutPromise = new Promise<never>((_, reject) => {
								idleTimeout = setTimeout(() => {
									reject(
										new Error(`Download idle timeout: no data for ${IDLE_TIMEOUT_MS / 1000}s`),
									);
								}, IDLE_TIMEOUT_MS);
							});

							const { done, value } = await Promise.race([readPromise, timeoutPromise]);

							if (idleTimeout) {
								clearTimeout(idleTimeout);
								idleTimeout = null;
							}

							if (done) break;
							if (!value) continue;

							// Honour backpressure so we don't lose chunks at end-of-stream.
							const ok = fileStream.write(value);
							if (!ok) {
								await new Promise<void>((res, rej) => {
									const onDrain = () => {
										fileStream.off("error", onErr);
										res();
									};
									const onErr = (e: Error) => {
										fileStream.off("drain", onDrain);
										rej(e);
									};
									fileStream.once("drain", onDrain);
									fileStream.once("error", onErr);
								});
							}
							downloadedBytes += value.length;

							if (onProgress) {
								onProgress(downloadedBytes, totalBytes);
							}
						}
						break;
					} catch (err: unknown) {
						streamError = enrichFetchError(err);
					} finally {
						if (idleTimeout) {
							clearTimeout(idleTimeout);
							idleTimeout = null;
						}
						try {
							reader.releaseLock();
						} catch {
							// ignore — reader already released or stream errored
						}
					}

					if (streamError) {
						// If user explicitly cancelled, propagate immediately.
						if (signal?.aborted) throw streamError;

						// undici may surface network drops as AbortError even without our
						// signal being aborted. Treat those as transient network failures
						// and retry instead of bailing out.
						attempt++;
						if (attempt > maxRetries) throw streamError;
						await new Promise((res) => setTimeout(res, 2000 * attempt));
					}
				}
			} finally {
				// Wait for the file stream to flush all buffered writes before returning.
				// Otherwise the caller may see a truncated file when control returns.
				await new Promise<void>((res) => {
					fileStream.end(() => res());
				});
			}
		},
	};
}

export type BaiduPanClient = ReturnType<typeof createBaiduPanClient>;
