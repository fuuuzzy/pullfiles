import type { SessionData } from "express-session";
import { Store } from "express-session";
import type Database from "better-sqlite3";

interface SessionRow {
	sid: string;
	sess: string;
	expired: number;
}

export function createSqliteSessionStore(db: Database.Database): Store {
	db.exec(`
		CREATE TABLE IF NOT EXISTS _sessions (
			sid TEXT PRIMARY KEY,
			sess TEXT NOT NULL,
			expired INTEGER NOT NULL
		)
	`);

	const getStmt = db.prepare("SELECT sess FROM _sessions WHERE sid = ? AND expired > ?");
	const setStmt = db.prepare("INSERT OR REPLACE INTO _sessions (sid, sess, expired) VALUES (?, ?, ?)");
	const destroyStmt = db.prepare("DELETE FROM _sessions WHERE sid = ?");
	const touchStmt = db.prepare("UPDATE _sessions SET expired = ? WHERE sid = ?");
	const clearStmt = db.prepare("DELETE FROM _sessions");

	// Periodic cleanup of expired sessions (every 15 minutes)
	setInterval(() => {
		db.prepare("DELETE FROM _sessions WHERE expired <= ?").run(Date.now());
	}, 15 * 60 * 1000).unref();

	const now = Date.now();

	class SqliteStore extends Store {
		get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
			try {
				const row = getStmt.get(sid, now) as SessionRow | undefined;
				if (!row) {
					callback(null, null);
					return;
				}
				callback(null, JSON.parse(row.sess) as SessionData);
			} catch (err) {
				callback(err);
			}
		}

		set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
			try {
				const maxAge = session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000;
				const expired = Date.now() + maxAge;
				setStmt.run(sid, JSON.stringify(session), expired);
				callback?.();
			} catch (err) {
				callback?.(err);
			}
		}

		destroy(sid: string, callback?: (err?: unknown) => void): void {
			try {
				destroyStmt.run(sid);
				callback?.();
			} catch (err) {
				callback?.(err);
			}
		}

		touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
			try {
				const maxAge = session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000;
				const expired = Date.now() + maxAge;
				touchStmt.run(expired, sid);
				callback?.();
			} catch (err) {
				callback?.(err);
			}
		}

		clear(callback?: (err?: unknown) => void): void {
			try {
				clearStmt.run();
				callback?.();
			} catch (err) {
				callback?.(err);
			}
		}
	}

	return new SqliteStore();
}