import cors from "cors";
import express from "express";
import session from "express-session";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { getDb } from "./db/index.js";
import { installLenientHttpDispatcher } from "./utils/http-dispatcher.js";

// Must run before any fetch() so all outbound requests use the tuned dispatcher.
installLenientHttpDispatcher();

const __dirname = dirname(fileURLToPath(import.meta.url));

import { createEpisodesRepo } from "./db/episodes.js";
import { createProjectsRepo, createProjectEpisodesRepo } from "./db/projects.js";
import { createTasksRepo } from "./db/tasks.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createLoginRouter, createLogoutRouter, createCheckAuthRouter } from "./routes/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./middleware/logger.js";
import { createBaiduRoutes } from "./routes/baidu.js";
import { createEpisodesRoutes } from "./routes/episodes.js";
import { createLogsRouter } from "./routes/logs.js";
import { createSSERoutes } from "./routes/sse.js";
import { createStatusRoutes } from "./routes/status.js";
import { createTasksRoutes } from "./routes/tasks.js";
import { createTransferRoutes } from "./routes/transfer.js";
import { createProjectsRoutes } from "./routes/projects.js";
import { createBaiduPanClient } from "./services/baidu-pan.js";
import { createBaiduShareClient } from "./services/baidu-share.js";
import { createR2Client } from "./services/r2-upload.js";
import type { TransferContext } from "./services/transfer-pipeline.js";
import type { ProjectSyncContext } from "./services/project-sync.js";

const config = loadConfig();
const db = getDb(config.DB_PATH);

const episodesRepo = createEpisodesRepo(db);
episodesRepo.resetStuckEpisodes();
const tasksRepo = createTasksRepo(db);
const projectsRepo = createProjectsRepo(db);
const projectEpisodesRepo = createProjectEpisodesRepo(db);
const baidu = createBaiduPanClient(config.BAIDU_ACCESS_TOKEN, db);
const r2 = createR2Client(config);
const shareClient = createBaiduShareClient(config.BAIDU_ACCESS_TOKEN, db);

const projectSyncCtx: ProjectSyncContext = {
	projectsRepo,
	projectEpisodesRepo,
	shareClient,
	baidu,
	r2,
	tempDir: config.TEMP_DIR,
	r2Prefix: "supa",
	saveApiUrl: "https://studio.luckyshort.net/episodes",
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
app.use(logger);

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

app.use(errorHandler);

// SPA fallback - serve index.html for all non-API routes
app.use((req, res) => {
	res.sendFile(resolve(frontendDistPath, "index.html"));
});

app.listen(config.PORT, () => {});
