import type Database from "better-sqlite3";
import type { TransferTask } from "@ls-pull-video/shared";

export function createTasksRepo(db: Database.Database) {
	const createStmt = db.prepare(`
    INSERT INTO transfer_tasks (baidu_path, status, total_files)
    VALUES (@baidu_path, 'running', @total_files)
  `);

	return {
		create(baiduPath: string, totalFiles: number): number {
			const result = createStmt.run({ baidu_path: baiduPath, total_files: totalFiles });
			return Number(result.lastInsertRowid);
		},

		getById(id: number): TransferTask | undefined {
			return db.prepare("SELECT * FROM transfer_tasks WHERE id = ?").get(id) as
				| TransferTask
				| undefined;
		},

		list(limit = 20): TransferTask[] {
			return db
				.prepare("SELECT * FROM transfer_tasks ORDER BY started_at DESC LIMIT ?")
				.all(limit) as TransferTask[];
		},

		incrementCompleted(id: number): void {
			db.prepare(
				"UPDATE transfer_tasks SET completed_files = completed_files + 1 WHERE id = ?",
			).run(id);
		},

		incrementFailed(id: number): void {
			db.prepare("UPDATE transfer_tasks SET failed_files = failed_files + 1 WHERE id = ?").run(id);
		},

		complete(id: number): void {
			db.prepare(
				"UPDATE transfer_tasks SET status = 'completed', finished_at = datetime('now') WHERE id = ?",
			).run(id);
		},

		fail(id: number, errorMessage: string): void {
			db.prepare(
				"UPDATE transfer_tasks SET status = 'failed', error_message = ?, finished_at = datetime('now') WHERE id = ?",
			).run(errorMessage, id);
		},

		cancel(id: number): void {
			db.prepare(
				"UPDATE transfer_tasks SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?",
			).run(id);
		},
	};
}

export type TasksRepo = ReturnType<typeof createTasksRepo>;
