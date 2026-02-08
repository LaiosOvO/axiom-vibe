# SPEC-02: 事件总线

> 里程碑: M0 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: SPEC-00

## 目标

实现类型安全的事件总线系统，模块间通过事件通信，支持 SSE 转发给客户端。

## 需求

### R1: BusEvent 定义

```typescript
export namespace BusEvent {
  export function define<T extends z.ZodType>(
    name: string,
    schema: T
  ): { name: string; schema: T };
}
```

### R2: Bus 发布/订阅

```typescript
export namespace Bus {
  export function publish<T>(event: BusEventDef<T>, data: T): void;
  export function subscribe<T>(
    event: BusEventDef<T>,
    handler: (data: T) => void
  ): () => void; // 返回取消订阅函数
}
```

### R3: 内置事件

- `session.created` / `session.updated` / `session.deleted`
- `message.created` / `message.updated`
- `tool.executing` / `tool.completed` / `tool.failed`
- `spec.updated` / `spec.progress`
- `growth.pattern.detected` / `growth.skill.created`

## 验收场景

### 场景 1: 发布和订阅事件

- **当** 订阅事件后发布该事件
- **那么** 订阅者接收到事件数据

### 场景 2: 取消订阅

- **当** 调用取消订阅函数后再发布事件
- **那么** 原订阅者不再接收事件

### 场景 3: Schema 验证

- **当** 发布的数据不符合 schema
- **那么** 抛出验证错误

### 场景 4: 多订阅者

- **当** 多个订阅者订阅同一事件
- **那么** 所有订阅者都能接收到事件
