## 📋 实施计划：修复传输卡死问题

### 任务类型
- [ ] 前端 (→ Gemini)
- [x] 后端 (→ Codex)
- [ ] 全栈 (→ 并行)

### 技术方案
通过梳理百度云文件下载上传的完整流程，排查到有 3 个任务一直卡在 "downloading" 状态，是因为存在以下未闭环情况：
1. **程序重启后状态未重置**：数据库中记录为 `downloading`、`downloaded` 或 `uploading` 的状态，在 Node 服务由于异常退出或人为重启后，并不会自动回退为 `pending`。这些任务会永远停留在僵尸状态。
2. **流下载缺少 AbortSignal 及超时控制**：在调用 `fetch` 下载百度云文件流时（`downloadFile`），并未传入 `signal`。如果网络连接异常导致底层的 TCP 连接挂起（没抛错但也读不到数据），由于缺乏超时检测机制，任务会永远卡在 await 处。
3. **正在进行中的传输无法立即取消**：`processEpisode` 仅在两个阶段之间校验 `signal.aborted`，如果触发了 `cancelTransfer`，无法中断当前正在进行的长时 fetch 或者 R2 上传任务。

为了让流程完全闭环，将实施以下修复逻辑：
- 在应用启动时自动检测僵尸状态并恢复为 `pending`。
- 下载阶段：不仅传入 `AbortSignal` 支持主动取消，另外实现一个 60 秒的 Idle Timeout 机制：如果超过 60 秒拿不到任何流数据字节，直接视作网络卡死抛出超时错误并重新触发重试。
- R2上传阶段：对接 `AbortSignal` 以便能立即放弃。

### 实施步骤
1. **步骤 1：增加数据库状态恢复方法**
   - 在 `packages/backend/src/db/episodes.ts` 中，增加 `resetStuckEpisodes` 方法：将状态属于 `downloading`, `downloaded`, `uploading` 的记录更新为 `pending`。

2. **步骤 2：在服务启动时调用状态恢复**
   - 修改 `packages/backend/src/index.ts`，在启动时实例化 DB 和仓库后调用 `episodesRepo.resetStuckEpisodes()`，主动释放因为应用重启而卡住的任务。

3. **步骤 3：为百度云下载增加 AbortSignal 与 Idle Timeout**
   - 修改 `packages/backend/src/services/baidu-pan.ts` 的 `downloadFile`，增加参数 `signal?: AbortSignal`。
   - 在其 `fetch` 请求中传入 `signal`。
   - 新增流闲置检测：设定一个 Interval 或在 reader 内部比对最后更新时间，超 60 秒无新数据，主动抛异常并 abort，以中止僵死请求。

4. **步骤 4：为 R2 上传增加 AbortSignal 取消机制**
   - 修改 `packages/backend/src/services/r2-upload.ts`，在 `uploadFile` 中接受 `signal?: AbortSignal`。
   - 添加监听：若 `signal` 被触发，则执行 `@aws-sdk/lib-storage` 的 `upload.abort()` 来硬切断长连接。

5. **步骤 5：在流水线中透传 Signal**
   - 修改 `packages/backend/src/services/transfer-pipeline.ts`，在 `processEpisode` 调用百度下载和 R2 上传的方法时，把传入的 `signal` 传给底层工具。

### 关键文件
| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/backend/src/db/episodes.ts` | 修改 | 新增 `resetStuckEpisodes` 方法 |
| `packages/backend/src/index.ts` | 修改 | 服务启动时调用 `resetStuckEpisodes` |
| `packages/backend/src/services/baidu-pan.ts` | 修改 | `downloadFile` 增加信号响应及 60s 空闲断流检测 |
| `packages/backend/src/services/r2-upload.ts` | 修改 | `uploadFile` 增加信号响应并调用 `upload.abort()` |
| `packages/backend/src/services/transfer-pipeline.ts` | 修改 | 将 `signal` 传给底层的下载和上传层 |

### 风险与缓解
| 风险 | 缓解措施 |
|------|----------|
| 重置状态可能与正在运行的传输冲突 | `resetStuckEpisodes` 仅在应用刚启动、没有接受任何外部 http 启动传输指令之前同步执行一次，因此处于绝对安全的内存隔离期。 |
| Timeout 检测误杀极慢下载 | 将 Idle Timeout 设为相对宽容的 60 秒，即仅在长达 1 分钟一字节都未收到的彻底断流时才阻断连接，不影响正常的缓慢传输。 |

### SESSION_ID（供 /ccg:execute 使用）
- CODEX_SESSION: single-model-analysis
- GEMINI_SESSION: single-model-analysis