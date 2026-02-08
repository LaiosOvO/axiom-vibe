# SPEC-05: Session Prompt Loop — 设计文档

> 状态: 已设计

## 技术方案

```
用户消息 → Session.addMessage(role: 'user')
         → ToolRegistry.list() → 构建工具描述
         → Provider.call(modelId, messages, tools) [后续集成]
         → 处理 LLM 响应
         → 如有 tool_calls → 执行工具 → 添加 tool 消息 → 递归
         → 返回 assistant 消息
```

M1 阶段先实现 Session/Message 的 CRUD 和数据结构，LLM 调用占位。

## 接口设计

```typescript
export namespace Session {
  export const Info: z.ZodType<SessionInfo>;
  export function create(opts): Info;
  export function get(id: string): Info | undefined;
  export function list(): Info[];
  export function addMessage(sessionId: string, message: Omit<Message, 'id' | 'createdAt'>): Message;
  export function remove(id: string): void;
  export function reset(): void;
}
```

## 依赖关系

- SPEC-03: Provider（模型查找）
- SPEC-04: Tool（工具注册表）
- Zod v4
