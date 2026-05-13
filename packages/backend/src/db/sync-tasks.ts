import type { SyncTask, SyncTaskStatus } from "@ls-pull-video/shared";
import { getDb } from "./index.js";
import { loadConfig } from "../config.js";

const config = loadConfig();
const db = getDb(config.DB_PATH);

export const syncTasksDb = {
	create(
		task: Omit<SyncTask, "task_id" | "status" | "error_message" | "created_at" | "updated_at"> & {
			status?: SyncTaskStatus;
		},
	): number {
		const stmt = db.prepare(`
      INSERT INTO sync_tasks (drama_title, metadata, status)
      VALUES (?, ?, ?)
    `);
		const result = stmt.run(task.drama_title, task.metadata, task.status || "pending");
		return result.lastInsertRowid as number;
	},

	createMany(
		tasks: Array<
			Omit<SyncTask, "task_id" | "status" | "error_message" | "created_at" | "updated_at"> & {
				status?: SyncTaskStatus;
			}
		>,
	): number[] {
		const stmt = db.prepare(`
      INSERT INTO sync_tasks (drama_title, metadata, status)
      VALUES (?, ?, ?)
    `);
		
		const insertMany = db.transaction((tasksToInsert: typeof tasks) => {
			const ids: number[] = [];
			for (const task of tasksToInsert) {
				const result = stmt.run(task.drama_title, task.metadata, task.status || "pending");
				ids.push(result.lastInsertRowid as number);
			}
			return ids;
		});

		return insertMany(tasks);
	},

	findById(id: number): SyncTask | undefined {
		const stmt = db.prepare("SELECT * FROM sync_tasks WHERE task_id = ?");
		return stmt.get(id) as SyncTask | undefined;
	},

	findAll(options?: { status?: SyncTaskStatus }): SyncTask[] {
		if (options?.status) {
			const stmt = db.prepare("SELECT * FROM sync_tasks WHERE status = ? ORDER BY created_at DESC");
			return stmt.all(options.status) as SyncTask[];
		}
		const stmt = db.prepare("SELECT * FROM sync_tasks ORDER BY created_at DESC");
		return stmt.all() as SyncTask[];
	},

	updateStatus(id: number, status: SyncTaskStatus, errorMessage: string | null = null): void {
		const stmt = db.prepare(`
      UPDATE sync_tasks 
      SET status = ?, error_message = ?, updated_at = datetime('now')
      WHERE task_id = ?
    `);
		stmt.run(status, errorMessage, id);
	},
	
	delete(id: number): void {
		const stmt = db.prepare("DELETE FROM sync_tasks WHERE task_id = ?");
		stmt.run(id);
	},
	
	clear(): void {
		const stmt = db.prepare("DELETE FROM sync_tasks");
		stmt.run();
	}
};
