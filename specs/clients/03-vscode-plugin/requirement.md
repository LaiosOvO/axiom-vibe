# SPEC-C03: VSCode 插件

> 里程碑: M3 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: C01

## 目标

实现 VSCode 插件配置和命令注册骨架。插件通过 WebView Panel 展示 Axiom 界面，通过 SDK 连接后端。

## 需求

### R1: VscodePlugin 命名空间（packages/vscode）

```typescript
export namespace VscodePlugin {
  export const Config = z.object({
    serverPort: z.number().default(4096),
    autoStart: z.boolean().default(true),
    panelTitle: z.string().default('Axiom AI'),
    showInStatusBar: z.boolean().default(true),
  })
  export type Config = z.infer<typeof Config>

  export const Command = z.object({
    id: z.string(),
    title: z.string(),
    category: z.string().default('Axiom'),
    keybinding: z.string().optional(),
  })
  export type Command = z.infer<typeof Command>

  // 获取默认注册命令列表
  export function getCommands(): Command[];
  
  // 生成 package.json 的 contributes 部分
  export function generateContributes(commands: Command[], config: Config): object;
  
  export function getDefaultConfig(): Config;
}
```

### R2: 默认命令列表

| id | title | keybinding |
|----|-------|------------|
| axiom.open | 打开 Axiom 面板 | Ctrl+Shift+A |
| axiom.newSession | 新建会话 | - |
| axiom.sendMessage | 发送消息 | - |
| axiom.togglePanel | 切换面板 | Ctrl+Shift+A |

## 验收场景

### 场景 1: 获取命令列表
- **当** getCommands()
- **那么** 返回至少 4 个命令

### 场景 2: 生成 contributes
- **当** generateContributes 传入命令和配置
- **那么** 返回包含 commands 和 keybindings 数组的对象

### 场景 3: 默认配置
- **当** getDefaultConfig()
- **那么** autoStart 为 true，panelTitle 为 'Axiom AI'
