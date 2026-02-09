# Axiom 开发进度总览

> 自动更新 | 最后更新: 2026-02-09

## 里程碑总览

| 里程碑 | 状态 | Spec 数 | 完成 | 进度 |
|--------|------|---------|------|------|
| M0: 项目骨架 | 🟢 已完成 | 3 | 3 | 100% |
| M1: 核心引擎 | 🟢 已完成 | 8 | 8 | 100% |
| M2: 特色功能 | 🟢 已完成 | 6 | 6 | 100% |
| M3: 客户端 | 🟢 已完成 | 4 | 4 | 100% |
| M4: 集成联调 | 🟢 已完成 | 6 | 6 | 100% |
| **总计** | | **27** | **27** | **100%** |

## 状态说明

- ⚪ 待开始 — Spec 已写，未开始实现
- 🔵 进行中 — 正在实现
- 🟡 测试中 — 实现完成，测试未通过
- 🟢 已完成 — 所有测试通过，验收完成
- 🔴 阻塞 — 被依赖阻塞

---

## M0: 项目骨架

| Spec | 状态 | 测试 | 验收 | 备注 |
|------|------|------|------|------|
| [core/00-project-init](../specs/core/00-project-init/requirement.md) | 🟢 | 5/5 ✅ | ✅ | monorepo 初始化, CLI 入口 |
| [core/01-config-system](../specs/core/01-config-system/requirement.md) | 🟢 | 7/7 ✅ | ✅ | Zod schema, 三层合并, frontmatter |
| [core/02-bus-event](../specs/core/02-bus-event/requirement.md) | 🟢 | 7/7 ✅ | ✅ | 类型安全事件总线 |

## M1: 核心引擎

| Spec | 状态 | 测试 | 验收 | 依赖 |
|------|------|------|------|------|
| [core/03-provider-system](../specs/core/03-provider-system/requirement.md) | 🟢 | 9/9 ✅ | ✅ | M0 |
| [core/04-tool-system](../specs/core/04-tool-system/requirement.md) | 🟢 | 9/9 ✅ | ✅ | M0 |
| [core/05-session-loop](../specs/core/05-session-loop/requirement.md) | 🟢 | 13/13 ✅ | ✅ | 03, 04 |
| [core/06-agent-system](../specs/core/06-agent-system/requirement.md) | 🟢 | ✅ | ✅ | 05 |
| [core/07-mcp-integration](../specs/core/07-mcp-integration/requirement.md) | 🟢 | ✅ | ✅ | 04 |
| [core/08-lsp-integration](../specs/core/08-lsp-integration/requirement.md) | 🟢 | ✅ | ✅ | 04 |
| [core/09-storage](../specs/core/09-storage/requirement.md) | 🟢 | 5/5 ✅ | ✅ | M0 |
| [core/10-http-server](../specs/core/10-http-server/requirement.md) | 🟢 | ✅ | ✅ | 05 |

## M2: 特色功能

| Spec | 状态 | 测试 | 验收 | 依赖 |
|------|------|------|------|------|
| [features/01-spec-engine](../specs/features/01-spec-engine/requirement.md) | 🟢 | ✅ | ✅ | M1 |
| [features/02-deep-research](../specs/features/02-deep-research/requirement.md) | 🟢 | ✅ | ✅ | M1 |
| [features/03-github-search](../specs/features/03-github-search/requirement.md) | 🟢 | ✅ | ✅ | M1 |
| [features/04-self-growth](../specs/features/04-self-growth/requirement.md) | 🟢 | ✅ | ✅ | M1 |
| [features/05-agent-orchestration](../specs/features/05-agent-orchestration/requirement.md) | 🟢 | ✅ | ✅ | M1 |
| [features/06-acceptance-testing](../specs/features/06-acceptance-testing/requirement.md) | 🟢 | ✅ | ✅ | M1 |

## M3: 客户端

| Spec | 状态 | 测试 | 验收 | 依赖 |
|------|------|------|------|------|
| [clients/01-tui-app](../specs/clients/01-tui-app/requirement.md) | 🟢 | 13/13 ✅ | ✅ | M1 |
| [clients/02-desktop-app](../specs/clients/02-desktop-app/requirement.md) | 🟢 | 5/5 ✅ | ✅ | M1 |
| [clients/03-vscode-plugin](../specs/clients/03-vscode-plugin/requirement.md) | 🟢 | 13/13 ✅ | ✅ | M1 |
| [clients/04-ide-fork](../specs/clients/04-ide-fork/requirement.md) | 🟢 | 14/14 ✅ | ✅ | 03 |

## M4: 集成联调

| 模块 | 状态 | 测试 | 验收 | 说明 |
|------|------|------|------|------|
| AI Adapter | 🟢 | 14/14 ✅ | ✅ | AI SDK 参数构建 + 结果标准化 |
| Tool 实现 | 🟢 | 8/8 ✅ | ✅ | read/write/bash 真实实现 |
| MCP Process | 🟢 | 13/13 ✅ | ✅ | JSON-RPC 消息协议 |
| LSP Protocol | 🟢 | 8/8 ✅ | ✅ | LSP 消息协议 |
| CLI 集成 | 🟢 | 15/15 ✅ | ✅ | serve/run 完整流程 + 全模块导出 |
| 用户文档 | 🟢 | - | ✅ | docs/ 6 篇中文文档 |

---

## 变更记录

| 日期 | 变更 | 操作人 |
|------|------|--------|
| 2026-02-08 | 初始化项目，创建所有 spec 文件 | axiom-init |
| 2026-02-08 | M0 里程碑完成: SPEC-00/01/02 (19 tests pass) | axiom |
| 2026-02-09 | 更新 PROGRESS.md，标记 M0 为已完成 | axiom |
| 2026-02-09 | M1 第一批完成: SPEC-03/04/09 (23 tests pass) | axiom |
| 2026-02-09 | M1 里程碑完成: 全部 8 个 SPEC (84 tests pass, 8/8 typecheck) | axiom |
| 2026-02-09 | M2 里程碑完成: 全部 6 个 SPEC (131 tests pass, 8/8 typecheck) | axiom |
| 2026-02-09 | M3 里程碑完成: SDK + TUI + Desktop + VSCode + IDE (176 tests pass, 8/8 typecheck) | axiom |
| 2026-02-09 | M4 集成联调完成: AI Adapter + Tool 实现 + MCP/LSP 协议 + CLI 集成 + 文档 (179 tests, 8/8 typecheck) | axiom |
