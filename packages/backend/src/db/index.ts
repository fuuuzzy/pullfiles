import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ALL_MIGRATIONS } from "@ls-pull-video/shared";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

export function getDb(dbPath: string): Database.Database {
	if (db) return db;

	const resolvedPath = resolve(dbPath);
	const dir = dirname(resolvedPath);
	mkdirSync(dir, { recursive: true });

	db = new Database(resolvedPath);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	runMigrations(db);
	return db;
}

function runMigrations(db: Database.Database): void {
	db.exec(
		"CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, sql TEXT NOT NULL, applied_at TEXT DEFAULT (datetime('now')))",
	);

	const applied = db.prepare("SELECT id FROM _migrations ORDER BY id").all() as { id: number }[];
	const appliedIds = new Set(applied.map((r) => r.id));

	for (let i = 0; i < ALL_MIGRATIONS.length; i++) {
		const migration = ALL_MIGRATIONS[i];
		if (!migration) continue;
		if (!appliedIds.has(i)) {
			db.exec(migration);
			db.prepare("INSERT INTO _migrations (id, sql) VALUES (?, ?)").run(i, migration);
		}
	}
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}
