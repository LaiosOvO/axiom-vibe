# Spec 驱动循环引擎 — 技术设计

## 架构

### 四阶段状态机

```
Proposal → Definition → Apply → Archive
   ↑                              |
   └──────── (新需求) ────────────┘
```

### 文件结构

```
openspec/
├── project.md          # 项目上下文
├── specs/              # 归档的 spec（事实来源）
│   └── <capability>/
│       └── spec.md
└── changes/            # 活动变更
    └── <change-name>/
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── specs/
```

### 核心类型

| 类型 | 说明 |
|------|------|
| `Phase` | 'proposal' / 'definition' / 'apply' / 'archive' |
| `Change` | 变更实体：name + phase + 文件内容 |
| `TaskItem` | 原子任务：id + description + status |

### API 设计

| 函数 | 阶段 | 说明 |
|------|------|------|
| `init()` | — | 初始化目录结构 |
| `createChange()` | proposal | 创建变更提案 |
| `writeDesign()` | definition | 写入技术设计 |
| `writeTasks()` | definition | 写入任务清单 |
| `advancePhase()` | * | 推进到下一阶段 |
| `updateTaskStatus()` | apply | 更新任务状态 |
| `archiveChange()` | archive | 归档变更 |

### 决策

1. **保留旧 API** — parseFrontmatter/createSpec/updateStatus 保持兼容
2. **纯文件系统** — 不依赖数据库，所有状态存在文件系统
3. **阶段校验** — advancePhase 检查前置条件（如 definition 需要 design.md 存在）
