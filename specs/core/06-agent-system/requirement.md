# SPEC-06: Agent 基础系统

> 里程碑: M1 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: SPEC-05

## 目标

实现 Agent 定义、注册和管理系统。Agent 是具有特定系统提示词和工具集的 AI 助手角色。

## 需求

### R1: Agent 命名空间

```typescript
export namespace Agent {
  export const Info = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    model: z.string(),
    tools: z.array(z.string()),
    temperature: z.number().min(0).max(2).optional(),
  })
  export type Info = z.infer<typeof Info>

  export function register(agent: Info): void;
  export function get(id: string): Info | undefined;
  export function list(): Info[];
  export function has(id: string): boolean;
  export function remove(id: string): void;
  export function reset(): void;
}
```

### R2: 内置 Agent（6 个）

| id | 名称 | 职责 | 工具集 |
|----|------|------|--------|
| `coder` | Coder | 主编码 Agent，通用编码任务 | read, write, bash |
| `architect` | Architect | 架构设计和代码审查 | read, bash |
| `explorer` | Explorer | 代码搜索和分析 | read, bash |
| `writer` | Writer | 文档和注释编写 | read, write |
| `reviewer` | Reviewer | 代码审查和质量检查 | read, bash |
| `planner` | Planner | 任务规划和需求分析 | read |

### R3: Schema 验证

使用 Zod 验证所有 Agent 注册数据。

## 验收场景

### 场景 1: 获取内置 Agent
- **当** 调用 `Agent.get('coder')`
- **那么** 返回 coder Agent 的完整 Info

### 场景 2: 列出所有 Agent
- **当** 调用 `Agent.list()`
- **那么** 返回至少 6 个内置 Agent

### 场景 3: 注册自定义 Agent
- **当** 调用 `Agent.register({ id: 'custom', ... })`
- **那么** `Agent.get('custom')` 返回该 Agent

### 场景 4: 删除 Agent
- **当** 调用 `Agent.remove('custom')`
- **那么** `Agent.get('custom')` 返回 undefined

### 场景 5: 重置
- **当** 调用 `Agent.reset()`
- **那么** 恢复为初始内置 Agent 列表
