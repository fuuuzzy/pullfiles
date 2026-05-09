# 传输任务页面工作流程

## 1. 组件结构

```
TransferPage
├── TransferPanel        # 控制传输开始/取消，显示待传输文件数
├── TransferLog         # 显示活跃传输和历史记录
│   ├── 活跃传输列表    # status: downloading/uploading/downloaded
│   └── 最近完成列表    # status: uploaded/failed
```

## 2. 数据获取流程

### 2.1 初始数据加载

```typescript
// TransferPage.tsx
const { data: episodesData, isLoading } = useEpisodes();
// 查询 key: ["episodes", status, page]  默认 status=undefined, page=1

// useEpisodes hook 调用
GET /api/episodes?page=1&limit=50

// 返回数据结构
{
  "success": true,
  "data": {
    "episodes": [Episode, ...],
    "counts": {
      "pending": 1695,
      "downloading": 2,
      "downloaded": 0,
      "uploading": 0,
      "uploaded": 0,
      "failed": 60,
      "unparsed": 2064
    }
  }
}
```

### 2.2 状态统计

```typescript
// useStatusSummary hook
GET /api/status/summary

// 返回数据结构
{
  "success": true,
  "data": {
    "pending": 1695,
    "downloading": 2,
    "downloaded": 0,
    "uploading": 0,
    "uploaded": 0,
    "failed": 60,
    "unparsed": 2064,
    "totalSizeBytes": 357900767849,
    "transferredSizeBytes": 0
  }
}
```

## 3. 启动传输流程

### 3.1 前端触发

```typescript
// TransferPanel 点击"开始传输"
start.mutate()  → useStartTransfer()

// useStartTransfer hook
POST /api/transfer/start

// 后端返回
{ "success": true, "data": { "message": "Transfer started" } }
```

### 3.2 后端处理

```
POST /api/transfer/start
    ↓
createTransferRoutes(transferCtx)
    ↓
runTransfer(ctx)  // 异步执行，不阻塞
    ↓
1. ctx.tasksRepo.create("batch", pendingEpisodes.length)  // 创建任务记录
2. progressEmitter.emitTaskUpdate({taskId, totalFiles, ...})  // 通知任务开始
3. for each episode: processEpisode()  // 逐个处理文件
```

## 4. 实时更新 (SSE)

### 4.1 前端连接

```typescript
// useSSE hook
const { subscribe } = useSSE();

// useEffect 建立 SSE 连接
createSSEConnection({
  onProgress: (event) => { progressMap[episodeId] = event },
  onStatus: () => { invalidateQueries(["episodes", "status"]) },
  onTaskUpdate: () => { invalidateQueries(["tasks", "status"]) },
})
```

### 4.2 后端 SSE 端点

```
GET /api/events  (公开路由，无需认证)

SSE 事件类型:
- episode_progress  → ProgressEvent
- episode_status    → EpisodeStatusEvent
- task_update       → TaskUpdateEvent
```

### 4.3 事件数据结构

```typescript
// ProgressEvent
interface ProgressEvent {
  episodeId: number;
  phase: "download" | "upload";
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
  speed: number;
}

// EpisodeStatusEvent
interface EpisodeStatusEvent {
  episodeId: number;
  status: EpisodeStatus;
  errorMessage?: string;
}

// TaskUpdateEvent
interface TaskUpdateEvent {
  taskId: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
}
```

## 5. TransferLog 显示逻辑

```typescript
// 活跃传输
const active = episodes.filter(
  e => e.status === "downloading" || 
       e.status === "uploading" || 
       e.status === "downloaded"
);

// 最近完成
const recent = episodes
  .filter(e => e.status === "uploaded" || e.status === "failed")
  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  .slice(0, 10);
```

**问题发现**: TransferLog 只显示 `pending` 和 `unparsed` 之外的状态，但 `useEpisodes()` 默认查询不带 status 过滤，会获取所有状态的 episode。

## 6. 传输管道处理流程

```
processEpisode(episode)
    │
    ├── 1. status = "downloading"
    │   progressEmitter.emitStatus({episodeId, status: "downloading"})
    │
    ├── 2. 获取下载链接
    │   ctx.baidu.getFileMetas([episode.baidu_fs_id])
    │   → 获取 dlink
    │
    ├── 3. 下载文件到临时目录
    │   ctx.baidu.downloadFile(dlink, tempPath, onProgress)
    │   → 进度更新通过 progressEmitter.emitProgress()
    │
    ├── 4. status = "downloaded"
    │   progressEmitter.emitStatus({episodeId, status: "downloaded"})
    │
    ├── 5. status = "uploading"
    │   progressEmitter.emitStatus({episodeId, status: "uploading"})
    │
    ├── 6. 上传到 R2
    │   ctx.r2.uploadFile(tempPath, r2Key, contentType, onProgress)
    │   → 进度更新通过 progressEmitter.emitProgress()
    │
    ├── 7. status = "uploaded"
    │   progressEmitter.emitStatus({episodeId, status: "uploaded"})
    │
    └── 8. 清理临时文件
```

## 7. 数据库状态流转

```
episodes.status:
├── "unparsed"  → 集数解析失败的视频
├── "pending"   → 等待传输
├── "downloading" → 下载中
├── "downloaded"  → 下载完成，待上传
├── "uploading"   → 上传中
├── "uploaded"    → 传输完成
└── "failed"      → 传输失败
```

## 8. 任务记录 (tasks 表)

```
tasks 表字段:
- id: 任务ID
- baidu_path: "batch"
- status: "running" | "completed" | "cancelled" | "failed"
- total_files: 总文件数
- completed_files: 已完成
- failed_files: 失败数
- started_at: 开始时间
- finished_at: 完成时间
```

## 9. 潜在问题排查

### 问题1: 传输任务页面没有显示活跃传输数据

**现象**: TransferLog 显示"暂无活跃的传输任务"，但实际上有文件正在下载/上传

**根本原因**: `useEpisodes()` 默认查询不带 status 过滤，且按 `episode_number ASC, filename ASC` 排序。由于 SQL 中 NULL 值排序时排在最前面，**所有 `episode_number IS NULL` 的 unparsed 剧集都排在前面**。

API 查询结果（page=1, limit=50）:
```json
{
  "episodes": [
    {"status": "unparsed", "filename": "xxx.mp4", "episode_number": null},  // 第一页全是 unparsed
    {"status": "unparsed", "filename": "yyy.mp4", "episode_number": null},
    ...
  ],
  "counts": {"pending": 1695, "downloading": 3, "unparsed": 2064, ...}
}
```

而 TransferLog 显示的 `active` 只包含 downloading/uploading/downloaded 状态的文件，**它们在第 2 页或更后面**。

**解决方案**: TransferPage 应该使用 `useQuery` 直接获取特定状态的 episodes：

```typescript
// 改用直接 query 获取活跃剧集
const { data: activeData } = useQuery({
  queryKey: ["episodes", "active"],
  queryFn: () => apiFetch<EpisodesResponse>(
    "/api/episodes?status=downloading&status=uploading&status=downloaded&limit=100"
  ),
});
```

或者后端修改 episodes 列表 API 的默认排序逻辑。

### 问题2: 点击开始传输无反应

**可能原因**:
1. 传输已经在运行（runTransfer 有保护防止重复启动）
2. 没有 pending 状态的文件
3. API 调用失败（401 Unauthorized）

### 问题3: SSE 不更新

**可能原因**:
1. 前端 SSE 连接失败
2. 后端事件发送错误（已修复 off 事件名问题，见下方修复记录）
3. 浏览器兼容性问题

## 10. 关键代码路径

```
前端:
pages/TransferPage.tsx
  ├── hooks/useEpisodes.ts      → useEpisodes() 获取 episodes
  ├── hooks/useSSE.ts          → useSSE() 建立实时连接
  ├── components/Transfer/TransferPanel.tsx  → 开始/取消传输
  └── components/Transfer/TransferLog.tsx     → 显示传输状态

后端:
routes/transfer.ts             → /api/transfer/start, /cancel
services/transfer-pipeline.ts  → runTransfer() 执行传输
utils/progress-emitter.ts      → 事件发射器
routes/sse.ts                 → /api/events SSE 端点
```

## 11. 修复记录

### 2026-05-10: SSE 事件监听器移除修复

**文件**: `packages/backend/src/routes/sse.ts`

**问题**: `req.on("close")` 回调中使用的事件名与 `progressEmitter` 注册时不匹配

**修复**:
```typescript
// 修复前 (错误)
progressEmitter.off("progress", onProgress);
progressEmitter.off("status", onStatus);

// 修复后 (正确)
progressEmitter.off("episode_progress", onProgress);
progressEmitter.off("episode_status", onStatus);
```
