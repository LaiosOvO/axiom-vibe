# SPEC-05: Session Prompt Loop

> 里程碑: M1 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: SPEC-03, SPEC-04

## 目标

实现核心的会话循环：用户消息 → 构建 prompt → 调用 LLM → 处理工具调用 → 返回响应。

## 需求

### R1: Session 命名空间

```typescript
export namespace Session {
  export const Info = z.object({
    id: z.string(),
    title: z.string(),
    modelId: z.string(),
    messages: z.array(Message),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  export type Info = z.infer<typeof Info>

  export function create(opts: { modelId: string; title?: string }): Info;
  export function get(id: string): Info | undefined;
  export function list(): Info[];
  export function remove(id: string): void;
  export function reset(): void;
}
```

### R2: Message 结构

```typescript
export const Message = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.unknown(),
  })).optional(),
  toolResults: z.array(z.object({
    callId: z.string(),
    result: z.unknown(),
  })).optional(),
  createdAt: z.number(),
})
```

### R3: Prompt Loop（简化版，不涉及真实 LLM）

```typescript
export namespace SessionPrompt {
  // 发送消息并获取响应（主循环骨架）
  export function send(sessionId: string, content: string): Promise<Message>;
}
```

主循环流程（骨架）：
1. 将用户消息添加到 session
2. 解析可用工具（ToolRegistry.list）
3. 构建 LLM 调用参数
4. 调用 LLM（通过 Provider）
5. 如果有工具调用，执行工具并将结果作为 tool 消息
6. 返回 assistant 消息

注：M1 阶段先实现数据结构和消息管理，LLM 调用集成留到有 Provider.call 后。

## 验收场景

### 场景 1: 创建会话

- **当** 调用 `Session.create({ modelId: 'claude-opus-4' })`
- **那么** 返回一个 Session.Info，包含 id 和空消息列表

### 场景 2: 管理会话

- **当** 创建多个会话后调用 `Session.list()`
- **那么** 返回所有会话

### 场景 3: 消息管理

- **当** 向会话添加消息
- **那么** 会话的 messages 数组包含该消息

### 场景 4: 删除会话

- **当** 调用 `Session.remove(id)`
- **那么** `Session.get(id)` 返回 undefined
