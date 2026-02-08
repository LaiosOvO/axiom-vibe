# get-shit-done — 参考分析

> 分析日期: 2026-02-09

## 基本信息

| 字段 | 值 |
|------|---|
| 项目名 | GET SHIT DONE (GSD) |
| 仓库 | github.com/glittercowboy/get-shit-done |
| 包名 | get-shit-done-cc (npm) |
| 定位 | 轻量级的元提示、上下文工程和 Spec 驱动开发系统 |
| 许可 | MIT |
| 支持平台 | Claude Code、OpenCode、Gemini CLI |

## 核心理念

**解决上下文腐烂(Context Rot)** — 随着 Claude 填满上下文窗口，质量会退化。GSD 通过结构化的上下文工程解决这个问题。

设计哲学：
- 复杂度在系统内部，不在用户工作流中
- 不做企业级剧场（没有 sprint、story points、Jira）
- 每个计划在全新的上下文窗口中执行（200k tokens 纯用于实现）
- 原子性 Git 提交

## 工作流（6 步）

### 1. 初始化项目 `/gsd:new-project`
提问 → 研究（并行 agent）→ 提取需求 → 创建路线图

### 2. 讨论阶段 `/gsd:discuss-phase N`
分析阶段灰色地带 → 按功能类型提问（UI→布局/密度、API→格式/错误处理）→ 生成 CONTEXT.md

### 3. 规划阶段 `/gsd:plan-phase N`
研究 → 创建 2-3 个原子任务计划(XML) → 验证计划 → 循环直到通过

### 4. 执行阶段 `/gsd:execute-phase N`
按波次并行运行 → 每个计划用全新上下文 → 每个任务原子提交 → 验证目标

### 5. 验证工作 `/gsd:verify-work N`
提取可测试交付物 → 逐个引导用户测试 → 诊断失败 → 创建修复计划

### 6. 重复 → 完成 → 下一个里程碑

## 上下文工程文件

| 文件 | 功能 |
|------|------|
| PROJECT.md | 项目愿景，始终加载 |
| research/ | 生态知识（技术栈、特性、架构、陷阱） |
| REQUIREMENTS.md | 范围化的 v1/v2 需求 |
| ROADMAP.md | 方向和进度 |
| STATE.md | 决策、阻塞、位置——跨会话记忆 |
| PLAN.md | XML 结构的原子任务 |
| SUMMARY.md | 执行总结 |

## XML 任务格式

```xml
<task type="auto">
  <name>创建登录端点</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>
    用 jose 处理 JWT。验证凭据。成功返回 httpOnly cookie。
  </action>
  <verify>curl -X POST localhost:3000/api/auth/login 返回 200 + Set-Cookie</verify>
  <done>有效凭据返回 cookie，无效返回 401</done>
</task>
```

## 多 Agent 编排

| 阶段 | 编排者 | Agent |
|------|--------|-------|
| 研究 | 协调、展示结果 | 4 个并行研究者 |
| 规划 | 验证、管理迭代 | 规划者创建计划、检查者验证 |
| 执行 | 分组波次、跟踪进度 | 执行者并行实现 |
| 验证 | 展示结果、路由 | 验证者检查、调试者诊断 |

## 模型配置

| Profile | 规划 | 执行 | 验证 |
|---------|------|------|------|
| quality | Opus | Opus | Sonnet |
| balanced | Opus | Sonnet | Sonnet |
| budget | Sonnet | Sonnet | Haiku |

## Git 分支策略

- `none` — 提交到当前分支（默认）
- `phase` — 每个阶段一个分支，完成时合并
- `milestone` — 每个里程碑一个分支

## 对 Axiom 的启示

### 值得借鉴

1. **上下文工程** — 结构化文件（PROJECT.md、STATE.md 等）保持 Agent 上下文清晰
2. **XML 任务格式** — 精确的任务定义，内置验证步骤
3. **全新上下文执行** — 每个任务在 200k 全新上下文中执行，避免退化
4. **讨论阶段** — 实现前先捕获用户偏好（灰色地带分析）
5. **原子 Git 提交** — 每个任务一个提交，可 bisect、可回滚
6. **模型 Profile** — quality/balanced/budget 三档预设
7. **Quick Mode** — 不需要完整规划的快速任务路径

### 可改进

1. **不是独立平台** — 只是 Agent 指令系统，依赖宿主
2. **Slash Command 方式** — Axiom 应将这些工作流内化为引擎功能
3. **缺少自我成长** — 没有学习机制
4. **手动验证** — UAT 需要用户手动测试，Axiom 应有自动化验收
5. **文件散落** — 大量 md 文件在 .planning/ 目录，Axiom 用 spec 文件夹更有序
