# SPEC-07: MCP 集成

> 里程碑: M1 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: SPEC-04

## 目标

实现 MCP (Model Context Protocol) 客户端管理。支持注册本地（stdio）和远程（HTTP/SSE）MCP 服务器，管理连接生命周期，将 MCP 工具转换为内部 Tool 格式。

## 需求

### R1: McpServer 命名空间

```typescript
export namespace McpServer {
  export const LocalConfig = z.object({
    type: z.literal('local'),
    command: z.array(z.string()),
    environment: z.record(z.string()).optional(),
    enabled: z.boolean().default(true),
    timeout: z.number().default(30000),
  })

  export const RemoteConfig = z.object({
    type: z.literal('remote'),
    url: z.string(),
    headers: z.record(z.string()).optional(),
    enabled: z.boolean().default(true),
    timeout: z.number().default(30000),
  })

  export const Config = z.discriminatedUnion('type', [LocalConfig, RemoteConfig])
  export type Config = z.infer<typeof Config>

  export type Status = 'disconnected' | 'connecting' | 'connected' | 'error'

  export const Info = z.object({
    name: z.string(),
    config: Config,
    status: z.enum(['disconnected', 'connecting', 'connected', 'error']),
    error: z.string().optional(),
    toolCount: z.number().default(0),
  })
  export type Info = z.infer<typeof Info>

  export function register(name: string, config: Config): void;
  export function get(name: string): Info | undefined;
  export function list(): Info[];
  export function remove(name: string): void;
  export function updateStatus(name: string, status: Status, error?: string): void;
  export function reset(): void;
}
```

### R2: 连接管理（骨架）

M1 阶段先实现数据结构和状态管理。实际的 stdio/HTTP 连接在后续集成 `@modelcontextprotocol/sdk` 时实现。

### R3: Schema 验证

区分 local 和 remote 配置，使用 discriminatedUnion。

## 验收场景

### 场景 1: 注册本地 MCP 服务器
- **当** 调用 `McpServer.register('memory', { type: 'local', command: ['npx', 'mcp-memory'] })`
- **那么** `McpServer.get('memory')` 返回 Info，status 为 'disconnected'

### 场景 2: 注册远程 MCP 服务器
- **当** 调用 `McpServer.register('api', { type: 'remote', url: 'https://example.com/mcp' })`
- **那么** `McpServer.get('api')` 返回 Info

### 场景 3: 更新连接状态
- **当** 调用 `McpServer.updateStatus('memory', 'connected')`
- **那么** `McpServer.get('memory')?.status === 'connected'`

### 场景 4: 错误状态
- **当** 调用 `McpServer.updateStatus('memory', 'error', '连接超时')`
- **那么** Info 中包含 error 字段

### 场景 5: 列出和删除
- **当** 注册多个服务器后 `McpServer.list()` 返回全部
- **当** `McpServer.remove('memory')` 后 get 返回 undefined
