# opencode — 参考分析

> 分析日期: 2026-02-09

## 基本信息

| 字段 | 值 |
|------|---|
| 项目名 | opencode |
| 本地路径 | /Volumes/T7/workspace/company/ai/ai_roadmap/self-dev/tui/laios-tui/agent/opencode |
| 语言 | TypeScript |
| 运行时 | Bun 1.3.5 |
| 定位 | 开源 AI 编码 Agent（Claude Code 替代品） |

## 功能概述

- 多 Provider 支持（Anthropic、OpenAI、Google、本地模型）
- 40+ 内置工具（bash、read、write、edit、grep、glob、apply_patch 等）
- TUI 终端界面（SolidJS）+ Desktop 桌面应用（Tauri）
- Client/Server 架构（TUI 只是其中一个客户端）
- LSP 语言服务器支持
- MCP 模型上下文协议集成
- Plugin 插件系统
- 会话管理和持久化
- 12 种语言国际化
- 30+ TUI 配色主题

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Bun 1.3.5 |
| 语言 | TypeScript 5.8.2 |
| AI SDK | Vercel AI SDK 5.0.119 |
| HTTP | Hono 4.10.7 |
| TUI | SolidJS 1.9.10 |
| Desktop | Tauri |
| 验证 | Zod 4.1.8 |
| 构建 | Turborepo 2.5.6 |
| 测试 | Playwright 1.51.0 |
| 前端 | Vite 7.1.4 + TailwindCSS 4.1.11 |

## 架构模式

### Monorepo 结构
11 个包：opencode(核心)、app(Web前端)、web(文档站)、desktop(桌面)、ui(组件库)、plugin、sdk/js、console、slack、script、util

### 核心设计模式
1. **Namespace 模式** — 所有模块用 `export namespace X { }` 组织
2. **Instance.state()** — 惰性初始化 + 自动清理的依赖注入
3. **Bus 事件驱动** — 模块间通过事件总线通信
4. **Zod Schema 驱动** — 所有数据结构用 Zod 定义和验证
5. **Plugin Hooks** — 关键路径通过 Plugin.trigger() 注入自定义逻辑

## 目录结构

```
opencode/
├── packages/
│   ├── opencode/src/     核心引擎（30+ 模块）
│   │   ├── agent/        Agent 系统
│   │   ├── session/      会话管理 + LLM 交互
│   │   ├── tool/         40+ 工具
│   │   ├── provider/     多 Provider 支持
│   │   ├── server/       Hono HTTP 服务
│   │   ├── bus/          事件总线
│   │   ├── config/       配置管理
│   │   ├── lsp/          LSP 集成
│   │   ├── mcp/          MCP 集成
│   │   ├── cli/tui/      终端 UI (SolidJS)
│   │   └── plugin/       插件系统
│   ├── app/              Web 前端 (SolidJS + Vite)
│   ├── desktop/          桌面应用 (Tauri)
│   ├── ui/               89+ UI 组件
│   └── sdk/js/           JavaScript SDK
├── tutorial/             13 篇教程
└── turbo.json
```

## 可借鉴的设计

1. **Namespace 模式** — 代码组织清晰，避免大量 import/export
2. **Client/Server 分离** — HTTP + SSE 架构，支持多客户端
3. **Bus 事件系统** — 松耦合模块通信
4. **Zod Schema 驱动** — 运行时类型安全
5. **Plugin Hooks** — 可扩展的插件机制
6. **Session Loop** — 用户消息 → resolveTools → LLM.stream → Processor 的主循环设计

## 优缺点

### 优点
- 100% 开源，不绑定特定 Provider
- 架构成熟（Namespace + Bus + Plugin）
- Client/Server 分离，可远程驱动
- TUI 体验出色（neovim 风格）
- 完整的教程和文档体系

### 缺点
- 代码量庞大，学习曲线陡
- 没有 Spec 驱动开发能力
- 缺乏自我成长/学习机制
- 没有深度研究（Deep Research）功能
- Agent 编排能力有限（仅 build/plan 两个内置 agent）

## 对 Axiom 的启示

Axiom 的**整体架构**直接参考 opencode：
- Monorepo 结构（packages/ 分包）
- Namespace 模式（`export namespace X`）
- Bus 事件驱动（发布/订阅 + Zod 验证）
- Client/Server 分离（Hono HTTP + SSE）
- 技术栈选型（Bun + TypeScript + Zod + Hono + SolidJS）

Axiom 在此基础上增加了 opencode 缺失的：Spec 引擎、Deep Research、自我成长、Agent 编排。
