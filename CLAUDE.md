# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ls-pull-video 是一个视频迁移工具，支持两种模式将视频从百度网盘转移到 Cloudflare R2 存储：

1. **手动模式（Episodes）**：从百度网盘指定目录同步文件列表，逐个下载上传到 R2
2. **项目模式（Projects）**：通过 Excel 批量导入剧集信息（含百度分享链接），自动解析分享链接、下载视频、上传 R2、回调保存接口

提供 Web 仪表盘管理任务，通过 SSE 实时推送进度。

## Tech Stack

- **Monorepo**: pnpm workspaces with 3 packages: `shared`, `backend`, `frontend`
- **Backend**: Express 5, better-sqlite3, Zod validation, AWS S3 SDK (for R2), pino logger
- **Frontend**: React 19, Vite, TanStack Query, React Router 7, Tailwind CSS 4
- **Shared**: Types, DB schema SQL, and constants shared between packages
- **Linting/Formatting**: Biome (tabs, double quotes, semicolons)
- **Testing**: Vitest
- **Node**: >=22, ESM (`"type": "module"` everywhere)

## Common Commands

```bash
# Install dependencies
pnpm install

# Run all packages in dev mode (parallel)
pnpm dev

# Run backend or frontend only
pnpm dev:backend
pnpm dev:frontend

# Build all packages
pnpm build

# Typecheck all packages
pnpm typecheck

# Lint and format
pnpm lint
pnpm lint:fix
pnpm format

# Tests
pnpm test          # watch mode
pnpm test:run      # single run

# Reset database (deletes SQLite file)
pnpm db:reset
```

## Features

### 手动模式（Episodes）

- 从百度网盘指定目录同步文件列表到 `episodes` 表
- 自动解析文件名中的集数（支持 EP01、第X集、中文数字、S01E02 等格式）
- 批量下载百度网盘文件并根据配置压缩后上传到 Cloudflare R2
- 支持并发传输、取消操作
- 断点续传：失败自动重试，已下载文件跳过
- dlink 过期自动刷新

### 项目模式（Projects）

- Excel 批量导入：上传 Excel 文件（含剧标题、剧编号、语言、百度云链接等列）
- 百度分享链接解析：自动解析分享链接 → 验证提取码 → 列出文件
- 多分P支持：一个剧集的多个视频文件分别下载上传
- 封面图自动处理：识别 jpg/png 封面文件，单独上传到 R2
- 自动回调：上传完成后调用外部保存接口（`saveApiUrl`）提交数据
- 并发同步：支持多个剧集同时处理（`CONCURRENT_SYNC`）

### 通用功能

- **SSE 实时推送**：下载/上传进度、状态变更实时推送到前端
- **认证系统**：基于 session 的密码认证，单密码模式
- **API 日志**：自动记录百度 API 调用（请求参数、响应、耗时）
- **文件名解析**：智能提取集数，支持 EP01、第X集、中文数字、S01E02、-07.mp4 等格式
- **仪表盘**：展示各状态文件数量、总大小、已传输大小

## Architecture

### Data Flow

**手动模式：**
1. 前端调用 `/api/baidu/sync` 同步百度网盘文件列表到 `episodes` 表
2. 用户通过 `/api/transfer/start` 触发传输
3. 后端遍历 pending 状态的 episodes：从百度下载 → 上传 R2 → 更新状态
4. 通过 SSE (`/api/events`) 实时推送进度

**项目模式：**
1. 前端上传 Excel 到 `/api/projects/import`，解析并创建 project + project_episodes
2. 用户通过 `/api/projects/:id/start` 触发同步
3. 后端遍历 pending 状态的 project_episodes：
   - 解析百度分享链接 → 获取文件列表
   - 下载视频 → 上传 R2
   - 上传完成后调用保存接口
4. 通过 SSE 实时推送进度

### Package Dependencies

```
shared  <--  backend
shared  <--  frontend
```

The `shared` package exports types (`Episode`, `Project`, `ProjectEpisode`, `TransferTask`, `ProgressEvent`, `ApiResponse`, etc.), DB migration SQL, and constants. It uses direct TS source exports (no build step) via the `exports` field.

### Backend Structure

- `src/config.ts` — Zod-validated env config (loads `.env` from monorepo root)
- `src/db/` — SQLite via better-sqlite3. `index.ts` manages connection + migrations
  - `episodes.ts` — 手动模式的 episodes 仓库
  - `tasks.ts` — 传输任务仓库
  - `projects.ts` — 项目 + 项目剧集仓库
  - `api-logs.ts` — API 调用日志仓库
- `src/services/`
  - `baidu-pan.ts` — 百度网盘 API 客户端（文件列表、下载链接、文件下载）
  - `baidu-share.ts` — 百度分享链接解析（获取分享信息、验证提取码、列出文件）
  - `r2-upload.ts` — Cloudflare R2 上传（AWS S3 SDK）
  - `transfer-pipeline.ts` — 手动模式传输流水线（并发、取消、重试）
  - `project-sync.ts` — 项目模式同步流水线（分享链接解析 → 下载 → 上传 → 回调）
  - `excel-parser.ts` — Excel 文件解析（xlsx）
- `src/utils/`
  - `progress-emitter.ts` — SSE 广播单例
  - `episode-parser.ts` — 文件名集数解析
  - `http-dispatcher.ts` — 全局 HTTP 调度器（IPv4 优先、超时调优）
  - `logger.ts` — pino 日志（文件轮转 + stdout）
  - `retry.ts` — 通用重试工具
- `src/routes/` — Express 路由
  - `auth.ts` — 登录/登出/检查认证
  - `baidu.ts` — 百度网盘文件同步
  - `episodes.ts` — Episodes CRUD
  - `transfer.ts` — 传输控制（启动/取消/状态）
  - `projects.ts` — 项目管理（导入/列表/删除/启动同步/状态）
  - `sse.ts` — SSE 事件流
  - `status.ts` — 状态汇总
  - `tasks.ts` — 任务列表
  - `logs.ts` — API 日志查询
- `src/middleware/`
  - `auth.ts` — Session 认证中间件
  - `error-handler.ts` — 全局错误处理
  - `logger.ts` — 请求日志中间件

### Frontend Structure

- `src/api/client.ts` — `apiFetch<T>()` wrapper that injects auth token and unwraps `ApiResponse<T>`
- `src/api/sse.ts` — EventSource connection to `/api/events`
- `src/hooks/` — TanStack Query hooks for episodes, status, and SSE event handling
- `src/pages/`
  - `DashboardPage.tsx` — 仪表盘（状态汇总、快速操作）
  - `EpisodesPage.tsx` — 手动模式文件列表管理
  - `TransferPage.tsx` — 传输任务监控
  - `ProjectsPage.tsx` — 项目列表
  - `ProjectDetailPage.tsx` — 项目详情（剧集列表、同步状态）
  - `LogsPage.tsx` — API 日志查看
- `src/components/` — Organized by feature (Dashboard, Episodes, Transfer, Projects, Common, Layout)

### Key Patterns

- **Factory functions over classes**: Services and repos are created via `createX()` functions that return object literals (e.g., `createBaiduPanClient()`, `createEpisodesRepo()`)
- **Immutable config**: Config is loaded once at startup via Zod and passed through
- **SSE for real-time**: The `ProgressEmitter` singleton broadcasts download/upload progress; frontend subscribes via `EventSource`
- **AbortController for cancellation**: Transfer pipeline supports cancellation via `AbortSignal`
- **Migration system**: SQL migrations in `shared/src/db-schema.ts` are tracked in a `_migrations` table
- **Repository pattern**: Each DB entity has a dedicated repo module with prepared statements

### Auth Model

The `ACCESS_PASSWORD` env var serves as both the login credential and API token. The frontend stores it in `localStorage` and sends it as `Bearer` token. There are no user accounts — it's a single-password system.

## Database Tables

| 表名 | 用途 |
|------|------|
| `episodes` | 手动模式的文件记录（百度文件信息、R2 信息、状态） |
| `transfer_tasks` | 传输任务记录（文件数、完成数、状态） |
| `projects` | 项目记录（名称、状态、总集数、已完成数） |
| `project_episodes` | 项目剧集记录（标题、集号、百度链接、上传文件信息、保存响应） |
| `api_logs` | 百度 API 调用日志 |
| `_migrations` | 数据库迁移追踪 |

## Environment Variables

Copy `.env.example` to `.env`. Required vars are validated by Zod at startup — the process exits with clear error messages if any are missing.

| 变量 | 必填 | 说明 |
|------|------|------|
| `BAIDU_ACCESS_TOKEN` | 是 | 百度网盘 access token |
| `BAIDU_APP_ID` | 是 | 百度网盘 app id |
| `R2_ACCOUNT_ID` | 是 | Cloudflare 账户 ID |
| `R2_ACCESS_KEY_ID` | 是 | R2 access key |
| `R2_SECRET_ACCESS_KEY` | 是 | R2 secret key |
| `R2_BUCKET_NAME` | 是 | R2 bucket 名称 |
| `R2_CUSTOM_DOMAIN` | 是 | R2 自定义域名（URL 格式） |
| `ACCESS_PASSWORD` | 是 | 登录密码 |
| `PORT` | 否 | 端口，默认 3001 |
| `DB_PATH` | 否 | SQLite 路径，默认 `./data/videos.db` |
| `TEMP_DIR` | 否 | 临时文件目录，默认 `/tmp/ls-pull-video` |
| `CONCURRENT_TRANSFERS` | 否 | 手动模式并发数，默认 10 |
| `CONCURRENT_SYNC` | 否 | 项目模式并发数，默认 3 |
| `LOG_DIR` | 否 | 日志目录，默认 `./logs` |
| `LOG_LEVEL` | 否 | 日志级别，默认 `info` |
| `LOG_RETENTION_DAYS` | 否 | 日志保留天数，默认 30 |

## Code Style

- Biome enforces: tabs, double quotes, semicolons, trailing commas
- `noUnusedImports: error`, `noUnusedVariables: error`, `noExplicitAny: error`
- TypeScript strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`

## Build & PM2 Deployment

### One-Command Build

```bash
pnpm build
```

This builds all packages in the monorepo: `shared` → `backend` → `frontend`. The backend output is at `packages/backend/dist/`.

### PM2 Startup

```bash
# Build first
pnpm build

# Start with PM2 (backend serves both API and frontend static files)
pm2 start packages/backend/dist/index.js --name ls-pull-video

# Other useful PM2 commands
pm2 list                      # 查看进程列表
pm2 logs ls-pull-video        # 查看日志
pm2 restart ls-pull-video     # 重启
pm2 stop ls-pull-video         # 停止
pm2 delete ls-pull-video       # 删除
```

**Nginx reverse proxy** (only port 80/443 needed):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }
}
```

PM2 will automatically use the `.env` file in the project root. Backend serves frontend static files on the same port, so only one port (default 3001) needs to be proxied.
