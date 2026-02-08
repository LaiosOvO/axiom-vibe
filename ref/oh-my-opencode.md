# oh-my-opencode — 参考分析

> 分析日期: 2026-02-09

## 基本信息

| 字段 | 值 |
|------|---|
| 项目名 | oh-my-opencode |
| 仓库 | github.com/code-yeongyu/oh-my-opencode |
| 版本 | 3.2.3 |
| 语言 | TypeScript |
| 运行时 | Bun |
| 定位 | OpenCode 的"增强插件"——多模型编排、并行 Agent、LSP/AST 工具集 |
| 许可 | SUL-1.0 |

## 功能概述

- **Sisyphus 主 Agent**：基于 Opus 4.5 High 的核心编排器
- **多 Agent 团队**：Oracle（架构/调试）、Librarian（文档/代码搜索）、Explore（快速 codebase grep）、Hephaestus（自主深度工作者）、Frontend UI/UX Engineer
- **后台并行 Agent**：多个 agent 同时运行，像真实团队一样工作
- **LSP / AST-Grep 工具**：重构、重命名、诊断、AST 感知代码搜索
- **内置 MCP**：websearch (Exa)、context7 (官方文档)、grep_app (GitHub 搜索)
- **Claude Code 兼容层**：Command、Agent、Skill、MCP、Hook (PreToolUse/PostToolUse/Stop 等)
- **Todo 续航执行器**：强制 agent 完成未完成的任务（Ralph Loop）
- **注释检查器**：防止 AI 添加过多注释
- **Session 工具**：列表、搜索、分析会话历史
- **Tmux 交互终端支持**

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Bun |
| 语言 | TypeScript |
| 插件 SDK | @opencode-ai/plugin + @opencode-ai/sdk |
| LSP | vscode-jsonrpc |
| AST | @ast-grep/napi |
| MCP | @modelcontextprotocol/sdk |
| 验证 | Zod v4 |

## 架构模式

### 插件架构

oh-my-opencode 是 OpenCode 的插件（不是独立应用），通过 `@opencode-ai/plugin` SDK 注入到 OpenCode 运行时中。

### 目录结构

```
oh-my-opencode/
├── src/
│   ├── index.ts              主插件入口（788+ 行）
│   ├── agents/               Agent 定义
│   │   ├── sisyphus           主编排 agent
│   │   ├── oracle             架构/调试顾问
│   │   ├── librarian          外部知识搜索
│   │   ├── explore            快速 codebase grep
│   │   └── hephaestus         自主深度工作者
│   ├── tools/                 LSP/AST 工具集
│   ├── hooks/                 Plugin hooks
│   ├── config/                配置系统
│   ├── mcp/                   内置 MCP 服务
│   ├── features/              Todo 续航、注释检查等
│   ├── cli/                   CLI 入口
│   └── shared/                共享工具
├── bin/                       可执行文件
└── dist/                      构建输出
```

### 核心设计模式

1. **Plugin Hook 系统** — PreToolUse、PostToolUse、UserPromptSubmit、Stop 等钩子
2. **Agent 角色分工** — 每个 Agent 有明确的职责、推荐模型、权限配置
3. **Async Background Tasks** — 后台并行 agent 支持
4. **Context Injection** — 自动注入 AGENTS.md、README.md 等上下文
5. **Category-based Delegation** — 按领域分类委派任务（visual、business-logic 等）

## 对 Axiom 的启示

### 值得借鉴

1. **Agent 角色设计** — Sisyphus/Oracle/Librarian/Explore 的分工模型（Axiom 的 agent-orchestration 直接参考）
2. **Todo 续航机制** — 强制 agent 完成任务的设计（Axiom 的自我成长可以借鉴）
3. **后台并行 Agent** — 多 agent 同时工作的编排模式
4. **Category + Skill 委派** — 按领域自动选择最佳 agent 和 skill
5. **注释检查器** — 保证代码质量的 hook
6. **LSP/AST 工具集** — 安全重构的工具集成
7. **Session 管理** — 会话搜索、分析、继续功能

### 可改进

1. **只是插件** — 依赖 OpenCode 运行时，Axiom 是独立平台
2. **缺少 Spec 驱动** — 没有 spec 文件格式和驱动开发的能力
3. **缺少 Deep Research** — 没有竞品分析和参考文档生成
4. **自我成长有限** — Todo 续航是被动的，不是主动学习模式
5. **配置复杂** — 大量 JSON 配置项，学习成本高
