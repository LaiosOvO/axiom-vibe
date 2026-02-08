# SPEC-C01: TUI 前端

> 里程碑: M3 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: M1

## 目标

实现 SDK 客户端层（连接 HTTP Server）和 TUI 消息渲染组件。SDK 是所有客户端共用的通信层。

## 需求

### R1: SDK 客户端（packages/sdk）

```typescript
export namespace AxiomClient {
  export const Config = z.object({
    baseUrl: z.string().default('http://127.0.0.1:4096'),
  })
  export type Config = z.infer<typeof Config>

  export function create(config?: Partial<Config>): Client;

  export interface Client {
    health(): Promise<{ status: string }>;
    sessions: {
      list(): Promise<Session.Info[]>;
      create(opts: { modelId: string; title?: string }): Promise<Session.Info>;
      get(id: string): Promise<Session.Info>;
      remove(id: string): Promise<void>;
    };
    messages: {
      send(sessionId: string, content: string): Promise<Session.Message>;
    };
  }
}
```

### R2: TUI 消息渲染（packages/app）

```typescript
export namespace MessageRenderer {
  // 将 Session.Message 渲染为终端友好的格式化字符串
  export function render(message: { role: string; content: string }): string;
  
  // 渲染消息列表
  export function renderConversation(messages: { role: string; content: string }[]): string;
  
  // 渲染 markdown 代码块（简单高亮）
  export function renderCodeBlock(code: string, language?: string): string;
  
  // 渲染系统信息（欢迎语、状态等）
  export function renderSystemInfo(info: { version: string; model: string; sessionId: string }): string;
}
```

## 验收场景

### 场景 1: 创建 SDK 客户端
- **当** 调用 `AxiomClient.create()`
- **那么** 返回包含 health/sessions/messages 方法的 Client

### 场景 2: 健康检查
- **当** 调用 `client.health()`（mock fetch）
- **那么** 返回 `{ status: 'ok' }`

### 场景 3: 渲染用户消息
- **当** render({ role: 'user', content: 'hello' })
- **那么** 返回带角色前缀的格式化字符串

### 场景 4: 渲染对话
- **当** renderConversation 传入多条消息
- **那么** 返回分隔的格式化对话

### 场景 5: 渲染代码块
- **当** renderCodeBlock('const x = 1', 'typescript')
- **那么** 返回带语言标签的代码框
