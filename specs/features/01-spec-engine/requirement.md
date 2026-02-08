# SPEC-F01: Spec 引擎

> 里程碑: M2 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: M1

## 目标

实现 spec 驱动开发引擎：每个需求都有独立的 spec 文件，支持进度追踪、验收标准、自动更新进度文件。

## 需求

### R1: Spec 文件格式

每个 spec 文件是一个 markdown 文件，包含 frontmatter 元数据：

```yaml
---
id: SPEC-F01
title: Spec 引擎
milestone: M2
priority: P0
status: pending  # pending | in_progress | testing | completed | blocked
depends_on: [SPEC-05, SPEC-04]
created: 2026-02-08
updated: 2026-02-08
---
```

Spec 正文结构：
- `## 目标` — 做什么以及为什么
- `## 需求` — 按 R1/R2/R3 编号的具体需求
- `## 验收标准` — 带测试代码的验收用例
- `## 完成定义` — checklist

### R2: Spec 管理命令

| 命令 | 功能 |
|------|------|
| `/spec:new <name>` | 创建新 spec（先分析现有 spec，再生成） |
| `/spec:list` | 列出所有 spec 及其状态 |
| `/spec:status <id>` | 查看单个 spec 详情 |
| `/spec:update <id>` | 更新 spec 状态 |
| `/spec:progress` | 显示进度纵览 |
| `/spec:analyze` | 分析现有 spec，发现缺漏 |

### R3: 进度追踪

- 自动解析所有 spec 文件的 frontmatter
- 按里程碑分组统计完成率
- 自动更新 `progress/PROGRESS.md`
- 检测依赖关系，标记阻塞

### R4: 需求变更管理

当收到新需求时：
1. 先分析现有 spec 文件（读取所有 spec 的 frontmatter + 目标）
2. 判断是新 spec 还是修改现有 spec
3. 如果修改，生成 delta（参考 OpenSpec 的 ADDED/MODIFIED/REMOVED）
4. 生成新的 spec 文件或更新现有 spec

### R5: Spec 与测试的关联

- 每个 spec 的验收标准部分包含测试代码框架
- `/spec:test <id>` 运行关联的测试
- 测试通过后自动更新 spec 状态

## 验收场景

### 场景 1: 解析 Spec Frontmatter

- **当** 解析包含 frontmatter 的 spec 文件
- **那么** 正确提取 id、status、dependsOn 等字段

### 场景 2: 创建新 Spec

- **当** 调用 `SpecEngine.create` 创建新 spec
- **那么** 生成包含完整结构的 markdown 文件

### 场景 3: 更新 Spec 状态

- **当** 调用 `SpecEngine.updateStatus` 更新状态
- **那么** frontmatter 中的 status 字段被更新

### 场景 4: 生成进度报告

- **当** 调用 `SpecEngine.generateProgress`
- **那么** 返回按里程碑分组的完成率统计

### 场景 5: 检测依赖阻塞

- **当** 某个 spec 的依赖未完成
- **那么** `SpecEngine.findBlocked` 返回该 spec

### 场景 6: 需求变更分析

- **当** 分析新需求"添加暗黑模式"
- **那么** 判断是 new 还是 modify，并返回影响的 spec
