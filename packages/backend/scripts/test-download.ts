/**
 * Manual end-to-end download verifier.
 *
 * Picks one (or a small set of) episodes from the SQLite DB, asks Baidu Pan
 * for a fresh dlink, then exercises the real `downloadFile()` path that the
 * transfer pipeline uses. Useful for sanity-checking network connectivity,
 * idle-timeout behaviour, and dlink refresh after the pipeline fixes.
 *
 * Usage:
 *   pnpm --filter backend exec tsx scripts/test-download.ts            # picks the smallest pending episode
 *   pnpm --filter backend exec tsx scripts/test-download.ts 611        # by episode id
 *   pnpm --filter backend exec tsx scripts/test-download.ts --fs-id 1045793732559118
 *   pnpm --filter backend exec tsx scripts/test-download.ts --count 3  # download 3 smallest pending files
 */

import { existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { loadConfig } from "../src/config.js";
import { createBaiduPanClient } from "../src/services/baidu-pan.js";
import { installLenientHttpDispatcher } from "../src/utils/http-dispatcher.js";

installLenientHttpDispatcher();

interface EpisodeRow {
	id: number;
	baidu_fs_id: number;
	filename: string;
	file_size: number;
}

interface CliOptions {
	episodeId?: number;
	fsId?: number;
	count: number;
}

function parseArgs(argv: string[]): CliOptions {
	const opts: CliOptions = { count: 1 };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--fs-id" || arg === "--fsid") {
			opts.fsId = Number(argv[++i]);
		} else if (arg === "--count" || arg === "-n") {
			opts.count = Number(argv[++i]);
		} else if (arg && /^\d+$/.test(arg)) {
			opts.episodeId = Number(arg);
		}
	}
	return opts;
}

function pickEpisodes(db: Database.Database, opts: CliOptions): EpisodeRow[] {
	if (opts.episodeId) {
		const row = db
			.prepare("SELECT id, baidu_fs_id, filename, file_size FROM episodes WHERE id = ?")
			.get(opts.episodeId) as EpisodeRow | undefined;
		return row ? [row] : [];
	}
	if (opts.fsId) {
		const row = db
			.prepare("SELECT id, baidu_fs_id, filename, file_size FROM episodes WHERE baidu_fs_id = ?")
			.get(opts.fsId) as EpisodeRow | undefined;
		return row
			? [row]
			: [
					{
						id: 0,
						baidu_fs_id: opts.fsId,
						filename: `fs-${opts.fsId}.bin`,
						file_size: 0,
					},
				];
	}
	return db
		.prepare(
			`SELECT id, baidu_fs_id, filename, file_size FROM episodes
			 WHERE status IN ('pending', 'failed') AND file_size > 0
			 ORDER BY file_size ASC LIMIT ?`,
		)
		.all(opts.count) as EpisodeRow[];
}

function fmtBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)}MB`;
	return `${(bytes / 1024 ** 3).toFixed(2)}GB`;
}

interface TestResult {
	episodeId: number;
	fsId: number;
	filename: string;
	expectedSize: number;
	actualSize: number;
	durationMs: number;
	avgSpeed: string;
	status: "ok" | "size-mismatch" | "no-dlink" | "error";
	error?: string;
}

async function downloadOne(
	baidu: ReturnType<typeof createBaiduPanClient>,
	tempDir: string,
	row: EpisodeRow,
): Promise<TestResult> {
	const dest = resolve(tempDir, `test-${row.baidu_fs_id}-${row.filename}`);
	if (existsSync(dest)) unlinkSync(dest);

	const result: TestResult = {
		episodeId: row.id,
		fsId: row.baidu_fs_id,
		filename: row.filename,
		expectedSize: row.file_size,
		actualSize: 0,
		durationMs: 0,
		avgSpeed: "0 B/s",
		status: "error",
	};
	const metas = await baidu.getFileMetas([row.baidu_fs_id]);
	const meta = metas[0];
	if (!meta?.dlink) {
		result.status = "no-dlink";
		result.error = "Baidu Pan returned no dlink (file may be deleted)";
		return result;
	}
	const started = Date.now();
	let lastLogged = 0;
	const useTty = process.stdout.isTTY;

	try {
		await baidu.downloadFile(meta.dlink, dest, (bytes, total) => {
			const now = Date.now();
			if (now - lastLogged > 1000 || bytes === total) {
				lastLogged = now;
				const pct = total > 0 ? Math.floor((bytes / total) * 100) : 0;
				const elapsed = (now - started) / 1000;
				const speed = elapsed > 0 ? bytes / elapsed : 0;
				const line = `[TEST]   ${pct.toString().padStart(3)}%  ${fmtBytes(bytes)}/${fmtBytes(total)}  ${fmtBytes(speed)}/s`;
				if (useTty) {
					process.stdout.write(`\r${line}   `);
				} else {
				}
			}
		});
		if (useTty) process.stdout.write("\n");
	} catch (err) {
		if (useTty) process.stdout.write("\n");
		result.status = "error";
		result.error = err instanceof Error ? err.message : String(err);
		return result;
	}

	result.durationMs = Date.now() - started;

	if (!existsSync(dest)) {
		result.status = "error";
		result.error = "destination file missing after download completed";
		return result;
	}

	result.actualSize = statSync(dest).size;
	const speed = result.durationMs > 0 ? result.actualSize / (result.durationMs / 1000) : 0;
	result.avgSpeed = `${fmtBytes(speed)}/s`;

	if (row.file_size > 0 && result.actualSize !== row.file_size) {
		result.status = "size-mismatch";
		result.error = `expected ${row.file_size} bytes, got ${result.actualSize}`;
	} else {
		result.status = "ok";
	}

	try {
		unlinkSync(dest);
	} catch {
		// best-effort cleanup
	}
	return result;
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));

	const config = loadConfig();
	const db = new Database(resolve(config.DB_PATH));

	const tempDir = resolve(config.TEMP_DIR, "test-download");
	mkdirSync(tempDir, { recursive: true });

	const baidu = createBaiduPanClient(config.BAIDU_ACCESS_TOKEN);

	const targets = pickEpisodes(db, opts);
	if (targets.length === 0) {
		process.exitCode = 1;
		return;
	}

	const results: TestResult[] = [];
	for (const row of targets) {
		try {
			results.push(await downloadOne(baidu, tempDir, row));
		} catch (err) {
			results.push({
				episodeId: row.id,
				fsId: row.baidu_fs_id,
				filename: row.filename,
				expectedSize: row.file_size,
				actualSize: 0,
				durationMs: 0,
				avgSpeed: "0 B/s",
				status: "error",
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}
	for (const r of results) {
		const _tag = r.status === "ok" ? "✓ OK         " : `✗ ${r.status.padEnd(11)}`;
	}
	const okCount = results.filter((r) => r.status === "ok").length;

	db.close();
	process.exitCode = okCount === results.length ? 0 : 1;
}

main().catch((_err) => {
	process.exit(1);
});
