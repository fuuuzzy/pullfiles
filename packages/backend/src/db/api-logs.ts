import type { ApiLog } from "@ls-pull-video/shared";
import type { Database } from "better-sqlite3";

export function createApiLogsRepo(db: Database) {
	return {
		insert(log: Omit<ApiLog, "id" | "created_at">): number {
			const stmt = db.prepare(`
        INSERT INTO api_logs (method, url, request_params, response_status, response_body, duration_ms)
        VALUES (@method, @url, @request_params, @response_status, @response_body, @duration_ms)
      `);
			const info = stmt.run(log);
			return info.lastInsertRowid as number;
		},

		list(limit = 100, offset = 0): ApiLog[] {
			return db
				.prepare(`
        SELECT * FROM api_logs
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
				.all(limit, offset) as ApiLog[];
		},

		clear(): void {
			db.prepare("DELETE FROM api_logs").run();
		},
	};
}
