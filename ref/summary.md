# 竞品参考总结

> 分析日期: 2026-02-09

## 参考项目总览

| 项目 | 类型 | 核心能力 | 对 Axiom 的价值 |
|------|------|----------|-----------------|
| [opencode](opencode.md) | 独立平台 | 完整 AI 编码 Agent（40+ 工具、Client/Server） | 整体架构参考（Namespace、Bus、Provider） |
| [oh-my-opencode](oh-my-opencode.md) | OpenCode 插件 | 多 Agent 编排、LSP/AST 工具、后台 Agent | Agent 角色设计、Category 委派 |
| [oh-my-opencode-slim](oh-my-opencode-slim.md) | OpenCode 插件 | 轻量级 Pantheon 六 Agent 编排 | Agent 灵活映射、模型分配策略 |
| [openclaw-foundry](openclaw-foundry.md) | OpenClaw 扩展 | 自我进化、工作流学习、模式结晶化 | self-growth 核心设计 |
| [superpowers](superpowers.md) | Skill 系统 | 14 个可组合技能、TDD 工作流 | 开发工作流规范 |
| [get-shit-done](get-shit-done.md) | 指令系统 | 上下文工程、Spec 驱动、原子任务 | 上下文管理、任务格式 |
| [OpenSpec](openspec.md) | Spec 框架 | Artifact-Guided 工作流、变更文件夹 | spec-engine 格式定义 |

## 功能矩阵

| 功能 | opencode | OMO | OMO-slim | Foundry | Superpowers | GSD | OpenSpec | **Axiom** |
|------|----------|-----|----------|---------|-------------|-----|---------|-----------|
| 独立平台 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| 多 Provider | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| 工具系统 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Agent 编排 | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ✅ | ❌ | ✅ |
| TUI 界面 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Desktop 应用 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| MCP 集成 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| LSP 集成 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Spec 驱动 | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| Deep Research | ❌ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | ✅ |
| 自我成长 | ❌ | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| TDD 工作流 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| 上下文工程 | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 验收测试 | ❌ | ❌ | ❌ | ⚠️ | ✅ | ⚠️ | ❌ | ✅ |

> ✅ 完整支持 | ⚠️ 部分支持 | ❌ 不支持

## Axiom 的竞争优势

### 1. 唯一的"全栈 AI 编码 Agent"

没有其他项目同时具备：独立平台 + 多 Provider + Spec 驱动 + Deep Research + 自我成长 + Agent 编排 + 验收测试。

### 2. 融合最佳实践

| 借鉴来源 | Axiom 融合的能力 |
|----------|-----------------|
| opencode | 架构模式（Namespace + Bus + Provider + Hono） |
| oh-my-opencode | Agent 角色设计、Category 委派、后台并行 |
| openclaw-foundry | 自我成长（工作流追踪 → 模式学习 → 技能生成） |
| superpowers | TDD 工作流、代码审查流程 |
| get-shit-done | 上下文工程、XML 任务格式、原子提交 |
| OpenSpec | Spec 文件夹格式、Artifact-Guided 工作流 |

### 3. 差异化功能

1. **Deep Research** — 规划阶段自动搜索竞品、GitHub 仓库，生成 ref/ 参考文档
2. **自我成长** — 从 Foundry 借鉴的 Observe → Learn → Write 循环，但更实用
3. **Spec 引擎** — 内置的 spec 管理，不是外部工具
4. **验收测试** — 自动化验收（单元 + 集成 + E2E），不是手动 UAT
5. **多客户端** — TUI + Desktop (Tauri) + VSCode 插件 + 独立 IDE

## 技术栈对比

| 维度 | opencode | Axiom |
|------|----------|-------|
| 运行时 | Bun | Bun |
| 语言 | TypeScript | TypeScript |
| AI SDK | Vercel AI SDK | Vercel AI SDK |
| HTTP | Hono | Hono |
| 验证 | Zod v4 | Zod v4 |
| TUI | SolidJS | SolidJS |
| Desktop | Tauri | Tauri |
| 构建 | Turborepo | Turborepo |
| 测试 | Playwright | bun:test + Playwright |

技术栈高度一致，确保 Axiom 可以直接参考 opencode 的实现模式。

## 总结

Axiom 站在 7 个参考项目的肩膀上，取各家之长：

- **opencode 的架构** — 成熟的 Monorepo + Namespace + Bus + Client/Server
- **oh-my-opencode 的 Agent 编排** — 角色分工 + 并行执行 + Category 委派
- **Foundry 的自我进化** — 工作流学习 → 模式结晶 → 能力生成
- **Superpowers 的工程纪律** — TDD + 代码审查 + 系统化工作流
- **GSD 的上下文管理** — 结构化文件 + 全新上下文执行 + 原子提交
- **OpenSpec 的 Spec 框架** — 变更文件夹 + Artifact-Guided 工作流

这使得 Axiom 成为目前市场上功能最全面的开源 AI 编码 Agent 平台。
