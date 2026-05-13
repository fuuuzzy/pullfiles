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

export const CREATE_PROJECTS_TABLE = `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_link TEXT,
    status TEXT NOT NULL DEFAULT 'created',
    total_episodes INTEGER DEFAULT 0,
    completed_episodes INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_PROJECT_EPISODES_TABLE = `
  CREATE TABLE IF NOT EXISTS project_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    episode_no TEXT NOT NULL,
    total_parts INTEGER,
    language TEXT,
    description TEXT,
    baidu_link TEXT NOT NULL,
    cover_filename TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    uploaded_files TEXT,
    cover_r2_url TEXT,
    saved_response TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`;

export const CREATE_PROJECT_EPISODES_INDEX_STATUS = `
  CREATE INDEX IF NOT EXISTS idx_project_episodes_status ON project_episodes(status);
`;

export const CREATE_PROJECT_EPISODES_INDEX_PROJECT_ID = `
  CREATE INDEX IF NOT EXISTS idx_project_episodes_project_id ON project_episodes(project_id);
`;

export const ADD_PROJECT_EPISODES_RETRY_COUNT = `
  ALTER TABLE project_episodes ADD COLUMN retry_count INTEGER DEFAULT 0;
`;

export const CREATE_COMPRESS_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS compress_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER NOT NULL DEFAULT 1,
    skip_threshold_mb INTEGER NOT NULL DEFAULT 60,
    target_size_mb INTEGER NOT NULL DEFAULT 50,
    resolution TEXT NOT NULL DEFAULT '1080x1920',
    crf INTEGER NOT NULL DEFAULT 28,
    preset TEXT NOT NULL DEFAULT 'fast',
    audio_bitrate TEXT NOT NULL DEFAULT '128k',
    fps INTEGER NOT NULL DEFAULT 30,
    threads INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO compress_settings (id) VALUES (1);
`;

export const ALL_MIGRATIONS = [
	CREATE_EPISODES_TABLE,
	CREATE_EPISODES_INDEX_STATUS,
	CREATE_EPISODES_INDEX_FS_ID,
	CREATE_TRANSFER_TASKS_TABLE,
	CREATE_API_LOGS_TABLE,
	CREATE_PROJECTS_TABLE,
	CREATE_PROJECT_EPISODES_TABLE,
	CREATE_PROJECT_EPISODES_INDEX_STATUS,
	CREATE_PROJECT_EPISODES_INDEX_PROJECT_ID,
	ADD_PROJECT_EPISODES_RETRY_COUNT,
	CREATE_COMPRESS_SETTINGS_TABLE,
];
