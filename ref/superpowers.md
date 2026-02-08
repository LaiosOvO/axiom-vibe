# superpowers — 参考分析

> 分析日期: 2026-02-09

## 基本信息

| 字段 | 值 |
|------|---|
| 项目名 | Superpowers |
| 仓库 | github.com/obra/superpowers |
| 作者 | Jesse Vincent (obra) |
| 定位 | 编码 Agent 的完整软件开发工作流——可组合"技能"系统 |
| 许可 | MIT |
| 支持平台 | Claude Code、Codex、OpenCode |

## 核心理念

Superpowers 不是一个 Agent 或平台，而是一套 **可组合的"技能"(Skills)**，让 Agent 自动遵循最佳软件工程实践。

核心哲学：
- **TDD 优先** — 先写测试，永远
- **系统化胜过即兴** — 流程胜过猜测
- **复杂度削减** — 简单性是首要目标
- **证据胜过声明** — 验证后才能宣布成功

## 工作流（7 步）

| 步骤 | 技能 | 触发时机 |
|------|------|----------|
| 1. 头脑风暴 | brainstorming | 写代码之前 |
| 2. Git Worktree | using-git-worktrees | 设计批准后 |
| 3. 写计划 | writing-plans | 有批准设计后 |
| 4. 子 Agent 驱动开发 | subagent-driven-development / executing-plans | 有计划后 |
| 5. TDD | test-driven-development | 实现过程中 |
| 6. 代码审查 | requesting-code-review | 任务之间 |
| 7. 完成分支 | finishing-a-development-branch | 所有任务完成后 |

**Agent 在每个任务前检查相关技能。强制执行的工作流，不是建议。**

## 技能库（14 个技能）

### 测试
- **test-driven-development** — RED-GREEN-REFACTOR 循环（含测试反模式参考）

### 调试
- **systematic-debugging** — 4 阶段根因分析
- **verification-before-completion** — 确保真正修复了

### 协作
- **brainstorming** — 苏格拉底式设计优化
- **writing-plans** — 详细实现计划
- **executing-plans** — 批量执行 + 检查点
- **dispatching-parallel-agents** — 并发子 Agent 工作流
- **requesting-code-review** — 提交前检查清单
- **receiving-code-review** — 回应反馈
- **using-git-worktrees** — 并行开发分支
- **finishing-a-development-branch** — 合并/PR 决策工作流
- **subagent-driven-development** — 快速迭代 + 两阶段审查

### 元技能
- **writing-skills** — 创建新技能的指南
- **using-superpowers** — 技能系统入门

## Agent 定义

```
agents/
└── code-reviewer.md    — 唯一预设 Agent：代码审查专家
```

## 架构

```
superpowers/
├── skills/              14 个技能目录
│   ├── brainstorming/
│   ├── test-driven-development/
│   ├── systematic-debugging/
│   ├── writing-plans/
│   ├── executing-plans/
│   ├── subagent-driven-development/
│   └── ...
├── agents/              Agent 定义
│   └── code-reviewer.md
├── commands/            Slash 命令
├── hooks/               Plugin hooks
├── lib/                 共享库
├── docs/                文档
└── tests/               测试
```

### 技能格式

每个技能是一个目录，包含 `SKILL.md` 文件，定义：
- 触发条件
- 工作流步骤
- 约束和规则

## 对 Axiom 的启示

### 直接借鉴（Axiom 已使用 Superpowers 工作流规范）

1. **Skills 系统** — Axiom 的 spec 驱动开发直接参考 Superpowers 的 brainstorming → plan → execute → review 工作流
2. **TDD 强制执行** — Axiom 的每个 SPEC 实现都遵循 TDD
3. **子 Agent 驱动开发** — Axiom 的 agent-orchestration 参考 subagent-driven-development
4. **代码审查流程** — 两阶段审查（spec 合规 + 代码质量）
5. **Git Worktree 隔离** — 每个 feature 在独立 worktree 中开发

### 可扩展

1. **缺少 Deep Research** — Superpowers 不做竞品搜索和参考文档生成
2. **缺少自我成长** — 没有学习和进化机制
3. **缺少 Spec 管理** — 没有 spec 文件格式和引擎
4. **Agent 太少** — 只有 code-reviewer 一个预设 Agent，Axiom 需要更多
5. **不是独立平台** — 依赖宿主 Agent（Claude Code / OpenCode），Axiom 是独立的
