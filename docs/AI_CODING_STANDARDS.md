# ls-pull-video 编程规范 (AI 指令集)

> 本文档是给 AI 模型的指令。规则必须严格遵守，无需解释原因。

---

## 1. 代码风格

### 只能

- 使用 Biome 格式化（tabs、双引号、分号、尾随逗号）
- 文件命名：`kebab-case.ts`
- Node.js 内置模块必须用 `node:` protocol：`import { x } from "node:fs"`
- 导入排序：第三方 → 内置 → 本地（Biome 自动处理）

### 禁止

```ts
// ❌ 错误
import { foo } from "./utils";
import { readFile } from "fs";
const foo: any = 1;

// ✅ 正确
import { foo } from "./utils.js";
import { readFile } from "node:fs";
const foo: unknown = 1;
```

---

## 2. 类型安全

### 只能

- 使用 `unknown` 表示未知类型，配合 Zod 校验
- 开启严格模式（`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`）
- 所有外部输入（req.body、req.query、环境变量）必须用 Zod 校验
- 组件 props 必须定义 interface 或 type

### 禁止

```ts
// ❌ 错误
function foo(x: any) { ... }

// ✅ 正确
function foo(x: unknown, schema: ZodSchema) {
  const validated = schema.parse(x);
}
```

---

## 3. 组件与架构

### 只能

- React：数据获取逻辑上推到 TanStack Query Hooks
- React Router 7：使用 `loader`/`action` 在路由层获取数据
- 三层架构：Controller（解析请求）→ Service（业务逻辑）→ Repository（数据访问）
- 使用工厂函数 `createX()` 创建服务或仓库实例

### 禁止

```ts
// ❌ 错误：业务逻辑写在路由层
app.get("/episodes", async (req, res) => {
  const episodes = await db.query("SELECT * FROM episodes");
  res.json(episodes);
});

// ✅ 正确：路由只负责解析和返回
app.get("/episodes", async (req, res) => {
  const episodes = await episodesRepo.findAll();
  res.json(episodes);
});
```

```tsx
// ❌ 错误：useEffect + fetch 管理服务端状态
function EpisodeList() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/episodes").then(setData);
  }, []);

// ✅ 正确：TanStack Query
function EpisodeList() {
  const { data } = useQuery({ queryKey: ["episodes"], queryFn: fetchEpisodes });
}
```

---

## 4. React 19 规范

### 只能

- 表单使用 `useActionState` + `useFormStatus`
- Promise/Context 使用 `use()` hook
- `ref` 作为普通 prop 传递（React 19 原生支持）
- React List render 必须用稳定唯一 key（禁止数组索引）

### 禁止

```tsx
// ❌ 错误
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => ...);
items.map((item, i) => <div key={i}>...</div>);

// ✅ 正确
function Input({ ref, ...props }: InputProps & { ref: React.Ref<HTMLInputElement> }) { ... }
items.map((item) => <div key={item.id}>...</div>);
```

---

## 5. 错误处理

### 只能

- 异步操作必须 try/catch
- 错误使用结构化对象：`throw { message, code, details }` 或 `new Error()`
- Express 5：直接 throw，交由全局错误处理中间件
- 禁止使用 `console.log`/`console.error`，用 logger 替代

### 禁止

```ts
// ❌ 错误：吞掉错误
async function fetchData() {
  try {
    return await api.get();
  } catch (e) {
    // 静默吞掉！
  }
}

// ✅ 正确
async function fetchData() {
  try {
    return await api.get();
  } catch (e) {
    throw { message: "Fetch failed", code: "FETCH_ERROR", details: e };
  }
}
```

---

## 6. 性能与安全

### 只能

- 耗时操作必须支持 `AbortSignal` 取消
- 使用 `stream.pipeline` 处理流式操作
- 环境变量存储 secrets：`process.env.SECRET`
- AbortController 信号必须传递到所有异步操作

### 禁止

```ts
// ❌ 错误：硬编码密钥
const client = new S3Client({ secretKey: "ak-xxx" });

// ✅ 正确
const client = new S3Client({ secretKey: process.env.R2_SECRET_KEY });
```

```ts
// ❌ 错误：SQL 字符串拼接
db.query(`SELECT * FROM episodes WHERE id = ${id}`);

// ✅ 正确：参数化查询
db.query("SELECT * FROM episodes WHERE id = ?", [id]);
```

---

## 7. 不可变性

### 只能

- 创建新对象，永远不修改现有对象
- 使用展开运算、`Object.freeze()` 或 `readonly` 类型

### 禁止

```ts
// ❌ 错误：修改原对象
function updateUser(user: User, name: string) {
  user.name = name;
  return user;
}

// ✅ 正确：返回新对象
function updateUser(user: User, name: string): User {
  return { ...user, name };
}
```

---

## 8. 无障碍与 UI 规范

### 只能

- SVG 必须有 `title` 元素或 `aria-label`
- Button 必须有 `type` 属性（`type="button"` 或 `type="submit"`）
- 禁止使用非空断言 `!`

### 禁止

```tsx
// ❌ 错误
<button onClick={fn}>Click</button>
<svg><polygon points="..." /></svg>
createRoot(document.getElementById("root")!)

// ✅ 正确
<button type="button" onClick={fn}>Click</button>
<svg><title>Icon</title><polygon points="..." /></svg>
const root = document.getElementById("root");
if (root) createRoot(root).render(...);
```

---

## 9. 测试规范

### 只能

- 测试文件与被测文件同级：`*.test.ts`
- 使用 AAA 模式（Arrange-Act-Assert）
- 每个函数/工具必须存在测试

### 禁止

```ts
// ❌ 错误：缺少测试
// fetchUser 没有任何测试

// ✅ 正确
test("fetchUser returns user when exists", async () => {
  const user = await fetchUser(testDb, "u-123");
  expect(user).toEqual({ id: "u-123", name: "Alice" });
});
```

---

*本规范基于 React 19、TypeScript 5.x、Node.js 22、Express 5、Biome 制定。*
