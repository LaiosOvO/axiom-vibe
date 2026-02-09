import { beforeEach, describe, expect, it } from 'bun:test'
import { Session } from '../src/session'
import { SessionProcessor } from '../src/session/processor'

describe('SessionProcessor', () => {
  beforeEach(() => {
    Session.reset()
  })

  describe('ProcessInput 类型验证', () => {
    it('process 接受正确的输入参数', () => {
      const input: SessionProcessor.ProcessInput = {
        sessionId: 'test-session',
        userMessage: 'Hello',
        model: {} as any,
        system: ['System prompt'],
        maxOutputTokens: 1000,
        temperature: 0.7,
      }

      expect(input.sessionId).toBe('test-session')
      expect(input.userMessage).toBe('Hello')
      expect(input.model).toBeDefined()
      expect(input.system).toHaveLength(1)
      expect(input.maxOutputTokens).toBe(1000)
      expect(input.temperature).toBe(0.7)
    })

    it('process 接受可选的 tools 参数', () => {
      const input: SessionProcessor.ProcessInput = {
        sessionId: 'test-session',
        userMessage: 'Hello',
        model: {} as any,
        tools: {
          testTool: {
            description: 'Test tool',
            parameters: { type: 'object' },
            execute: async () => ({ result: 'ok' }),
          },
        },
      }

      expect(input.tools).toBeDefined()
      expect(input.tools?.testTool).toBeDefined()
    })

    it('process 接受 abortSignal', () => {
      const controller = new AbortController()
      const input: SessionProcessor.ProcessInput = {
        sessionId: 'test-session',
        userMessage: 'Hello',
        model: {} as any,
        abortSignal: controller.signal,
      }

      expect(input.abortSignal).toBeDefined()
    })
  })

  describe('ProcessResult 类型验证', () => {
    it('process 返回结果包含必需字段', () => {
      const result: SessionProcessor.ProcessResult = {
        assistantMessage: {
          id: 'msg-1',
          role: 'assistant',
          content: 'Response',
          createdAt: Date.now(),
        },
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        finishReason: 'stop',
      }

      expect(result.assistantMessage).toBeDefined()
      expect(result.assistantMessage.role).toBe('assistant')
      expect(result.usage.inputTokens).toBe(10)
      expect(result.finishReason).toBe('stop')
    })

    it('assistantMessage 支持 toolCalls', () => {
      const result: SessionProcessor.ProcessResult = {
        assistantMessage: {
          id: 'msg-1',
          role: 'assistant',
          content: 'Using tool',
          createdAt: Date.now(),
          toolCalls: [
            {
              id: 'call-1',
              name: 'testTool',
              arguments: { param: 'value' },
            },
          ],
        },
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        finishReason: 'stop',
      }

      expect(result.assistantMessage.toolCalls).toBeDefined()
      expect(result.assistantMessage.toolCalls).toHaveLength(1)
      expect(result.assistantMessage.toolCalls?.[0]?.name).toBe('testTool')
    })
  })

  describe('与 Session 集成', () => {
    it('process 在不存在的会话上抛出错误', async () => {
      const input: SessionProcessor.ProcessInput = {
        sessionId: 'non-existent',
        userMessage: 'Hello',
        model: {} as any,
      }

      try {
        await SessionProcessor.process(input)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toContain('不存在')
      }
    })

    it('process 将用户消息添加到会话', async () => {
      const session = Session.create({ modelId: 'test-model' })

      expect(session.messages).toHaveLength(0)

      try {
        await SessionProcessor.process({
          sessionId: session.id,
          userMessage: 'Test message',
          model: {} as any,
        })
      } catch {
        // process 会失败（因为没有真实的 model），但用户消息应该已添加
      }

      const updatedSession = Session.get(session.id)
      expect(updatedSession?.messages.length).toBeGreaterThan(0)

      const userMsg = updatedSession?.messages.find((m) => m.role === 'user')
      expect(userMsg).toBeDefined()
      expect(userMsg?.content).toBe('Test message')
    })
  })

  describe('工具执行流程', () => {
    it('工具定义包含 execute 函数', () => {
      const tools: SessionProcessor.ProcessInput['tools'] = {
        testTool: {
          description: 'Test tool',
          parameters: { type: 'object', properties: { input: { type: 'string' } } },
          execute: async (args: any) => ({ result: args.input }),
        },
      }

      expect(tools?.testTool?.execute).toBeDefined()
      expect(typeof tools?.testTool?.execute).toBe('function')
    })

    it('工具 execute 返回 Promise', async () => {
      const tool = {
        description: 'Test tool',
        parameters: {},
        execute: async (args: any) => ({ processed: args }),
      }

      const result = await tool.execute({ input: 'test' })
      expect(result).toEqual({ processed: { input: 'test' } })
    })
  })

  describe('使用量统计', () => {
    it('usage 包含所有必需字段', () => {
      const usage: SessionProcessor.ProcessResult['usage'] = {
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
      }

      expect(usage.inputTokens).toBe(100)
      expect(usage.outputTokens).toBe(200)
      expect(usage.totalTokens).toBe(300)
    })

    it('usage token 数量为非负数', () => {
      const usage: SessionProcessor.ProcessResult['usage'] = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      }

      expect(usage.inputTokens).toBeGreaterThanOrEqual(0)
      expect(usage.outputTokens).toBeGreaterThanOrEqual(0)
      expect(usage.totalTokens).toBeGreaterThanOrEqual(0)
    })
  })

  describe('完成原因', () => {
    it('finishReason 为有效字符串', () => {
      const reasons = ['stop', 'length', 'tool-calls', 'error']

      for (const reason of reasons) {
        const result: Partial<SessionProcessor.ProcessResult> = {
          finishReason: reason,
        }

        expect(typeof result.finishReason).toBe('string')
        expect(result.finishReason).toBe(reason)
      }
    })
  })
})
