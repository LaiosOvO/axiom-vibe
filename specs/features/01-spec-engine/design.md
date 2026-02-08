# SPEC-F01: Spec 引擎 — 设计文档

> 状态: 待设计

## 技术方案

### Spec 文件管理

使用文件系统存储所有 spec：

```
specs/
├── core/
│   ├── 00-project-init.md
│   ├── 01-config-system.md
│   └── ...
└── features/
    ├── 01-spec-engine.md
    └── ...
```

### Spec 解析流程

```
读取 .md 文件
     ↓
解析 frontmatter (gray-matter)
     ↓
提取元数据 (id, status, depends_on, ...)
     ↓
解析正文 (Markdown AST)
     ↓
返回 SpecInfo 对象
```

### 进度追踪

定期扫描所有 spec 文件，生成进度报告：

```typescript
{
  milestones: [
    {
      name: 'M0',
      total: 5,
      completed: 3,
      pending: 2,
      specs: [...]
    },
    ...
  ]
}
```

## 接口设计

### SpecEngine 命名空间

```typescript
export namespace SpecEngine {
  // Spec 信息类型
  export interface SpecInfo {
    id: string;
    title: string;
    milestone: string;
    priority: string;
    status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'blocked';
    dependsOn: string[];
    created: string;
    updated: string;
    filePath: string;
    content: string;
  }

  // 解析 Spec
  export function parse(content: string): SpecInfo;
  export function parseFile(filePath: string): SpecInfo;

  // CRUD 操作
  export function create(opts: {
    title: string;
    milestone: string;
    priority: string;
  }): Promise<string>;  // 返回文件路径
  export function get(id: string): Promise<SpecInfo>;
  export function updateStatus(id: string, status: string): Promise<void>;
  export function delete(id: string): Promise<void>;

  // 列表和查询
  export function list(): Promise<SpecInfo[]>;
  export function findByMilestone(milestone: string): Promise<SpecInfo[]>;
  export function findBlocked(): Promise<SpecInfo[]>;

  // 进度追踪
  export function generateProgress(): Promise<ProgressReport>;
  export function updateProgressFile(): Promise<void>;

  // 需求变更分析
  export function analyzeChange(requirement: string): Promise<{
    type: 'new' | 'modify';
    affectedSpecs: string[];
    suggestion: string;
  }>;
}
```

### 命令接口

```typescript
export namespace SpecCommands {
  export function specNew(name: string): Promise<void>;
  export function specList(): Promise<void>;
  export function specStatus(id: string): Promise<void>;
  export function specUpdate(id: string): Promise<void>;
  export function specProgress(): Promise<void>;
  export function specAnalyze(): Promise<void>;
  export function specTest(id: string): Promise<void>;
}
```

## 数据结构

### ProgressReport

```typescript
interface ProgressReport {
  milestones: {
    name: string;
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    testing: number;
    blocked: number;
    specs: SpecInfo[];
  }[];
  overall: {
    total: number;
    completed: number;
    completionRate: number;
  };
}
```

## 依赖关系

- M1 完成（配置系统、工具系统）
- gray-matter（frontmatter 解析）
- markdown-it 或类似（Markdown 解析）
