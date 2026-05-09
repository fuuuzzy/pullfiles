import cors from "cors";
import express from "express";
import { loadConfig } from "./config.js";
import { getDb } from "./db/index.js";
import { installLenientHttpDispatcher } from "./utils/http-dispatcher.js";

// Must run before any fetch() so all outbound requests use the tuned dispatcher.
installLenientHttpDispatcher();

import { createEpisodesRepo } from "./db/episodes.js";
import { createTasksRepo } from "./db/tasks.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./middleware/logger.js";
import { createBaiduRoutes } from "./routes/baidu.js";
import { createEpisodesRoutes } from "./routes/episodes.js";
import { createLogsRouter } from "./routes/logs.js";
import { createSSERoutes } from "./routes/sse.js";
import { createStatusRoutes } from "./routes/status.js";
import { createTasksRoutes } from "./routes/tasks.js";
import { createTransferRoutes } from "./routes/transfer.js";
import { createBaiduPanClient } from "./services/baidu-pan.js";
import { createR2Client } from "./services/r2-upload.js";
import type { TransferContext } from "./services/transfer-pipeline.js";

const config = loadConfig();
const db = getDb(config.DB_PATH);

const episodesRepo = createEpisodesRepo(db);
episodesRepo.resetStuckEpisodes();
const tasksRepo = createTasksRepo(db);
const baidu = createBaiduPanClient(config.BAIDU_ACCESS_TOKEN, db);
const r2 = createR2Client(config);

const transferCtx: TransferContext = {
	baidu,
	r2,
	episodesRepo,
	tasksRepo,
	tempDir: config.TEMP_DIR,
	r2Prefix: "videos",
	customDomain: config.R2_CUSTOM_DOMAIN,
	concurrentTransfers: config.CONCURRENT_TRANSFERS,
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

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

app.use(errorHandler);

app.listen(config.PORT, () => {});
