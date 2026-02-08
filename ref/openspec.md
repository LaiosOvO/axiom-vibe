# OpenSpec — 参考分析

> 分析日期: 2026-02-09

## 基本信息

| 字段 | 值 |
|------|---|
| 项目名 | OpenSpec |
| 仓库 | github.com/Fission-AI/OpenSpec |
| 包名 | @fission-ai/openspec (npm) |
| 语言 | TypeScript |
| 运行时 | Node.js (≥20.19.0) |
| 构建 | pnpm + Vitest |
| 定位 | AI 编码 Agent 的 Spec 框架——同意再构建 |
| 许可 | MIT |

## 核心理念

**"Agree before you build"** — 在写代码之前，人类和 AI 先对 Spec 达成一致。

设计哲学：
- 流动而非僵化
- 迭代而非瀑布
- 简单而非复杂
- 为棕地项目设计，不仅仅是绿地
- 从个人项目到企业可扩展

## 工作流

### Artifact-Guided 工作流 (`/opsx` 命令)

```
/opsx:new add-dark-mode    → 创建变更文件夹
/opsx:ff                   → 快进：生成 proposal + specs + design + tasks
/opsx:apply                → 实现所有任务
/opsx:archive              → 归档到 archive/
```

### 文件夹结构

每个变更是一个独立文件夹：

```
openspec/
├── changes/
│   ├── add-dark-mode/
│   │   ├── proposal.md    — 为什么做、改什么
│   │   ├── specs/         — 需求和场景
│   │   ├── design.md      — 技术方案
│   │   └── tasks.md       — 实现清单
│   └── archive/           — 已完成的变更
├── spec/                  — 项目级 spec
└── openspec.json          — 配置
```

### Spec 文件格式

#### proposal.md
- 变更原因
- 影响范围
- 替代方案

#### specs/
- 需求定义
- 验收场景（Given-When-Then）
- 边界条件

#### design.md
- 技术方案
- 接口设计
- 数据结构
- 依赖关系

#### tasks.md
- 实现任务清单（可勾选）
- 按优先级和依赖排序

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Node.js ≥ 20.19.0 |
| 语言 | TypeScript |
| 构建 | pnpm |
| 测试 | Vitest |
| CLI | 自定义 CLI (openspec init / update) |
| 配置 | openspec.json |

## 目录结构

```
OpenSpec/
├── src/
│   ├── cli/           CLI 入口
│   ├── commands/      命令实现
│   ├── core/          核心逻辑
│   ├── prompts/       AI 提示模板
│   ├── telemetry/     匿名使用统计
│   ├── ui/            终端 UI
│   └── utils/         工具函数
├── openspec/          Slash 命令和技能
├── schemas/           JSON Schema
├── test/              测试
├── docs/              文档
└── scripts/           构建脚本
```

## Slash 命令

| 命令 | 功能 |
|------|------|
| /opsx:onboard | 入门引导 |
| /opsx:new | 创建新变更 |
| /opsx:ff | 快进生成所有文档 |
| /opsx:apply | 实现任务 |
| /opsx:archive | 归档已完成变更 |
| /opsx:diff | 查看变更差异 |
| /opsx:status | 查看状态 |

## 竞品对比

| 维度 | OpenSpec | Spec Kit (GitHub) | Kiro (AWS) |
|------|---------|-------------------|------------|
| 灵活性 | 高（无阶段门禁） | 低（严格阶段） | 中 |
| 工具锁定 | 无（20+ 工具） | 无 | 锁定 IDE |
| 模型支持 | 任意 | 任意 | 仅 Claude |
| 安装 | npm | Python | IDE 内置 |

## 对 Axiom 的启示

### 直接参考（Axiom 的 spec-engine 基于 OpenSpec 理念）

1. **变更即文件夹** — 每个 spec 变更是一个独立文件夹（proposal + specs + design + tasks），Axiom 直接采用
2. **Artifact-Guided 工作流** — new → ff → apply → archive 的线性流程
3. **Slash 命令驱动** — 用简单命令触发复杂工作流
4. **归档机制** — 完成的变更归档但不删除，保留历史
5. **多工具支持** — 不锁定特定 Agent/IDE

### Axiom 的差异化

1. **Axiom 用 requirement.md + design.md + tasks.md 替代 OpenSpec 的 proposal + specs + design + tasks**
2. **Axiom 增加 ref/ 目录** — Deep Research 生成的参考文档
3. **Axiom 的 spec 是项目级的**（按里程碑组织），OpenSpec 的 changes 是变更级的
4. **Axiom 有 PROGRESS.md 追踪** — 全局进度视图
5. **Axiom 的 spec-engine 是内置引擎**，OpenSpec 是外部工具

### 可改进

1. **OpenSpec 太偏轻量** — 对大型项目的里程碑管理不足
2. **缺少 Deep Research** — 没有竞品搜索和参考文档
3. **缺少自我成长** — 没有学习机制
4. **Node.js 依赖** — 不支持 Bun
