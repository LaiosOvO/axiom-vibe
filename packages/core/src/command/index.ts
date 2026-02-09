import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent } from '../agent/index.js'
import { Provider } from '../provider/index.js'
import { Session } from '../session/index.js'

function loadTemplate(name: string): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url))
    return readFileSync(join(dir, 'template', name), 'utf-8')
  } catch {
    return ''
  }
}

export namespace Command {
  /**
   * 命令上下文
   */
  export interface CommandContext {
    sessionId: string
    currentAgent?: string
    currentModel?: string
  }

  /**
   * 命令执行结果
   */
  export interface CommandResult {
    message: string
    action?:
      | 'clear'
      | 'navigate-home'
      | 'switch-agent'
      | 'switch-model'
      | 'quit'
      | 'none'
      | 'template'
    data?: unknown
    template?: string
  }

  export interface Def {
    name: string
    description: string
    usage: string
    aliases?: string[]
    execute?: (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult
    template?: string
    hints?: string[]
    subtask?: boolean
    agent?: string
    model?: string
  }

  export function hints(template: string): string[] {
    const result: string[] = []
    const numbered = template.match(/\$\d+/g)
    if (numbered) {
      for (const match of [...new Set(numbered)].sort()) result.push(match)
    }
    if (template.includes('$ARGUMENTS')) result.push('$ARGUMENTS')
    return result
  }

  const registry = new Map<string, Def>()

  /**
   * 注册命令
   */
  export function register(command: Def): void {
    registry.set(command.name, command)
    if (command.aliases) {
      for (const alias of command.aliases) {
        registry.set(alias, command)
      }
    }
  }

  /**
   * 获取命令
   */
  export function get(name: string): Def | undefined {
    return registry.get(name)
  }

  /**
   * 列出所有命令（去重）
   */
  export function list(): Def[] {
    const uniqueCommands = new Map<string, Def>()
    for (const [key, cmd] of registry.entries()) {
      if (cmd.name === key) {
        uniqueCommands.set(key, cmd)
      }
    }
    return Array.from(uniqueCommands.values())
  }

  /**
   * 执行命令
   */
  export async function execute(
    commandText: string,
    context: CommandContext,
  ): Promise<CommandResult | undefined> {
    if (!commandText.startsWith('/')) {
      return undefined
    }

    const parts = commandText.trim().split(/\s+/)
    const cmdName = parts[0]?.slice(1) // 去掉 /
    const args = parts.slice(1)

    if (!cmdName) {
      return undefined
    }

    const command = get(cmdName)
    if (!command) {
      return {
        message: `❌ 未知命令: /${cmdName}\n\n使用 /help 查看可用命令`,
        action: 'none',
      }
    }

    if (command.template) {
      const argsText = args.join(' ')
      const rendered = command.template.replace(/\$ARGUMENTS/g, argsText)
      return {
        message: rendered,
        action: 'template',
        template: rendered,
      }
    }

    if (!command.execute) {
      return { message: `❌ 命令 /${cmdName} 无法执行`, action: 'none' }
    }

    return await command.execute(args, context)
  }

  /**
   * 根据前缀过滤命令
   */
  export function filterByPrefix(prefix: string): Def[] {
    if (!prefix.startsWith('/')) {
      return []
    }

    const cmdPrefix = prefix.slice(1).toLowerCase()
    return list().filter((cmd) => {
      if (cmd.name.toLowerCase().startsWith(cmdPrefix)) {
        return true
      }
      if (cmd.aliases) {
        return cmd.aliases.some((alias) => alias.toLowerCase().startsWith(cmdPrefix))
      }
      return false
    })
  }

  // ========== 内置命令 ==========

  /**
   * /help - 显示帮助信息
   */
  register({
    name: 'help',
    description: '显示可用命令列表',
    usage: '/help',
    execute: () => {
      const commands = list()
      const commandList = commands
        .map((cmd) => {
          const aliases = cmd.aliases
            ? ` (别名: ${cmd.aliases.map((a) => `/${a}`).join(', ')})`
            : ''
          return `  ${cmd.usage}${aliases}\n    ${cmd.description}`
        })
        .join('\n\n')

      return {
        message: `📋 可用命令:\n\n${commandList}`,
        action: 'none',
      }
    },
  })

  /**
   * /clear - 清空当前会话消息
   */
  register({
    name: 'clear',
    description: '清空当前会话的所有消息',
    usage: '/clear',
    execute: (args, context) => {
      const session = Session.get(context.sessionId)
      if (!session) {
        return {
          message: '❌ 会话不存在',
          action: 'none',
        }
      }

      const messageCount = session.messages.length
      session.messages = []
      session.updatedAt = Date.now()

      Session.save(context.sessionId).catch((error) => {
        console.error('保存会话失败:', error)
      })

      return {
        message: `✅ 已清空 ${messageCount} 条消息`,
        action: 'clear',
      }
    },
  })

  /**
   * /compact - 压缩会话历史
   */
  register({
    name: 'compact',
    description: '压缩会话历史，只保留最近 N 条消息（默认 20）',
    usage: '/compact [数量]',
    execute: (args, context) => {
      const session = Session.get(context.sessionId)
      if (!session) {
        return {
          message: '❌ 会话不存在',
          action: 'none',
        }
      }

      const keepCount = args[0] ? Number.parseInt(args[0], 10) : 20
      if (Number.isNaN(keepCount) || keepCount < 1) {
        return {
          message: '❌ 无效的数量参数',
          action: 'none',
        }
      }

      const originalCount = session.messages.length
      if (originalCount <= keepCount) {
        return {
          message: `ℹ️ 当前消息数量 (${originalCount}) 不超过保留数量 (${keepCount})，无需压缩`,
          action: 'none',
        }
      }

      session.messages = session.messages.slice(-keepCount)
      session.updatedAt = Date.now()

      Session.save(context.sessionId).catch((error) => {
        console.error('保存会话失败:', error)
      })

      return {
        message: `✅ 已压缩会话历史：${originalCount} → ${session.messages.length} 条消息`,
        action: 'none',
      }
    },
  })

  /**
   * /model - 显示或切换模型
   */
  register({
    name: 'model',
    description: '显示当前模型或切换到指定模型',
    usage: '/model [provider/model]',
    execute: (args, context) => {
      const session = Session.get(context.sessionId)
      if (!session) {
        return {
          message: '❌ 会话不存在',
          action: 'none',
        }
      }

      // 如果没有参数，显示当前模型和可用模型列表
      if (args.length === 0) {
        const providers = Provider.getAvailable()
        const providerList = providers
          .map((p) => {
            const models = Object.keys(p.models)
              .map((m) => `    • ${p.id}/${m}`)
              .join('\n')
            return `  ${p.name} (${p.id}):\n${models}`
          })
          .join('\n\n')

        return {
          message: `当前模型: ${session.modelId}\n\n可用模型:\n${providerList}\n\n使用 /model <provider/model> 切换模型`,
          action: 'none',
        }
      }

      // 切换模型
      const modelId = args[0]
      if (!modelId) {
        return {
          message: '❌ 请指定模型 ID',
          action: 'none',
        }
      }

      // 验证模型格式
      if (!modelId.includes('/')) {
        return {
          message: '❌ 模型 ID 格式错误，应为 provider/model',
          action: 'none',
        }
      }

      const [providerId] = modelId.split('/')
      if (!providerId) {
        return {
          message: '❌ 模型 ID 格式错误',
          action: 'none',
        }
      }

      const provider = Provider.get(providerId)
      if (!provider) {
        return {
          message: `❌ Provider "${providerId}" 不存在`,
          action: 'none',
        }
      }

      session.modelId = modelId
      session.updatedAt = Date.now()

      Session.save(context.sessionId).catch((error) => {
        console.error('保存会话失败:', error)
      })

      return {
        message: `✅ 已切换到模型: ${modelId}`,
        action: 'switch-model',
      }
    },
  })

  /**
   * /agent - 显示或切换 Agent
   */
  register({
    name: 'agent',
    description: '显示当前 Agent 或切换到指定 Agent',
    usage: '/agent [agent-id]',
    execute: (args, context) => {
      const session = Session.get(context.sessionId)
      if (!session) {
        return {
          message: '❌ 会话不存在',
          action: 'none',
        }
      }

      const agentId = args[0]

      // 如果没有参数，显示当前 Agent 和可用列表
      if (!agentId) {
        const currentAgentId = session.agentId || 'build'
        const currentAgent = Agent.getAgentDef(currentAgentId)
        const allAgents = Agent.listAgentDefs()

        const agentList = allAgents.map((a) => `  • ${a.id}: ${a.name}`).join('\n')
        const systemMessage = `当前 Agent: ${currentAgent?.name ?? currentAgentId}\n\n可用 Agents:\n${agentList}\n\n使用 /agent <id> 切换 Agent`

        return {
          message: systemMessage,
          action: 'none',
        }
      }

      // 切换 Agent
      const agent = Agent.getAgentDef(agentId)
      if (!agent) {
        const allAgents = Agent.listAgentDefs()
        const agentList = allAgents.map((a) => `  • ${a.id}: ${a.name}`).join('\n')
        const errorMessage = `❌ Agent "${agentId}" 不存在\n\n可用 Agents:\n${agentList}`

        return {
          message: errorMessage,
          action: 'none',
        }
      }

      session.agentId = agentId
      session.updatedAt = Date.now()

      Session.save(context.sessionId).catch((error) => {
        console.error('保存会话失败:', error)
      })

      return {
        message: `✅ 已切换到 Agent: ${agent.name}`,
        action: 'switch-agent',
      }
    },
  })

  /**
   * /session - 显示会话信息
   */
  register({
    name: 'session',
    description: '显示当前会话的详细信息',
    usage: '/session',
    execute: (args, context) => {
      const session = Session.get(context.sessionId)
      if (!session) {
        return {
          message: '❌ 会话不存在',
          action: 'none',
        }
      }

      const createdDate = new Date(session.createdAt).toLocaleString('zh-CN')
      const updatedDate = new Date(session.updatedAt).toLocaleString('zh-CN')
      const agentName =
        Agent.getAgentDef(session.agentId || 'build')?.name ?? session.agentId ?? 'Build'

      return {
        message: `📊 会话信息:\n\nID: ${session.id}\n标题: ${session.title}\n模型: ${session.modelId}\nAgent: ${agentName}\n消息数: ${session.messages.length}\n创建时间: ${createdDate}\n更新时间: ${updatedDate}`,
        action: 'none',
      }
    },
  })

  /**
   * /quit 或 /exit - 退出应用
   */
  register({
    name: 'quit',
    description: '退出应用',
    usage: '/quit',
    aliases: ['exit'],
    execute: () => {
      return {
        message: '👋 再见！',
        action: 'quit',
      }
    },
  })

  const initTemplate = loadTemplate('initialize.txt')
  if (initTemplate) {
    register({
      name: 'init',
      description: '创建/更新 AGENTS.md',
      usage: '/init [额外说明]',
      template: initTemplate,
      hints: hints(initTemplate),
    })
  }

  const reviewTemplate = loadTemplate('review.txt')
  if (reviewTemplate) {
    register({
      name: 'review',
      description: '代码审查 [commit|branch|pr]，默认审查未提交变更',
      usage: '/review [commit|branch|pr]',
      template: reviewTemplate,
      hints: hints(reviewTemplate),
      subtask: true,
    })
  }
}
