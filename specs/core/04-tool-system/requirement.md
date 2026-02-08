# SPEC-04: 工具系统

> 里程碑: M1 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: SPEC-00

## 目标

实现 Tool.define 工厂模式和工具注册表，包含所有内置工具。

## 需求

### R1: Tool 定义

```typescript
export namespace Tool {
  export function define<P extends z.ZodType, R extends z.ZodType>(opts: {
    name: string;
    description: string;
    parameters: P;
    result: R;
    execute: (params: z.infer<P>) => Promise<z.infer<R>>;
  }): ToolInfo;
}
```

### R2: 内置工具

| 工具 | 功能 |
|------|------|
| bash | 执行 shell 命令 |
| read | 读取文件 |
| write | 写入文件 |
| edit | 精确字符串替换编辑 |
| glob | 文件模式匹配 |
| grep | 内容搜索（ripgrep） |
| task | 启动子 agent |
| webfetch | 获取 URL 内容 |
| websearch | Web 搜索 |
| github_search | GitHub 仓库搜索 |
| spec | Spec 管理 |
| todo | Todo 管理 |
| question | 向用户提问 |

### R3: ToolRegistry

```typescript
export namespace ToolRegistry {
  export function register(tool: ToolInfo): void;
  export function get(name: string): ToolInfo | undefined;
  export function list(): ToolInfo[];
  export function resolve(names: string[]): ToolInfo[];
}
```

## 验收场景

### 场景 1: 定义和注册工具

- **当** 使用 `Tool.define` 定义工具并注册
- **那么** 可以通过 `ToolRegistry.get` 获取该工具

### 场景 2: 执行工具

- **当** 调用工具的 `execute` 方法
- **那么** 返回符合 result schema 的结果

### 场景 3: 参数验证

- **当** 传入不符合 parameters schema 的参数
- **那么** 抛出 Zod 验证错误

### 场景 4: 批量解析工具

- **当** 调用 `ToolRegistry.resolve(['read', 'write', 'bash'])`
- **那么** 返回 3 个工具的 ToolInfo 数组
