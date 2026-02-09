// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

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

  export function getCommands(): Command[] {
    return [
      {
        id: 'axiom.open',
        title: '打开 Axiom 面板',
        category: 'Axiom',
        keybinding: 'Ctrl+Shift+A',
      },
      {
        id: 'axiom.newSession',
        title: '新建会话',
        category: 'Axiom',
      },
      {
        id: 'axiom.sendMessage',
        title: '发送消息',
        category: 'Axiom',
      },
      {
        id: 'axiom.togglePanel',
        title: '切换面板',
        category: 'Axiom',
        keybinding: 'Ctrl+Shift+A',
      },
    ]
  }

  export function generateContributes(commands: Command[], config: Config): object {
    const contributes = {
      commands: commands.map((cmd) => ({
        command: cmd.id,
        title: cmd.title,
        category: cmd.category,
      })),
      keybindings: commands
        .filter((cmd) => cmd.keybinding)
        .map((cmd) => ({
          command: cmd.id,
          key: cmd.keybinding,
        })),
    }
    return contributes
  }

  export function getDefaultConfig(): Config {
    return Config.parse({})
  }

  /** 面板状态 */
  export type PanelState = 'hidden' | 'visible' | 'focused'

  /** 扩展状态 */
  export interface ExtensionState {
    panelState: PanelState
    serverConnected: boolean
    serverUrl: string
    currentSessionId?: string
    config: Config
  }

  /** 获取初始状态 */
  export function getInitialState(config?: Partial<Config>): ExtensionState {
    const mergedConfig = Config.parse(config || {})
    return {
      panelState: 'hidden',
      serverConnected: false,
      serverUrl: `http://127.0.0.1:${mergedConfig.serverPort}`,
      config: mergedConfig,
    }
  }

  /** 处理命令 */
  export function handleCommand(state: ExtensionState, commandId: string): ExtensionState {
    switch (commandId) {
      case 'axiom.open':
      case 'axiom.togglePanel':
        return {
          ...state,
          panelState: state.panelState === 'visible' ? 'hidden' : 'visible',
        }
      case 'axiom.newSession':
        return {
          ...state,
          panelState: 'visible',
          currentSessionId: undefined,
        }
      default:
        return state
    }
  }

  /** 生成 package.json contributes 部分 */
  export function generatePackageJsonContributes(config: Config): object {
    const commands = getCommands()
    return {
      commands: commands.map((cmd) => ({
        command: cmd.id,
        title: cmd.title,
        category: cmd.category,
      })),
      keybindings: commands
        .filter((cmd) => cmd.keybinding)
        .map((cmd) => ({
          command: cmd.id,
          key: cmd.keybinding,
          when: 'editorFocus',
        })),
      viewsContainers: {
        activitybar: [
          {
            id: 'axiom-sidebar',
            title: config.panelTitle,
            icon: 'resources/icon.svg',
          },
        ],
      },
      views: {
        'axiom-sidebar': [
          {
            id: 'axiom-chat',
            name: '对话',
            type: 'webview',
          },
        ],
      },
      configuration: {
        title: config.panelTitle,
        properties: {
          'axiom.serverPort': {
            type: 'number',
            default: config.serverPort,
            description: 'Axiom 服务器端口',
          },
          'axiom.autoStart': {
            type: 'boolean',
            default: config.autoStart,
            description: '是否自动启动服务器',
          },
        },
      },
    }
  }

  /** 生成 WebView HTML */
  export function generateWebViewHtml(state: ExtensionState): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${state.config.panelTitle}</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 16px; }
    #chat { display: flex; flex-direction: column; height: 100vh; }
    #messages { flex: 1; overflow-y: auto; }
    #input-area { display: flex; gap: 8px; padding: 8px 0; }
    #input-area input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 6px 8px; }
    #input-area button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 16px; cursor: pointer; }
    .message { margin: 8px 0; padding: 8px; border-radius: 4px; }
    .user { background: var(--vscode-textBlockQuote-background); }
    .assistant { background: var(--vscode-editor-inactiveSelectionBackground); }
    .status { text-align: center; color: var(--vscode-descriptionForeground); padding: 16px; }
  </style>
</head>
<body>
  <div id="chat">
    <div id="messages">
      <div class="status">${state.serverConnected ? '已连接到 Axiom 服务器' : '未连接 - 请启动 Axiom 服务器'}</div>
    </div>
    <div id="input-area">
      <input type="text" placeholder="输入消息..." ${state.serverConnected ? '' : 'disabled'} />
      <button ${state.serverConnected ? '' : 'disabled'}>发送</button>
    </div>
  </div>
</body>
</html>`
  }
}
