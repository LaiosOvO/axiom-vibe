# SPEC-F05: Agent 编排系统 — 设计文档

> 状态: 待设计

## 技术方案

### Agent 架构

```
用户输入
     ↓
orchestrator Agent
     ↓
分析任务 → 决定编排策略
     ↓
├─ 并行编排 → [explorer, librarian] → 收集结果
├─ 顺序编排 → researcher → builder
└─ 直接委派 → builder
     ↓
返回结果
```

### Agent 工具权限过滤

根据 Agent 的 `permissions` 和 `tools` 字段过滤可用工具：

```typescript
function resolveTools(agent: AgentInfo): ToolInfo[] {
  const allTools = ToolRegistry.list();
  return allTools.filter(tool => {
    if (!agent.tools.includes(tool.name)) return false;
    if (tool.requiresWrite && !agent.permissions.canWrite) return false;
    if (tool.requiresExecute && !agent.permissions.canExecute) return false;
    if (tool.requiresNetwork && !agent.permissions.canNetwork) return false;
    return true;
  });
}
```

## 接口设计

### Agent 命名空间

```typescript
export namespace Agent {
  // Agent 信息
  export const Info: z.ZodType<AgentInfo>;
  export type Info = z.infer<typeof Info>;

  // 加载预设 Agent
  export function listPresets(): AgentInfo[];
  export function get(id: string): AgentInfo | undefined;

  // 创建自定义 Agent
  export function create(opts: {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    model: string;
    tools: string[];
    permissions: Permissions;
  }): AgentInfo;

  // 工具解析
  export function resolveTools(agent: AgentInfo): ToolInfo[];

  // 编排
  export function orchestrate(task: string): Promise<OrchestrationPlan>;

  // 持久化
  export function save(agentId: string, opts: { dir: string }): Promise<void>;
  export function loadFromFile(filePath: string): AgentInfo;
}
```

### OrchestrationPlan

```typescript
interface OrchestrationPlan {
  steps: {
    agent: string;
    prompt: string;
    parallel?: boolean;
    waitFor?: string[];  // 依赖的步骤 ID
  }[];
  reasoning: string;  // orchestrator 的分析推理
}
```

### Agent 文件格式

```markdown
---
id: my-tester
name: 测试专家
model: claude-sonnet
tools:
  - read
  - write
  - bash
permissions:
  canWrite: true
  canExecute: true
  canNetwork: false
---

# 测试专家 Agent

你是一个测试专家，专门编写高质量的测试代码。

## 工作流程

1. 分析要测试的功能
2. 设计测试用例
3. 编写测试代码
4. 运行并验证测试
```

## 数据结构

### Permissions

```typescript
interface Permissions {
  canWrite: boolean;    // 是否可以写文件
  canExecute: boolean;  // 是否可以执行命令
  canNetwork: boolean;  // 是否可以访问网络
}
```

### 预设 Agent 定义

```
packages/core/src/agent/presets/
├── orchestrator.md
├── explorer.md
├── oracle.md
├── librarian.md
├── builder.md
└── researcher.md
```

## 依赖关系

- M1 完成（配置系统、工具系统）
- SPEC-04: 工具系统（工具权限管理）
