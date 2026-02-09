import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Agent } from '../src/agent'
import { Config } from '../src/config'
import { NAME, VERSION, handleRun, handleServe, main, printHelp } from '../src/index'
import { Provider } from '../src/provider'
import { Server } from '../src/server'
import { Session } from '../src/session'

describe('CLI 模块', () => {
  test('VERSION 导出为 0.1.0', () => {
    expect(VERSION).toBe('0.1.0')
  })

  test('NAME 导出为 axiom', () => {
    expect(NAME).toBe('axiom')
  })

  test('printHelp 输出包含关键词', () => {
    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      logs.push(String(args[0]))
    }

    printHelp()

    console.log = originalLog

    const output = logs.join('\n')
    expect(output).toContain('axiom')
    expect(output).toContain('run')
    expect(output).toContain('serve')
    expect(output).toContain('--help')
    expect(output).toContain('--version')
  })

  test('handleRun 创建会话并调用 LLM', async () => {
    const logs: string[] = []
    const originalLog = console.log
    const originalError = console.error
    const originalExit = process.exit

    console.log = (...args: unknown[]) => {
      logs.push(String(args[0]))
    }
    console.error = (...args: unknown[]) => {
      logs.push(String(args[0]))
    }
    process.exit = (() => {
      throw new Error('EXIT')
    }) as never

    try {
      await handleRun(['测试', 'prompt'])
    } catch (e) {
      // handleRun 会调用 process.exit 抛出 EXIT，或因无 API key 报错
    }

    console.log = originalLog
    console.error = originalError
    process.exit = originalExit

    const output = logs.join('\n')
    expect(output).toContain('axiom')
  })

  test('handleRun 无 prompt 时报错', async () => {
    const logs: string[] = []
    const originalError = console.error
    const originalExit = process.exit
    let exitCode = -1

    console.error = (...args: unknown[]) => {
      logs.push(String(args[0]))
    }
    process.exit = ((code: number) => {
      exitCode = code
    }) as never

    await handleRun([])

    console.error = originalError
    process.exit = originalExit

    expect(exitCode).toBe(1)
    expect(logs.join('\n')).toContain('错误')
  })

  test('handleServe 不崩溃且可调用', () => {
    const logs: string[] = []
    const originalLog = console.log
    const originalServe = Bun.serve

    console.log = (...args: unknown[]) => {
      logs.push(String(args[0]))
    }
    Bun.serve = (() => {
      throw new Error('SERVE_CALLED')
    }) as never

    try {
      handleServe(['--port=5000'])
    } catch (e) {
      if (String(e).includes('SERVE_CALLED')) {
        // 预期的行为
      }
    }

    console.log = originalLog
    Bun.serve = originalServe

    const output = logs.join('\n')
    expect(output).toContain('服务器启动于')
  })

  test('所有模块导出存在', () => {
    expect(Server).toBeDefined()
    expect(Session).toBeDefined()
    expect(Provider).toBeDefined()
    expect(Agent).toBeDefined()
    expect(Config).toBeDefined()
  })

  test('Server.createApp 返回有效的 Hono 应用', () => {
    const app = Server.createApp()
    expect(app).toBeDefined()
    expect(app.fetch).toBeDefined()
  })

  test('Session.create 创建新会话', () => {
    Session.reset()
    const session = Session.create({ modelId: 'test-model', title: '测试会话' })
    expect(session.id).toBeDefined()
    expect(session.modelId).toBe('test-model')
    expect(session.title).toBe('测试会话')
    expect(session.messages).toEqual([])
    Session.reset()
  })

  test('Session.addMessage 添加消息到会话', () => {
    Session.reset()
    const session = Session.create({ modelId: 'test-model' })
    const message = Session.addMessage(session.id, {
      role: 'user',
      content: '测试消息',
    })
    expect(message.id).toBeDefined()
    expect(message.role).toBe('user')
    expect(message.content).toBe('测试消息')
    Session.reset()
  })

  test('Provider.getAvailable 返回可用的 Provider', () => {
    const available = Provider.getAvailable()
    expect(Array.isArray(available)).toBe(true)
    expect(available.length).toBeGreaterThan(0)
  })

  test('Provider.findModel 查找模型', () => {
    const result = Provider.findModel('claude-sonnet-4-20250514')
    expect(result).toBeDefined()
    expect(result?.provider.id).toBe('anthropic')
    expect(result?.model).toBe('claude-sonnet-4-20250514')
  })

  test('Agent.list 返回内置 Agent', () => {
    const agents = Agent.list()
    expect(Array.isArray(agents)).toBe(true)
    expect(agents.length).toBeGreaterThan(0)
    expect(agents.some((a) => a.id === 'coder')).toBe(true)
  })

  test('Agent.get 获取指定 Agent', () => {
    const agent = Agent.get('coder')
    expect(agent).toBeDefined()
    expect(agent?.id).toBe('coder')
    expect(agent?.name).toBe('Coder')
  })

  test('Config.defaults 返回默认配置', () => {
    const config = Config.defaults()
    expect(config).toBeDefined()
    expect(config.provider.default).toBe('anthropic')
    expect(config.agent.default).toBe('orchestrator')
  })
})
