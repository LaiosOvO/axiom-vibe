# oh-my-opencode-slim — 参考分析

> 分析日期: 2026-02-09

## 基本信息

| 字段 | 值 |
|------|---|
| 项目名 | oh-my-opencode-slim |
| 仓库 | github.com/alvinunreal/oh-my-opencode-slim |
| 版本 | 0.7.0 |
| 语言 | TypeScript |
| 运行时 | Bun |
| 定位 | oh-my-opencode 的轻量级分支——六大 Agent "Pantheon" 编排系统 |
| 许可 | MIT |

## 与 oh-my-opencode 的区别

| 维度 | oh-my-opencode | oh-my-opencode-slim |
|------|----------------|---------------------|
| 定位 | 完整的 Agent 增强套件 | 轻量级 Agent 编排插件 |
| 依赖数 | 较多（commander、js-yaml 等） | 精简（仅核心 SDK + AST） |
| Agent 数 | 5+ (Sisyphus 体系) | 6 (Pantheon 体系) |
| 许可 | SUL-1.0 | MIT |
| 特色 | Ralph Loop、注释检查等 | Pantheon 六神、免费模型支持 |

## 功能概述

### Pantheon 六大 Agent

| Agent | 角色 | 推荐模型 |
|-------|------|----------|
| Orchestrator | 主编排者，战略协调 | kimi-for-coding/k2p5, openai/gpt-5.2-codex |
| Explorer | 代码库侦察 | cerebras/zai-glm-4.7, google/gemini-3-flash |
| Oracle | 架构顾问、最终调试者 | openai/gpt-5.2-codex |
| Librarian | 外部知识检索 | google/gemini-3-flash |
| Designer | UI/UX 实现和视觉卓越 | google/gemini-3-flash |
| Fixer | 快速实现专家 | cerebras/zai-glm-4.7 |

### 其他功能

- 支持 OpenCode 免费模型
- Antigravity + Chutes 提供商支持
- Tmux 集成实时监控
- Cartography 技能（仓库映射 + codemap 生成）
- JSONC 配置支持

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Bun |
| 语言 | TypeScript |
| 插件 SDK | @opencode-ai/plugin + @opencode-ai/sdk |
| LSP | vscode-jsonrpc + vscode-languageserver-protocol |
| AST | @ast-grep/cli |
| MCP | @modelcontextprotocol/sdk |
| 验证 | Zod v4 |
| 代码质量 | Biome |

## 架构模式

### 目录结构

```
oh-my-opencode-slim/
├── src/
│   ├── index.ts              主插件入口
│   ├── agents/               六大 Agent 定义
│   │   ├── orchestrator.ts
│   │   ├── explorer.ts
│   │   ├── oracle.ts
│   │   ├── librarian.ts
│   │   ├── designer.ts
│   │   └── fixer.ts
│   ├── tools/                工具集
│   ├── hooks/                Plugin hooks
│   ├── config/               配置系统
│   ├── mcp/                  MCP 服务
│   ├── cli/                  CLI 安装器
│   └── shared/               共享工具
├── src/skills/               技能文件
└── docs/                     文档
```

### 设计模式

1. **Pantheon Agent 体系** — 六个神话角色的 Agent 分工
2. **模型灵活映射** — 每个 Agent 可配置不同模型（包括免费模型）
3. **LSP 集成** — 完整的 vscode-languageserver-protocol 支持

## 对 Axiom 的启示

### 值得借鉴

1. **Agent 角色神话化** — 用神话角色赋予 Agent 个性和明确职责
2. **模型灵活映射** — 不同 Agent 用不同模型，按能力分配
3. **免费模型支持** — 支持 OpenCode 免费模型降低使用门槛
4. **精简依赖** — 证明轻量级也能实现完整 Agent 编排
5. **Tmux 集成** — 实时监控 Agent 工作状态

### 可改进

1. **同样只是插件** — 不是独立平台
2. **缺少学习机制** — 没有 Foundry 那样的自我进化
3. **缺少 Spec 驱动** — 没有 spec 管理能力
