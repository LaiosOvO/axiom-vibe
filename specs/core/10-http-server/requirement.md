# SPEC-10: HTTP Server

> 里程碑: M1 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: SPEC-05

## 目标

使用 Hono 框架实现 HTTP 服务器，提供 REST API 和 SSE 事件流。服务器是 TUI/Desktop/VSCode 客户端与核心引擎的通信桥梁。

## 需求

### R1: Server 命名空间

```typescript
export namespace Server {
  export const Config = z.object({
    port: z.number().default(4096),
    hostname: z.string().default('127.0.0.1'),
  })
  export type Config = z.infer<typeof Config>

  export function createApp(): Hono;
  export function listen(config?: Partial<Config>): { port: number; hostname: string; stop: () => void };
}
```

### R2: 路由设计

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/session` | 列出所有会话 |
| POST | `/session` | 创建会话 |
| GET | `/session/:id` | 获取会话详情 |
| DELETE | `/session/:id` | 删除会话 |
| POST | `/session/:id/message` | 发送消息 |
| GET | `/event` | SSE 事件流 |

### R3: SSE 事件流

通过 Bus 事件系统将内部事件转发给客户端。包含 30 秒心跳防止连接超时。

### R4: 中间件

- CORS（允许 localhost）
- 请求日志
- 错误处理（统一 JSON 错误格式）

## 验收场景

### 场景 1: 创建 Hono 应用
- **当** 调用 `Server.createApp()`
- **那么** 返回配置好路由和中间件的 Hono 实例

### 场景 2: 健康检查
- **当** GET `/health`
- **那么** 返回 `{ status: 'ok' }`

### 场景 3: 会话 CRUD
- **当** POST `/session` → GET `/session` → DELETE `/session/:id`
- **那么** 完整的 CRUD 流程正常工作

### 场景 4: SSE 事件
- **当** 连接 GET `/event`
- **那么** 收到 `server.connected` 事件，之后收到心跳

### 场景 5: 错误处理
- **当** GET `/session/不存在的id`
- **那么** 返回 404 JSON 错误
