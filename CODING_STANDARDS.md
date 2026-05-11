# ls-pull-video 编码规范与最佳实践 (2026版)

本文档基于 2026 年最新的技术栈标准（React 19, Tailwind CSS 4, Express 5, Node 22+）制定，旨在统一团队代码风格，提升项目的可维护性、性能与开发体验。

## 1. 核心架构与通用原则

### 1.1 Monorepo 与包管理
- **工作区隔离**：严格遵守 `frontend`, `backend`, `shared` 的边界。前端和后端**只能**依赖 `shared`，绝对不能互相引用。
- **Shared 包导出**：`shared` 包仅作为类型、常量和 SQL Schema 的共享层，**不进行编译（No build step）**，直接通过 `exports` 暴露 TypeScript 源码，依赖 TypeScript 的 Project References 进行解析。
- **ESM First**：全栈强制使用 ECMAScript Modules (`"type": "module"`)。导入本地文件时**必须**带上 `.js` 或 `.ts` 后缀（视配置而定，当前项目 TS 配置下通常省略或使用 `.js`）。

### 1.2 代码风格与格式化 (Biome)
- **全面拥抱 Biome**：废弃 Prettier 和 ESLint，统一使用 Biome 进行格式化和 Lint。
- **格式化规则**：使用 Tabs 缩进，双引号 (`"`)，语句末尾必须加分号 (`;`)，多行对象/数组必须有尾随逗号。
- **Lint 规则**：
  - `noUnusedImports`: 错误级别，严禁未使用的导入。
  - `noUnusedVariables`: 错误级别，严禁未使用的变量。
  - `noExplicitAny`: 错误级别，严禁使用 `any`，未知类型请使用 `unknown` 并配合 Zod 校验。

---

## 2. 前端规范 (React 19 + Tailwind CSS 4 + Vite)

### 2.1 React 19 最佳实践
- **废弃 `forwardRef`**：React 19 原生支持将 `ref` 作为普通 prop 传递，严禁在新建组件中使用 `forwardRef`。
- **Hooks 的现代化使用**：
  - 使用 `use()` 处理 Promise 和 Context，替代部分 `useEffect` 的数据获取场景。
  - 表单提交优先使用 React 19 的 `useActionState` 和 `useFormStatus`，实现无缝的 Pending 状态管理，减少手动 `useState` 的样板代码。
- **组件设计**：保持组件纯粹，将数据获取逻辑上推到 TanStack Query 的 Hooks 中。

### 2.2 Tailwind CSS 4 规范
- **CSS-First 配置**：Tailwind v4 采用 CSS 优先的架构。所有的主题变量、自定义颜色必须在主 CSS 文件中通过 `@theme` 指令定义，**不要**创建 `tailwind.config.js`。
- **严禁滥用 `@apply`**：`@apply` 会导致 CSS 体积急剧膨胀，破坏 Tailwind 的原子化优势。对于重复的样式，应该**提取为 React 组件**，而不是提取为 CSS 类。
- **响应式设计**：优先使用 v4 原生支持的 `@container` 容器查询，而不是仅依赖视口断点。

### 2.3 状态管理与路由 (React Router 7)
- **服务端状态**：所有涉及后端 API 的数据交互，**必须**使用 TanStack Query (`useQuery`, `useMutation`)，严禁使用 `useEffect` + `fetch` 手动管理 loading/error 状态。
- **路由级数据加载**：利用 React Router 7 的 `loader` 和 `action` 在路由层面提前获取数据，避免组件渲染时的瀑布流请求。

---

## 3. 后端规范 (Express 5 + Node 22)

### 3.1 Express 5 路由与异步处理
- **原生 Async/Await 支持**：Express 5 原生支持异步路由处理器。**严禁**在路由层写冗长的 `try/catch` 块，也**不需要**引入 `express-async-errors`。直接抛出错误，交由全局错误处理中间件兜底。
- **路由瘦身 (Fat-free Routes)**：路由层只负责接收请求和返回响应。业务逻辑必须下沉到 Service 层。

### 3.2 三层架构与工厂函数
- 本项目推崇**工厂函数 (Factory Functions)**，而不是 ES6 Class。
- **Controller 层**：解析 Req，调用 Service，返回 Res。
- **Service 层**：如 `src/services/baidu-pan.ts`，处理核心业务逻辑（如下载、上传 R2）。
- **Repository 层**：如 `src/db/episodes.ts`，专注数据库的 CRUD 操作。通过 `createEpisodesRepo()` 等工厂函数实例化。

### 3.3 类型安全与输入校验 (Zod)
- **边界防御**：所有外部输入（`req.body`, `req.query`, `req.params`，以及环境变量）**必须**在最外层通过 Zod 进行校验。
- **环境变量**：在 `src/config.ts` 中集中使用 Zod 校验 `.env`，如果缺失关键配置，必须在应用启动时立即 `process.exit(1)`（Fail Fast 原则）。

### 3.4 数据库 (better-sqlite3)
- **同步执行**：`better-sqlite3` 是同步的，这是它的性能优势。不要将其包装成 Promise，直接同步调用 `.get()`, `.all()`, `.run()`。
- **SQL 注入防御**：严禁字符串拼接 SQL，**必须**使用参数化查询（`?` 或命名参数 `@id`）。

---

## 4. 实时通信与并发控制

### 4.1 SSE (Server-Sent Events)
- **单向数据流**：对于进度条等实时状态推送，统一使用 SSE (`/api/events`) 而不是 WebSocket。
- **解耦发射器**：使用 `ProgressEmitter` 单例作为事件总线，Service 层只负责 `emit`，SSE 路由层负责监听并推送到客户端。

### 4.2 异步任务取消 (AbortController)
- **标准化取消机制**：所有耗时的异步操作（Baidu Pan 下载、R2 上传）**必须**支持 `AbortSignal`。
- 当用户在前端点击“取消传输”时，后端通过触发 `AbortController.abort()` 立即中断底层网络请求，防止资源泄漏。

---

## 5. 测试规范 (Vitest)
- 统一使用 Vitest 进行单元测试和集成测试。
- 测试文件必须与被测试文件同级放置，命名为 `*.test.ts` 或 `*.spec.ts`。
- 遵循 Arrange-Act-Assert (AAA) 模式编写测试用例。

---
*遵守以上规范，能让我们的代码在 2026 年保持最前沿的性能与可维护性。*