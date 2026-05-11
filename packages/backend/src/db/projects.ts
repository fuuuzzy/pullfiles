import type {
	Project,
	ProjectEpisode,
	ProjectEpisodeStatus,
	ProjectStatus,
} from "@ls-pull-video/shared";
import type Database from "better-sqlite3";

export function createProjectsRepo(db: Database.Database) {
	const insertProjectStmt = db.prepare(`
    INSERT INTO projects (name, source_link, status, total_episodes)
    VALUES (@name, @source_link, @status, @total_episodes)
  `);

	const updateProjectStatusStmt = db.prepare(`
    UPDATE projects SET status = @status, error_message = @error_message, updated_at = datetime('now')
    WHERE id = @id
  `);

	const incrementProjectCompletedStmt = db.prepare(`
    UPDATE projects SET completed_episodes = completed_episodes + 1, updated_at = datetime('now')
    WHERE id = @id
  `);

	const updateProjectTotalsStmt = db.prepare(`
    UPDATE projects SET total_episodes = @total, updated_at = datetime('now')
    WHERE id = @id
  `);

	return {
		create(name: string, sourceLink?: string): number {
			const result = insertProjectStmt.run({
				name,
				source_link: sourceLink ?? null,
				status: "created",
				total_episodes: 0,
			});
			return Number(result.lastInsertRowid);
		},

		getById(id: number): Project | undefined {
			return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
		},

		list(): Project[] {
			return db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as Project[];
		},

		updateStatus(id: number, status: ProjectStatus, errorMessage?: string): void {
			updateProjectStatusStmt.run({
				id,
				status,
				error_message: errorMessage ?? null,
			});
		},

		incrementCompleted(id: number): void {
			incrementProjectCompletedStmt.run({ id });
		},

		setTotalEpisodes(id: number, total: number): void {
			updateProjectTotalsStmt.run({ id, total });
		},

		delete(id: number): boolean {
			const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
			return result.changes > 0;
		},

		resetStuckProjects(): number {
			const result = db
				.prepare(
					"UPDATE projects SET status = 'created', error_message = NULL, updated_at = datetime('now') WHERE status IN ('parsing', 'syncing')",
				)
				.run();
			return result.changes;
		},
	};
}

export type ProjectsRepo = ReturnType<typeof createProjectsRepo>;

export function createProjectEpisodesRepo(db: Database.Database) {
	const insertStmt = db.prepare(`
    INSERT INTO project_episodes (project_id, title, episode_no, total_parts, language, description, baidu_link, cover_filename, status)
    VALUES (@project_id, @title, @episode_no, @total_parts, @language, @description, @baidu_link, @cover_filename, @status)
  `);

	const incrementRetryStmt = db.prepare(`
    UPDATE project_episodes SET retry_count = retry_count + 1, updated_at = datetime('now')
    WHERE id = @id
  `);

	const updateStatusStmt = db.prepare(`
    UPDATE project_episodes SET status = @status, error_message = @error_message, updated_at = datetime('now')
    WHERE id = @id
  `);

	const updateSavedStmt = db.prepare(`
    UPDATE project_episodes SET status = 'saved', saved_response = @saved_response, updated_at = datetime('now')
    WHERE id = @id
  `);

	const updateCoverStmt = db.prepare(`
    UPDATE project_episodes SET cover_filename = @cover_filename, updated_at = datetime('now')
    WHERE id = @id
  `);

	const updateUploadedFilesStmt = db.prepare(`
    UPDATE project_episodes SET uploaded_files = @uploaded_files, cover_r2_url = @cover_r2_url, updated_at = datetime('now')
    WHERE id = @id
  `);

	return {
		insert(episode: {
			project_id: number;
			title: string;
			episode_no: string;
			total_parts: number | null;
			language: string | null;
			description: string | null;
			baidu_link: string;
			cover_filename?: string | null;
		}): number {
			const result = insertStmt.run({
				...episode,
				cover_filename: episode.cover_filename ?? null,
				language: episode.language ?? null,
				description: episode.description ?? null,
				total_parts: episode.total_parts ?? null,
				status: "pending",
			});
			return Number(result.lastInsertRowid);
		},

		bulkInsert(
			episodes: Array<{
				project_id: number;
				title: string;
				episode_no: string;
				total_parts: number | null;
				language: string | null;
				description: string | null;
				baidu_link: string;
				cover_filename?: string | null;
			}>,
		): number {
			const insertTx = db.transaction((rows: typeof episodes) => {
				let count = 0;
				for (const row of rows) {
					const result = insertStmt.run({
						...row,
						cover_filename: row.cover_filename ?? null,
						language: row.language ?? null,
						description: row.description ?? null,
						total_parts: row.total_parts ?? null,
						status: "pending",
					});
					if (result.changes > 0) count++;
				}
				return count;
			});
			return insertTx(episodes);
		},

		getById(id: number): ProjectEpisode | undefined {
			return db.prepare("SELECT * FROM project_episodes WHERE id = ?").get(id) as
				| ProjectEpisode
				| undefined;
		},

		listByProjectId(projectId: number): ProjectEpisode[] {
			return db
				.prepare("SELECT * FROM project_episodes WHERE project_id = ? ORDER BY id")
				.all(projectId) as ProjectEpisode[];
		},

		listByStatus(status: ProjectEpisodeStatus, limit = 100): ProjectEpisode[] {
			return db
				.prepare("SELECT * FROM project_episodes WHERE status = ? LIMIT ?")
				.all(status, limit) as ProjectEpisode[];
		},

		listPendingByProjectId(projectId: number): ProjectEpisode[] {
			return db
				.prepare("SELECT * FROM project_episodes WHERE project_id = ? AND status = 'pending'")
				.all(projectId) as ProjectEpisode[];
		},

		listUploadedByProjectId(projectId: number): ProjectEpisode[] {
			return db
				.prepare("SELECT * FROM project_episodes WHERE project_id = ? AND status = 'uploaded'")
				.all(projectId) as ProjectEpisode[];
		},

		updateStatus(id: number, status: ProjectEpisodeStatus, errorMessage?: string): void {
			updateStatusStmt.run({
				id,
				status,
				error_message: errorMessage ?? null,
			});
		},

		updateSaved(id: number, savedResponse: string): void {
			updateSavedStmt.run({ id, saved_response: savedResponse });
		},

		updateCover(id: number, coverFilename: string): void {
			updateCoverStmt.run({ id, cover_filename: coverFilename });
		},

		updateUploadedFiles(id: number, uploadedFiles: string, coverR2Url: string | null): void {
			updateUploadedFilesStmt.run({
				id,
				uploaded_files: uploadedFiles,
				cover_r2_url: coverR2Url,
			});
		},

		countByProjectId(projectId: number): number {
			const row = db
				.prepare("SELECT COUNT(*) as count FROM project_episodes WHERE project_id = ?")
				.get(projectId) as { count: number };
			return row.count;
		},

		countByProjectIdAndStatus(projectId: number, status: ProjectEpisodeStatus): number {
			const row = db
				.prepare(
					"SELECT COUNT(*) as count FROM project_episodes WHERE project_id = ? AND status = ?",
				)
				.get(projectId, status) as { count: number };
			return row.count;
		},

		deleteByProjectId(projectId: number): number {
			const result = db.prepare("DELETE FROM project_episodes WHERE project_id = ?").run(projectId);
			return result.changes;
		},

		incrementRetry(id: number): void {
			incrementRetryStmt.run({ id });
		},

		resetStuckEpisodes(): number {
			const result = db
				.prepare(
					"UPDATE project_episodes SET status = 'pending', error_message = NULL, updated_at = datetime('now') WHERE status IN ('downloading', 'uploading')",
				)
				.run();
			return result.changes;
		},
	};
}

export type ProjectEpisodesRepo = ReturnType<typeof createProjectEpisodesRepo>;
