# 使用方法

## 运行模式

### 交互模式

```bash
cd your-project
axiom
```

进入 TUI 界面，支持实时对话、代码生成、文件编辑。

### Headless 模式

```bash
axiom run "实现用户登录功能"
axiom run "修复 src/auth.ts 中的类型错误"
axiom run "为 UserService 编写单元测试"
```

直接执行任务，无需交互。适合 CI/CD 或脚本集成。

### 服务器模式

```bash
axiom serve
axiom serve --port=8080
```

启动 HTTP API 服务器，供 Desktop 应用或 VSCode 插件连接。

默认地址：`http://127.0.0.1:4096`

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| GET | /session | 列出所有会话 |
| POST | /session | 创建新会话 |
| GET | /session/:id | 获取会话详情 |
| DELETE | /session/:id | 删除会话 |
| POST | /session/:id/message | 发送消息 |

## 客户端

### SDK

```typescript
import { AxiomClient } from '@axiom-ai/sdk'

const client = AxiomClient.create({ baseUrl: 'http://127.0.0.1:4096' })

const health = await client.health()
const session = await client.sessions.create({ modelId: 'claude-3-5-sonnet-20241022' })
const message = await client.messages.send(session.id, '帮我写一个 Hello World')
```

### Desktop 应用

基于 Tauri 的桌面应用，通过 WebView 连接 `axiom serve`。

```bash
# 启动后端
axiom serve

# 启动桌面应用（开发模式）
cd packages/desktop && bun run dev
```

### VSCode 插件

在 VSCode 中安装 Axiom 插件后：

- `Ctrl+Shift+A` 打开 Axiom 面板
- 在面板中直接与 AI 对话
- 支持代码选中后发送给 AI

## 常用场景

### 代码生成

```
axiom run "创建一个 Express REST API，包含用户 CRUD 操作"
```

### 代码审查

```
axiom run "审查 src/ 目录下的代码质量，给出改进建议"
```

### Bug 修复

```
axiom run "修复 TypeError: Cannot read property 'id' of undefined 错误"
```

### 文档编写

```
axiom run "为 src/services/ 下的所有函数添加 JSDoc 注释"
```

### 测试编写

```
axiom run "为 src/utils/math.ts 编写 Vitest 单元测试"
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AXIOM_MODEL` | 默认模型 | claude-3-5-sonnet-20241022 |
| `AXIOM_PORT` | 服务器端口 | 4096 |
| 各 Provider 的 API Key | 见 [配置详解](configuration.md) | - |
