export const CREATE_EPISODES_TABLE = `
  CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baidu_fs_id INTEGER UNIQUE NOT NULL,
    baidu_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    episode_number INTEGER,
    file_size INTEGER,
    content_type TEXT,
    r2_key TEXT,
    r2_url TEXT,
    r2_uploaded_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_EPISODES_INDEX_STATUS = `
  CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
`;

export const CREATE_EPISODES_INDEX_FS_ID = `
  CREATE INDEX IF NOT EXISTS idx_episodes_baidu_fs_id ON episodes(baidu_fs_id);
`;

export const CREATE_TRANSFER_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS transfer_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baidu_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    total_files INTEGER NOT NULL,
    completed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    error_message TEXT
  );
`;

export const CREATE_API_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    request_params TEXT,
    response_status INTEGER NOT NULL,
    response_body TEXT,
    duration_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const ALL_MIGRATIONS = [
	CREATE_EPISODES_TABLE,
	CREATE_EPISODES_INDEX_STATUS,
	CREATE_EPISODES_INDEX_FS_ID,
	CREATE_TRANSFER_TASKS_TABLE,
	CREATE_API_LOGS_TABLE,
];
