# 斜杠命令系统

Axiom TUI 支持斜杠命令（Slash Commands），在输入框中输入 `/` 即可显示可用命令列表。

## 可用命令

### /help
显示所有可用命令及其说明

```
/help
```

### /clear
清空当前会话的所有消息

```
/clear
```

### /compact
压缩会话历史，只保留最近 N 条消息（默认 20）

```
/compact          # 保留最近 20 条
/compact 50       # 保留最近 50 条
```

### /model
显示当前模型或切换到指定模型

```
/model                              # 显示当前模型和可用模型列表
/model anthropic/claude-sonnet-4    # 切换到指定模型
```

### /agent
显示当前 Agent 或切换到指定 Agent

```
/agent         # 显示当前 Agent 和可用列表
/agent build   # 切换到 Build Agent
/agent plan    # 切换到 Plan Agent
```

### /session
显示当前会话的详细信息（ID、标题、模型、消息数等）

```
/session
```

### /quit 或 /exit
退出应用

```
/quit
/exit
```

## 命令提示

在输入框中输入 `/` 时，会自动显示匹配的命令列表。继续输入可以过滤命令：

- 输入 `/` → 显示所有命令
- 输入 `/h` → 显示 /help 命令
- 输入 `/ag` → 显示 /agent 命令

## 架构

命令系统由以下部分组成：

1. **命令注册表** (`packages/core/src/command/index.ts`)
   - 定义命令接口和执行逻辑
   - 管理所有内置命令

2. **会话视图集成** (`packages/app/src/tui/routes/session.tsx`)
   - 检测斜杠命令输入
   - 调用命令执行器
   - 显示命令结果

3. **输入组件** (`packages/app/src/tui/ui/input.tsx`)
   - 监听输入变化
   - 触发命令提示

## 添加自定义命令

```typescript
import { Command } from '@axiom-ai/core'

Command.register({
  name: 'mycommand',
  description: '我的自定义命令',
  usage: '/mycommand [参数]',
  execute: async (args, context) => {
    return {
      message: '命令执行成功',
      action: 'none'
    }
  }
})
```
