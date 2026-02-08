# Axiom

> AI 驱动的编码 Agent 平台

## 简介

Axiom 是一个完全从零实现的开源 AI 编码 Agent 平台。

### 核心特性

- **Spec 驱动开发** — 每个需求都有对应的 spec 文件，带进度追踪和验收标准
- **Deep Research** — 规划阶段自动搜索竞品、GitHub 仓库，形成参考文档
- **自我成长** — 记录用户模式和偏好，积累为 skill/prompt
- **Agent 编排** — 预设核心 Agent + 支持动态创建自定义 Agent
- **多客户端** — TUI 终端 + Desktop 桌面应用 + VSCode 插件

## 快速开始

### 安装

```bash
# 全局安装
bun install -g @axiom-ai/cli

# 或直接运行
bunx axiom
```

### 使用

```bash
# 进入项目目录
cd your-project

# 启动交互模式
axiom

# Headless 模式
axiom run "实现登录功能"

# 启动服务器模式（供 Desktop/VSCode 连接）
axiom serve
```

## 项目结构

```
axiom/
├── packages/
│   ├── core/       核心引擎（CLI + Server + Agent + Tools）
│   ├── app/        TUI 前端（SolidJS）
│   ├── ui/         共享 UI 组件库
│   ├── desktop/    桌面应用（Tauri）
│   ├── vscode/     VSCode 插件
│   ├── sdk/        客户端 SDK
│   ├── plugin/     Plugin SDK
│   └── util/       共享工具库
├── specs/          Spec 规格文件
├── progress/       进度追踪
├── ref/            Deep Research 参考文档
└── docs/           用户文档（中文）
```

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Bun |
| 语言 | TypeScript (ESM) |
| AI SDK | Vercel AI SDK |
| HTTP 框架 | Hono |
| TUI 前端 | SolidJS |
| 桌面应用 | Tauri |
| 数据验证 | Zod v4 |
| 测试框架 | bun:test + Playwright |
| 包管理 | Bun workspaces + Turborepo |

## 开发

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 构建
bun run build

# 类型检查
bun run typecheck

# 测试
bun run test

# 代码检查
bun run lint
```

## 许可证

MIT
