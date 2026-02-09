# 模块详解

## 包结构

```
axiom/
├── packages/
│   ├── core/       核心引擎（20 个模块）
│   ├── sdk/        客户端 SDK
│   ├── app/        TUI 前端
│   ├── desktop/    桌面应用
│   ├── vscode/     VSCode 插件
│   ├── ui/         共享 UI 组件库
│   ├── plugin/     Plugin SDK
│   └── util/       共享工具库
```

## packages/core — 核心引擎

核心引擎包含所有业务逻辑，是 Axiom 的大脑。

### 基础设施

| 模块 | 文件 | 说明 |
|------|------|------|
| CLI 入口 | `src/index.ts` | 命令解析、模块导出、serve/run 处理 |
| Config | `src/config/index.ts` | 三层配置合并（默认/全局/项目） |
| Bus | `src/bus/index.ts` | 类型安全的事件总线 |
| Storage | `src/storage/index.ts` | JSON 文件持久化 |

### AI 引擎

| 模块 | 文件 | 说明 |
|------|------|------|
| Provider | `src/provider/index.ts` | 15 个 LLM Provider 注册管理 |
| AiAdapter | `src/provider/adapter.ts` | AI SDK 参数构建和结果标准化 |
| Session | `src/session/index.ts` | 会话 + 消息管理 |
| Agent | `src/agent/index.ts` | 6 个内置 Agent 注册管理 |

### 工具系统

| 模块 | 文件 | 说明 |
|------|------|------|
| Tool | `src/tool/index.ts` | 工具定义工厂 + 注册表 |
| McpServer | `src/mcp/index.ts` | MCP 服务器配置管理 |
| McpProcess | `src/mcp/process.ts` | JSON-RPC 消息协议 |
| LspServer | `src/lsp/index.ts` | LSP 服务器配置管理 |
| LspProtocol | `src/lsp/protocol.ts` | LSP 消息协议 |

### HTTP 服务

| 模块 | 文件 | 说明 |
|------|------|------|
| Server | `src/server/index.ts` | Hono REST API（session CRUD + message） |

### 特色功能

| 模块 | 文件 | 说明 |
|------|------|------|
| SpecEngine | `src/spec/index.ts` | Spec 驱动开发：frontmatter 解析、进度追踪 |
| Research | `src/research/index.ts` | Deep Research：搜索查询生成、报告格式化 |
| GitHubSearch | `src/github/index.ts` | GitHub 搜索：查询构建、排序、去重、缓存 |
| Growth | `src/growth/index.ts` | 自我成长：模式记录、进化建议、Skill 生成 |
| Orchestrator | `src/orchestrator/index.ts` | Agent 编排：预设 Profile、动态创建、依赖调度 |
| Acceptance | `src/acceptance/index.ts` | 验收测试：标准解析、结果聚合、报告格式化 |

## packages/sdk — 客户端 SDK

提供 HTTP 客户端，封装所有 API 调用。

| 模块 | 说明 |
|------|------|
| AxiomClient | fetch 封装，支持 health/sessions/messages 操作 |

```typescript
const client = AxiomClient.create({ baseUrl: 'http://127.0.0.1:4096' })
await client.health()
await client.sessions.list()
await client.messages.send(sessionId, content)
```

## packages/app — TUI 前端

终端界面消息渲染。

| 模块 | 说明 |
|------|------|
| MessageRenderer | 消息格式化：角色前缀、代码块、系统信息 |

## packages/desktop — 桌面应用

基于 Tauri 的桌面应用配置。

| 模块 | 说明 |
|------|------|
| DesktopApp | Tauri 配置生成：窗口尺寸、主题、端口 |
| IdeConfig | IDE Fork 元数据：产品信息、构建目标 |

## packages/vscode — VSCode 插件

VSCode 插件配置和命令注册。

| 模块 | 说明 |
|------|------|
| VscodePlugin | 命令注册、contributes 生成、快捷键配置 |

默认命令：打开面板、新建会话、发送消息、切换面板。

## packages/ui — 共享 UI 组件库

基于 SolidJS 的可复用 UI 组件。未来将包含 Button、Dialog、Input 等通用组件。

## packages/plugin — Plugin SDK

插件开发 SDK。允许第三方开发者扩展 Axiom 功能。

## packages/util — 共享工具库

跨包共享的工具函数。
