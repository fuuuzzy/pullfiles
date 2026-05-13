import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import session from "express-session";
import { loadConfig } from "./config.js";
import { getDb } from "./db/index.js";
import { installLenientHttpDispatcher } from "./utils/http-dispatcher.js";
import { createLogger } from "./utils/logger.js";

// Must run before any fetch() so all outbound requests use the tuned dispatcher.
installLenientHttpDispatcher();

const __dirname = dirname(fileURLToPath(import.meta.url));

import { createEpisodesRepo } from "./db/episodes.js";
import { createProjectEpisodesRepo, createProjectsRepo } from "./db/projects.js";
import { createTasksRepo } from "./db/tasks.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createErrorHandler } from "./middleware/error-handler.js";
import { createLoggerMiddleware } from "./middleware/logger.js";
import { createCheckAuthRouter, createLoginRouter, createLogoutRouter } from "./routes/auth.js";
import { createBaiduRoutes } from "./routes/baidu.js";
import { createEpisodesRoutes } from "./routes/episodes.js";
import { createLogsRouter } from "./routes/logs.js";
import { createProjectsRoutes } from "./routes/projects.js";
import { createSSERoutes } from "./routes/sse.js";
import { createStatusRoutes } from "./routes/status.js";
import { createTasksRoutes } from "./routes/tasks.js";
import { createTransferRoutes } from "./routes/transfer.js";
import { createBaiduPanClient } from "./services/baidu-pan.js";
import { createBaiduShareClient } from "./services/baidu-share.js";
import type { ProjectSyncContext } from "./services/project-sync.js";
import { createR2Client } from "./services/r2-upload.js";
import type { TransferContext } from "./services/transfer-pipeline.js";

const config = loadConfig();
const logger = createLogger({
	logDir: config.LOG_DIR,
	level: config.LOG_LEVEL,
	retentionDays: config.LOG_RETENTION_DAYS,
});
const db = getDb(config.DB_PATH);

// Clean orphaned temp files from previous crashed runs
rmSync(config.TEMP_DIR, { recursive: true, force: true });

const episodesRepo = createEpisodesRepo(db);
episodesRepo.resetStuckEpisodes();
const tasksRepo = createTasksRepo(db);
const projectsRepo = createProjectsRepo(db);
const projectEpisodesRepo = createProjectEpisodesRepo(db);
projectsRepo.resetStuckProjects();
projectEpisodesRepo.resetStuckEpisodes();
const baidu = createBaiduPanClient(config.BAIDU_ACCESS_TOKEN, db);
const r2 = createR2Client(config);
const shareClient = createBaiduShareClient(config.BAIDU_ACCESS_TOKEN, config.BAIDU_APP_ID, db);

const projectSyncCtx: ProjectSyncContext = {
	projectsRepo,
	projectEpisodesRepo,
	shareClient,
	baidu,
	r2,
	tempDir: config.TEMP_DIR,
	r2Prefix: "supa",
	saveApiUrl: "https://studio.luckyshort.net/episodes",
	concurrentSync: config.CONCURRENT_SYNC,
};

const transferCtx: TransferContext = {
	baidu,
	r2,
	episodesRepo,
	tasksRepo,
	tempDir: config.TEMP_DIR,
	r2Prefix: "supa",
	customDomain: config.R2_CUSTOM_DOMAIN,
	concurrentTransfers: config.CONCURRENT_TRANSFERS,
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(createLoggerMiddleware(logger));

// Session middleware
app.use(
	session({
		secret: config.ACCESS_PASSWORD,
		resave: false,
		saveUninitialized: false,
		cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
	}),
);

// Auth routes (public)
app.use("/api/auth", createLoginRouter(config.ACCESS_PASSWORD));
app.use("/api/auth", createLogoutRouter());
app.use("/api/auth", createCheckAuthRouter());

// Serve frontend static files
const frontendDistPath = resolve(__dirname, "../../frontend/dist");
app.use(express.static(frontendDistPath));

// Public routes
app.use("/api", createSSERoutes());

// Protected routes
app.use(
	"/api/episodes",
	createAuthMiddleware(config.ACCESS_PASSWORD),
	createEpisodesRoutes(episodesRepo),
);
app.use("/api/tasks", createAuthMiddleware(config.ACCESS_PASSWORD), createTasksRoutes(tasksRepo));
app.use(
	"/api/baidu",
	createAuthMiddleware(config.ACCESS_PASSWORD),
	createBaiduRoutes(baidu, episodesRepo),
);
app.use(
	"/api/status",
	createAuthMiddleware(config.ACCESS_PASSWORD),
	createStatusRoutes(episodesRepo),
);
app.use(
	"/api/transfer",
	createAuthMiddleware(config.ACCESS_PASSWORD),
	createTransferRoutes(transferCtx),
);
app.use("/api/logs", createAuthMiddleware(config.ACCESS_PASSWORD), createLogsRouter(db));
app.use(
	"/api/projects",
	createAuthMiddleware(config.ACCESS_PASSWORD),
	createProjectsRoutes(projectsRepo, projectEpisodesRepo, projectSyncCtx),
);

app.use(createErrorHandler(logger));

// SPA fallback - serve index.html for all non-API routes
app.use((_req, res) => {
	res.sendFile(resolve(frontendDistPath, "index.html"));
});

process.on("uncaughtException", (err) => {
	console.error("FATAL: Uncaught exception:", err);
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	console.error("FATAL: Unhandled rejection:", reason);
	process.exit(1);
});

app.listen(config.PORT, () => {
	console.log(`Server started on port ${config.PORT}`);
});
