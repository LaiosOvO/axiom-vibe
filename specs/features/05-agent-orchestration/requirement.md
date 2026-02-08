# SPEC-F05: Agent 编排系统

> 里程碑: M2 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: M1

## 目标

实现预设核心 Agent + 动态创建自定义 Agent 的编排系统，每个 Agent 可配置模型、MCP、Skills、工具权限。

## 需求

### R1: 预设核心 Agent

| Agent | 角色 | 默认模型 | 工具权限 |
|-------|------|---------|---------|
| orchestrator | 总编排器，分析任务并委派 | claude-opus-4 | 所有工具 + task |
| explorer | 代码库搜索和探索 | gemini-flash | grep, glob, read, ast-grep |
| oracle | 架构顾问，只读 | claude-opus-4 | read, grep, glob |
| librarian | 外部知识检索 | gemini-flash | webfetch, websearch, github_search |
| builder | 代码实现 | claude-sonnet | 所有工具 |
| researcher | 深度研究 | claude-opus-4 | webfetch, websearch, github_search, read, write |

### R2: Agent 定义 Schema

```typescript
export namespace Agent {
  export const Info = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    model: z.string(),
    temperature: z.number().default(0),
    tools: z.array(z.string()),          // 允许使用的工具列表
    mcps: z.array(z.string()).optional(), // 关联的 MCP 服务
    skills: z.array(z.string()).optional(), // 关联的 skill
    maxTokens: z.number().optional(),
    permissions: z.object({
      canWrite: z.boolean().default(true),
      canExecute: z.boolean().default(true),
      canNetwork: z.boolean().default(false),
    }),
  });
  export type Info = z.infer<typeof Info>;
}
```

### R3: 动态创建 Agent

提供 `/create-agent` 命令，交互式引导：

```
/create-agent

1. Agent 名称: _____
2. 角色描述: _____
3. 选择模型: [claude-opus-4] [claude-sonnet] [gpt-4o] [gemini-pro] ...
4. 选择 MCP 服务:
   [x] websearch    [ ] context7
   [x] grep.app     [ ] playwright
5. 选择 Skills:
   [x] TDD          [ ] 代码审查
   [ ] 调试         [x] 自定义...
6. 工具权限:
   [x] 读取文件     [x] 写入文件
   [x] 执行命令     [ ] 网络访问

→ 生成 agent 配置文件到 .axiom/agents/my-agent.md
```

### R4: Agent 编排

orchestrator 根据任务分析决定：
- 单一 agent 足够 → 直接委派
- 需要多 agent → 并行/顺序编排
- 需要研究 → 先派 researcher，再派 builder

编排使用 task 工具：
```typescript
// orchestrator 内部
task({
  agent: 'explorer',
  prompt: '搜索现有的认证实现...',
  background: true,
});
task({
  agent: 'librarian',
  prompt: '搜索 JWT 最佳实践...',
  background: true,
});
// 收集结果后
task({
  agent: 'builder',
  prompt: '基于以上研究结果实现...',
});
```

### R5: Agent 配置持久化

- 预设 agent: `packages/core/src/agent/presets/`
- 用户自定义 agent: `~/.config/axiom/agents/`
- 项目级 agent: `.axiom/agents/`

## 验收场景

### 场景 1: 加载预设 Agent

- **当** 调用 `Agent.listPresets()`
- **那么** 返回至少包含 orchestrator 和 explorer

### 场景 2: 创建自定义 Agent

- **当** 创建名为 `my-tester` 的 Agent
- **那么** 返回 Agent ID 为 `my-tester`

### 场景 3: Agent 工具权限过滤

- **当** 获取 oracle Agent 的工具列表
- **那么** 不包含 write、edit、bash（只读）

### 场景 4: Agent MCP 关联

- **当** 获取 librarian Agent
- **那么** mcps 包含 `websearch`

### 场景 5: 编排任务分派

- **当** orchestrator 编排"实现用户登录功能"
- **那么** 计划包含 explorer 步骤

### 场景 6: 自定义 Agent 持久化

- **当** 保存自定义 Agent 到 `.axiom/agents/`
- **那么** 可以从文件加载回 Agent 对象
