# SPEC-02: 事件总线 — 设计文档

> 状态: 待设计

## 技术方案

### 事件总线架构

采用类型安全的发布-订阅模式：

```
BusEvent.define('event.name', schema)
         ↓
返回 EventDef<T>（类型标记）
         ↓
Bus.subscribe(EventDef, handler) → 注册订阅
         ↓
Bus.publish(EventDef, data) → 触发所有订阅者
         ↓
Schema 验证 → 调用 handler
```

### SSE 转发（未来扩展）

事件总线可选地转发到 SSE 通道：
- TUI/Desktop 客户端通过 SSE 接收实时事件
- 支持事件过滤（按事件名）

## 接口设计

### BusEvent 命名空间

```typescript
export namespace BusEvent {
  // 定义事件类型
  export function define<T extends z.ZodType>(
    name: string,
    schema: T
  ): BusEventDef<z.infer<T>>;

  // 事件定义类型
  export interface BusEventDef<T> {
    name: string;
    schema: z.ZodType<T>;
  }
}
```

### Bus 命名空间

```typescript
export namespace Bus {
  // 发布事件
  export function publish<T>(event: BusEventDef<T>, data: T): void;

  // 订阅事件（返回取消订阅函数）
  export function subscribe<T>(
    event: BusEventDef<T>,
    handler: (data: T) => void
  ): () => void;

  // 获取所有订阅者数量（用于调试）
  export function subscribers(event: BusEventDef<any>): number;
}
```

### 内置事件定义

```typescript
export namespace Events {
  // Session 事件
  export const SessionCreated = BusEvent.define('session.created', 
    z.object({ sessionId: z.string() }));
  export const SessionUpdated = BusEvent.define('session.updated', 
    z.object({ sessionId: z.string() }));
  export const SessionDeleted = BusEvent.define('session.deleted', 
    z.object({ sessionId: z.string() }));

  // Message 事件
  export const MessageCreated = BusEvent.define('message.created',
    z.object({ messageId: z.string(), role: z.string() }));

  // Tool 事件
  export const ToolExecuting = BusEvent.define('tool.executing',
    z.object({ toolName: z.string(), params: z.any() }));
  export const ToolCompleted = BusEvent.define('tool.completed',
    z.object({ toolName: z.string(), result: z.any() }));
  export const ToolFailed = BusEvent.define('tool.failed',
    z.object({ toolName: z.string(), error: z.string() }));

  // Spec 事件
  export const SpecUpdated = BusEvent.define('spec.updated',
    z.object({ specId: z.string() }));
  export const SpecProgress = BusEvent.define('spec.progress',
    z.object({ milestone: z.string(), completed: z.number(), total: z.number() }));

  // Growth 事件
  export const GrowthPatternDetected = BusEvent.define('growth.pattern.detected',
    z.object({ patternId: z.string(), confidence: z.number() }));
  export const GrowthSkillCreated = BusEvent.define('growth.skill.created',
    z.object({ skillPath: z.string() }));
}
```

## 数据结构

### 订阅者存储

```typescript
// 内部实现（Map）
const subscribers = new Map<string, Set<(data: any) => void>>();
```

## 依赖关系

- SPEC-00: 项目初始化
- Zod v4（Schema 验证）
