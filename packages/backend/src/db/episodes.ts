import type { Episode, EpisodeStatus } from "@ls-pull-video/shared";
import type Database from "better-sqlite3";

export function createEpisodesRepo(db: Database.Database) {
	// Migrate any existing pending episodes that have no episode_number to 'unparsed'
	db.prepare(
		"UPDATE episodes SET status = 'unparsed' WHERE status = 'pending' AND episode_number IS NULL",
	).run();

	const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO episodes (baidu_fs_id, baidu_path, filename, episode_number, file_size, content_type, status)
    VALUES (@baidu_fs_id, @baidu_path, @filename, @episode_number, @file_size, @content_type, CASE WHEN @episode_number IS NULL THEN 'unparsed' ELSE 'pending' END)
  `);

	const updateStatusStmt = db.prepare(`
    UPDATE episodes SET status = @status, error_message = @error_message, updated_at = datetime('now')
    WHERE id = @id
  `);

	const updateR2InfoStmt = db.prepare(`
    UPDATE episodes SET r2_key = @r2_key, r2_url = @r2_url, r2_uploaded_at = datetime('now'), status = 'uploaded', updated_at = datetime('now')
    WHERE id = @id
  `);

	const incrementRetryStmt = db.prepare(`
    UPDATE episodes SET retry_count = retry_count + 1, updated_at = datetime('now')
    WHERE id = @id
  `);

	return {
		insert(
			ep: Omit<
				Episode,
				| "id"
				| "r2_key"
				| "r2_url"
				| "r2_uploaded_at"
				| "status"
				| "error_message"
				| "retry_count"
				| "created_at"
				| "updated_at"
			>,
		): boolean {
			const result = insertStmt.run(ep);
			return result.changes > 0;
		},

		getById(id: number): Episode | undefined {
			return db.prepare("SELECT * FROM episodes WHERE id = ?").get(id) as Episode | undefined;
		},

		getByBaiduFsId(fsId: number): Episode | undefined {
			return db.prepare("SELECT * FROM episodes WHERE baidu_fs_id = ?").get(fsId) as
				| Episode
				| undefined;
		},

		list(options: { status?: EpisodeStatus; page?: number; limit?: number } = {}): Episode[] {
			const { status, page = 1, limit = 50 } = options;
			const offset = (page - 1) * limit;

			if (status) {
				return db
					.prepare(
						"SELECT * FROM episodes WHERE status = ? ORDER BY episode_number ASC, filename ASC LIMIT ? OFFSET ?",
					)
					.all(status, limit, offset) as Episode[];
			}
			return db
				.prepare(
					"SELECT * FROM episodes ORDER BY episode_number ASC, filename ASC LIMIT ? OFFSET ?",
				)
				.all(limit, offset) as Episode[];
		},

		listByStatuses(statuses: EpisodeStatus[] | undefined, limit = 100): Episode[] {
			if (!statuses || statuses.length === 0) {
				return [];
			}
			if (statuses.length === 1) {
				return db
					.prepare("SELECT * FROM episodes WHERE status = ? ORDER BY updated_at DESC LIMIT ?")
					.all(statuses[0], limit) as Episode[];
			}
			const placeholders = statuses.map(() => "?").join(",");
			return db
				.prepare(
					`SELECT * FROM episodes WHERE status IN (${placeholders}) ORDER BY updated_at DESC LIMIT ?`,
				)
				.all(...statuses, limit) as Episode[];
		},

		count(): Record<EpisodeStatus, number> {
			const rows = db
				.prepare("SELECT status, COUNT(*) as count FROM episodes GROUP BY status")
				.all() as { status: EpisodeStatus; count: number }[];
			const result: Record<string, number> = {
				pending: 0,
				downloading: 0,
				downloaded: 0,
				compressing: 0,
				uploading: 0,
				uploaded: 0,
				failed: 0,
				unparsed: 0,
			};
			for (const row of rows) {
				result[row.status] = row.count;
			}
			return result as Record<EpisodeStatus, number>;
		},

		totalSize(): { total: number; transferred: number } {
			const total = (
				db.prepare("SELECT COALESCE(SUM(file_size), 0) as total FROM episodes").get() as {
					total: number;
				}
			).total;
			const transferred = (
				db
					.prepare(
						"SELECT COALESCE(SUM(file_size), 0) as total FROM episodes WHERE status = 'uploaded'",
					)
					.get() as { total: number }
			).total;
			return { total, transferred };
		},

		updateStatus(id: number, status: EpisodeStatus, errorMessage?: string): void {
			updateStatusStmt.run({ id, status, error_message: errorMessage ?? null });
		},

		updateR2Info(id: number, r2Key: string, r2Url: string): void {
			updateR2InfoStmt.run({ id, r2_key: r2Key, r2_url: r2Url });
		},

		incrementRetry(id: number): void {
			incrementRetryStmt.run({ id });
		},

		listPending(limit = 100): Episode[] {
			return db
				.prepare(
					"SELECT * FROM episodes WHERE status = 'pending' ORDER BY episode_number ASC LIMIT ?",
				)
				.all(limit) as Episode[];
		},

		listFailed(): Episode[] {
			return db
				.prepare("SELECT * FROM episodes WHERE status = 'failed' ORDER BY updated_at DESC")
				.all() as Episode[];
		},

		retryFailed(id: number): boolean {
			const result = db
				.prepare(
					"UPDATE episodes SET status = 'pending', error_message = NULL, updated_at = datetime('now') WHERE id = ? AND status = 'failed'",
				)
				.run(id);
			return result.changes > 0;
		},

		retryAllFailed(): number {
			const result = db
				.prepare(
					"UPDATE episodes SET status = 'pending', error_message = NULL, updated_at = datetime('now') WHERE status = 'failed'",
				)
				.run();
			return result.changes;
		},

		resetStuckEpisodes(): number {
			const result = db
				.prepare(
					"UPDATE episodes SET status = 'pending', error_message = NULL, updated_at = datetime('now') WHERE status IN ('downloading', 'downloaded', 'uploading')",
				)
				.run();
			return result.changes;
		},
	};
}

export type EpisodesRepo = ReturnType<typeof createEpisodesRepo>;
