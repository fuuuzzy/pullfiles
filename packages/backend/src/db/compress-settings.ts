import type { CompressSettings } from "@ls-pull-video/shared";
import type Database from "better-sqlite3";

export function createCompressSettingsRepo(db: Database.Database) {
	const getStmt = db.prepare("SELECT * FROM compress_settings WHERE id = 1");

	const updateStmt = db.prepare(`
		UPDATE compress_settings SET
			enabled = @enabled,
			skip_threshold_mb = @skip_threshold_mb,
			target_size_mb = @target_size_mb,
			resolution = @resolution,
			crf = @crf,
			preset = @preset,
			audio_bitrate = @audio_bitrate,
			fps = @fps,
			threads = @threads,
			updated_at = datetime('now')
		WHERE id = 1
	`);

	return {
		get(): CompressSettings {
			const row = getStmt.get() as CompressSettings;
			return {
				...row,
				enabled: Boolean(row.enabled),
			};
		},

		update(settings: Partial<Omit<CompressSettings, "id" | "updated_at">>): void {
			const current = this.get();
			updateStmt.run({
				enabled: settings.enabled !== undefined ? (settings.enabled ? 1 : 0) : (current.enabled ? 1 : 0),
				skip_threshold_mb: settings.skip_threshold_mb ?? current.skip_threshold_mb,
				target_size_mb: settings.target_size_mb ?? current.target_size_mb,
				resolution: settings.resolution ?? current.resolution,
				crf: settings.crf ?? current.crf,
				preset: settings.preset ?? current.preset,
				audio_bitrate: settings.audio_bitrate ?? current.audio_bitrate,
				fps: settings.fps ?? current.fps,
				threads: settings.threads ?? current.threads,
			});
		},
	};
}

export type CompressSettingsRepo = ReturnType<typeof createCompressSettingsRepo>;
