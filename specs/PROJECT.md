# Axiom — 项目总览

> 版本: 0.1.0 | 状态: 规划中 | 最后更新: 2026-02-08

## 项目定位

Axiom 是一个**完全从零实现**的开源 AI 编码 agent 平台，定位为 OpenCode 的增强替代品。

核心差异点：
- **Spec 驱动开发**：每个需求都有对应的 spec 文件，带进度追踪和验收标准
- **Deep Research**：规划阶段自动搜索竞品、GitHub 仓库、形成参考文档
- **自我成长**：记录用户模式和偏好，积累为 skill/prompt，用户可选择是否采纳
- **Agent 编排**：预设核心 agent + 支持动态创建自定义 agent（选择 MCP、skills）
- **多客户端**：TUI 终端 + Desktop 桌面应用 + VSCode 插件 → 最终目标是独立 IDE

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Bun |
| 语言 | TypeScript (ESM) |
| AI SDK | Vercel AI SDK (`ai` 包) |
| HTTP 框架 | Hono |
| TUI 前端 | SolidJS + OpenTUI（参考 opencode） |
| 桌面应用 | Tauri（后期） |
| VSCode 插件 | VSCode Extension API（后期） |
| 数据验证 | Zod v4 |
| CLI 解析 | yargs |
| 数据存储 | JSON 文件 |
| 测试框架 | bun:test + Playwright（E2E） |
| 包管理 | Bun workspaces + Turborepo |

## 架构设计

```
┌──────────────────────────────────────────────────────────────────┐
│                       客户端层                                    │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐       │
│  │  TUI    │  │ Desktop  │  │ VSCode 插件 │  │ CLI(run) │       │
│  │ SolidJS │  │  Tauri   │  │ Extension   │  │ headless │       │
│  └────┬────┘  └────┬─────┘  └─────┬──────┘  └────┬─────┘       │
│       └────────────┴──────────────┴───────────────┘              │
│                          SDK (HTTP + SSE)                         │
├──────────────────────────────────────────────────────────────────┤
│                    Hono HTTP Server                               │
│  路由: /session /agent /provider /spec /research /config ...     │
├──────────────────────────────────────────────────────────────────┤
│                       核心引擎层                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              Session Prompt Loop (主循环)                 │     │
│  │  用户消息 → resolveTools → LLM.stream → Processor        │     │
│  │                               ↓            ↓            │     │
│  │                          tool-call    消息存储            │     │
│  │                               ↓                          │     │
│  │                         Tool 执行层                       │     │
│  │                    bash/edit/read/task...                 │     │
│  │                    + MCP tools + 自定义 tools             │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
│  │ Provider │ │  Agent   │ │  Skill   │ │   Plugin     │       │
│  │  (20+)   │ │ 编排系统  │ │  (.md)   │ │   (hooks)    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘       │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
│  │ Spec引擎 │ │ Research │ │ Growth   │ │ GitHub搜索   │       │
│  │  进度管理 │ │ 深度研究  │ │ 自我成长  │ │  独立接口     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘       │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
│  │ Storage  │ │   LSP    │ │   Bus    │ │    MCP       │       │
│  │  (JSON)  │ │ servers  │ │  (事件)   │ │  servers     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘       │
├──────────────────────────────────────────────────────────────────┤
│                    验收 & 测试层                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐                │
│  │ 单元测试  │ │ 集成测试  │ │ E2E 浏览器测试    │                │
│  │ bun:test │ │ bun:test │ │ Playwright/浏览器  │                │
│  └──────────┘ └──────────┘ └──────────────────┘                │
└──────────────────────────────────────────────────────────────────┘
```

## Monorepo 包结构

```
axiom/
├── packages/
│   ├── core/              核心引擎（CLI + Server + Agent + Tools）
│   ├── app/               TUI 前端（SolidJS + OpenTUI）
│   ├── ui/                共享 UI 组件库
│   ├── desktop/           桌面应用（Tauri）
│   ├── vscode/            VSCode 插件
│   ├── sdk/               客户端 SDK
│   ├── plugin/            Plugin SDK（供第三方开发）
│   └── util/              共享工具库
├── specs/                 Spec 文件（OpenSpec 格式）
│   ├── PROJECT.md         本文件
│   ├── core/              核心功能 spec
│   │   ├── 00-project-init/
│   │   │   ├── requirement.md
│   │   │   ├── design.md
│   │   │   ├── tasks.md
│   │   │   └── ref/
│   │   ├── 01-config-system/
│   │   │   └── ...
│   │   └── ...
│   ├── features/          特色功能 spec
│   │   ├── 01-spec-engine/
│   │   │   └── ...
│   │   └── ...
│   └── clients/           客户端 spec
│       ├── 01-tui-app/
│       │   └── ...
│       └── ...
├── progress/              进度追踪
│   └── PROGRESS.md        总进度纵览
├── ref/                   Deep Research 参考文档
├── docs/                  用户文档（中文）
├── .axiom/                Axiom 自身配置
├── turbo.json
├── package.json
└── tsconfig.json
```

## 核心设计原则

1. **Namespace 模式**：参考 opencode，所有模块用 `export namespace X` 组织
2. **Instance.state()**：惰性初始化 + 自动清理的依赖注入
3. **Bus 事件驱动**：模块间通过事件总线通信
4. **Zod Schema 驱动**：所有数据结构用 Zod 定义
5. **Plugin Hooks**：关键路径通过 Plugin.trigger() 注入自定义逻辑
6. **Spec 即规范**：每个功能都有对应 spec → 测试 → 实现的闭环

## 使用方式

```bash
# 安装
npm install -g @axiom-ai/cli
# 或
bunx axiom

# 进入项目目录后启动
cd your-project
axiom

# headless 模式
axiom run "实现登录功能"

# 启动服务器模式（供 Desktop/VSCode 连接）
axiom serve
```

## 开发工作流

遵循 superpowers 规范：
1. **brainstorm** — 收到需求先问清楚，拆分需求
2. **分析现有 spec** — 检查已有 spec 文件，生成新的 spec
3. **deep research** — 搜索竞品和 GitHub 仓库
4. **write-plan** — 拆分为可执行的小任务
5. **TDD** — 先写测试再实现
6. **execute** — 子 agent 并行执行
7. **验收** — 单元测试 + 集成测试 + 浏览器 E2E
