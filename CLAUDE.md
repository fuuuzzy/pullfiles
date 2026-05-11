# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ls-pull-video is a tool that transfers video files from Baidu Pan (百度网盘) to Cloudflare R2 storage. It provides a web dashboard to manage episodes, trigger transfers, and monitor progress in real-time via SSE.

## Tech Stack

- **Monorepo**: pnpm workspaces with 3 packages: `shared`, `backend`, `frontend`
- **Backend**: Express 5, better-sqlite3, Zod validation, AWS S3 SDK (for R2)
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

## Architecture

### Data Flow

1. Frontend calls `/api/baidu/sync` to fetch file listing from Baidu Pan and populate the `episodes` table
2. User triggers transfer via `/api/transfer/start`
3. Backend iterates pending episodes: downloads from Baidu to temp dir, uploads to R2, updates episode status
4. Real-time progress is pushed to the frontend via SSE (`/api/events`)

### Package Dependencies

```
shared  <--  backend
shared  <--  frontend
```

The `shared` package exports types (`Episode`, `TransferTask`, `ProgressEvent`, `ApiResponse`, etc.), DB migration SQL, and constants. It uses direct TS source exports (no build step) via the `exports` field.

### Backend Structure

- `src/config.ts` — Zod-validated env config (loads `.env` from monorepo root)
- `src/db/` — SQLite via better-sqlite3. `index.ts` manages connection + migrations. `episodes.ts` and `tasks.ts` are repository modules (factory functions returning repo objects)
- `src/services/baidu-pan.ts` — Baidu Pan API client (file listing, download links, file download)
- `src/services/r2-upload.ts` — Cloudflare R2 upload via AWS S3 SDK
- `src/services/transfer-pipeline.ts` — Orchestrates the download-then-upload pipeline with cancellation support
- `src/utils/progress-emitter.ts` — Singleton EventEmitter for SSE broadcasting
- `src/routes/sse.ts` — Public SSE endpoint (no auth); other routes require Bearer token auth
- `src/middleware/auth.ts` — Simple password-based Bearer token auth (password = `ACCESS_PASSWORD` env var)

### Frontend Structure

- `src/api/client.ts` — `apiFetch<T>()` wrapper that injects auth token and unwraps `ApiResponse<T>`
- `src/api/sse.ts` — EventSource connection to `/api/events`
- `src/hooks/` — TanStack Query hooks for episodes, status, and SSE event handling
- `src/pages/` — Route pages: Dashboard, Episodes, Transfer
- `src/components/` — Organized by feature (Dashboard, Episodes, Transfer, Common, Layout)

### Key Patterns

- **Factory functions over classes**: Services and repos are created via `createX()` functions that return object literals (e.g., `createBaiduPanClient()`, `createEpisodesRepo()`)
- **Immutable config**: Config is loaded once at startup via Zod and passed through
- **SSE for real-time**: The `ProgressEmitter` singleton broadcasts download/upload progress; frontend subscribes via `EventSource`
- **AbortController for cancellation**: Transfer pipeline supports cancellation via `AbortSignal`
- **Migration system**: SQL migrations in `shared/src/db-schema.ts` are tracked in a `_migrations` table

### Auth Model

The `ACCESS_PASSWORD` env var serves as both the login credential and API token. The frontend stores it in `localStorage` and sends it as `Bearer` token. There are no user accounts — it's a single-password system.

## Environment Variables

Copy `.env.example` to `.env`. Required vars are validated by Zod at startup — the process exits with clear error messages if any are missing.

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
