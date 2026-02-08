# SPEC-04: 工具系统 — 设计文档

> 状态: 待设计

## 技术方案

### Tool 工厂模式

使用工厂模式定义工具，确保类型安全：

```typescript
const ReadTool = Tool.define({
  name: 'read',
  description: '读取文件内容',
  parameters: z.object({
    filePath: z.string(),
    offset: z.number().optional(),
    limit: z.number().optional(),
  }),
  result: z.object({
    content: z.string(),
    lineCount: z.number(),
  }),
  execute: async ({ filePath, offset, limit }) => {
    // 实现文件读取
  },
});
```

### 工具注册机制

所有工具在启动时注册到 `ToolRegistry`：

```typescript
ToolRegistry.register(ReadTool);
ToolRegistry.register(WriteTool);
ToolRegistry.register(BashTool);
// ...
```

## 接口设计

### Tool 命名空间

```typescript
export namespace Tool {
  // 工具定义工厂
  export function define<P extends z.ZodType, R extends z.ZodType>(opts: {
    name: string;
    description: string;
    parameters: P;
    result: R;
    execute: (params: z.infer<P>) => Promise<z.infer<R>>;
  }): ToolInfo<z.infer<P>, z.infer<R>>;

  // 工具信息类型
  export interface ToolInfo<P = any, R = any> {
    name: string;
    description: string;
    parameters: z.ZodType<P>;
    result: z.ZodType<R>;
    execute: (params: P) => Promise<R>;
  }
}
```

### ToolRegistry 命名空间

```typescript
export namespace ToolRegistry {
  // 注册工具
  export function register(tool: ToolInfo): void;

  // 获取单个工具
  export function get(name: string): ToolInfo | undefined;

  // 列出所有工具
  export function list(): ToolInfo[];

  // 批量解析工具（按名称）
  export function resolve(names: string[]): ToolInfo[];

  // 检查工具是否存在
  export function has(name: string): boolean;
}
```

### 内置工具实现

每个工具实现为独立模块：

```
packages/core/src/tool/
├── registry.ts        ToolRegistry 实现
├── define.ts          Tool.define 工厂
├── builtin/           内置工具
│   ├── bash.ts
│   ├── read.ts
│   ├── write.ts
│   ├── edit.ts
│   ├── glob.ts
│   ├── grep.ts
│   ├── task.ts
│   ├── webfetch.ts
│   ├── websearch.ts
│   ├── github-search.ts
│   ├── spec.ts
│   ├── todo.ts
│   └── question.ts
└── index.ts           导出所有工具
```

## 数据结构

### ToolInfo

```typescript
interface ToolInfo<P, R> {
  name: string;
  description: string;
  parameters: z.ZodType<P>;
  result: z.ZodType<R>;
  execute: (params: P) => Promise<R>;
}
```

### 工具注册表（内部）

```typescript
// Map<工具名, ToolInfo>
const registry = new Map<string, ToolInfo>();
```

## 依赖关系

- SPEC-00: 项目初始化
- Zod v4（参数和结果验证）
