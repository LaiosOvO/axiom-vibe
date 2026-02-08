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
}
