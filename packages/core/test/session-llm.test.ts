import { describe, expect, it } from 'bun:test'
import type { LLM } from '../src/session/llm'

describe('LLM', () => {
  describe('StreamInput 类型验证', () => {
    it('stream 函数接受正确的输入参数', () => {
      const input: LLM.StreamInput = {
        model: {} as any,
        messages: [{ role: 'user', content: 'Test' }],
        system: ['System prompt'],
        maxOutputTokens: 1000,
        temperature: 0.7,
      }

      expect(input.model).toBeDefined()
      expect(input.messages).toHaveLength(1)
      expect(input.system).toHaveLength(1)
      expect(input.maxOutputTokens).toBe(1000)
      expect(input.temperature).toBe(0.7)
    })

    it('stream 函数接受可选的 tools 参数', () => {
      const input: LLM.StreamInput = {
        model: {} as any,
        messages: [{ role: 'user', content: 'Test' }],
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

    it('stream 函数接受 abortSignal', () => {
      const controller = new AbortController()
      const input: LLM.StreamInput = {
        model: {} as any,
        messages: [{ role: 'user', content: 'Test' }],
        abortSignal: controller.signal,
      }

      expect(input.abortSignal).toBeDefined()
    })
  })

  describe('StreamEvent 类型验证', () => {
    it('text-delta 事件类型正确', () => {
      const event: LLM.StreamEvent = {
        type: 'text-delta',
        text: 'Hello',
      }

      expect(event.type).toBe('text-delta')
      if (event.type === 'text-delta') {
        expect(event.text).toBe('Hello')
      }
    })

    it('tool-call 事件类型正确', () => {
      const event: LLM.StreamEvent = {
        type: 'tool-call',
        toolCallId: 'call-123',
        toolName: 'testTool',
        input: { param: 'value' },
      }

      expect(event.type).toBe('tool-call')
      if (event.type === 'tool-call') {
        expect(event.toolCallId).toBe('call-123')
        expect(event.toolName).toBe('testTool')
      }
    })

    it('tool-result 事件类型正确', () => {
      const event: LLM.StreamEvent = {
        type: 'tool-result',
        toolCallId: 'call-123',
        output: { result: 'success' },
      }

      expect(event.type).toBe('tool-result')
      if (event.type === 'tool-result') {
        expect(event.toolCallId).toBe('call-123')
        expect(event.output).toEqual({ result: 'success' })
      }
    })

    it('finish 事件类型正确', () => {
      const event: LLM.StreamEvent = {
        type: 'finish',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      }

      expect(event.type).toBe('finish')
      if (event.type === 'finish') {
        expect(event.usage.inputTokens).toBe(10)
        expect(event.usage.outputTokens).toBe(20)
        expect(event.usage.totalTokens).toBe(30)
      }
    })

    it('error 事件类型正确', () => {
      const error = new Error('Test error')
      const event: LLM.StreamEvent = {
        type: 'error',
        error,
      }

      expect(event.type).toBe('error')
      if (event.type === 'error') {
        expect(event.error).toBe(error)
      }
    })
  })

  describe('GenerateResult 类型验证', () => {
    it('generate 返回结果类型正确', () => {
      const result: LLM.GenerateResult = {
        text: 'Generated text',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        finishReason: 'stop',
      }

      expect(result.text).toBe('Generated text')
      expect(result.usage.inputTokens).toBe(10)
      expect(result.finishReason).toBe('stop')
    })
  })

  describe('消息格式转换', () => {
    it('支持 user 消息', () => {
      const messages: LLM.StreamInput['messages'] = [{ role: 'user', content: 'Hello' }]

      expect(messages[0]?.role).toBe('user')
      expect(messages[0]?.content).toBe('Hello')
    })

    it('支持 assistant 消息', () => {
      const messages: LLM.StreamInput['messages'] = [{ role: 'assistant', content: 'Hi there' }]

      expect(messages[0]?.role).toBe('assistant')
      expect(messages[0]?.content).toBe('Hi there')
    })

    it('支持 system 消息', () => {
      const messages: LLM.StreamInput['messages'] = [{ role: 'system', content: 'System prompt' }]

      expect(messages[0]?.role).toBe('system')
      expect(messages[0]?.content).toBe('System prompt')
    })

    it('支持混合消息', () => {
      const messages: LLM.StreamInput['messages'] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' },
        { role: 'assistant', content: 'Assistant' },
      ]

      expect(messages).toHaveLength(3)
      expect(messages[0]?.role).toBe('system')
      expect(messages[1]?.role).toBe('user')
      expect(messages[2]?.role).toBe('assistant')
    })
  })

  describe('工具定义', () => {
    it('工具定义包含必需字段', () => {
      const tool = {
        description: 'Test tool',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ success: true }),
      }

      expect(tool.description).toBe('Test tool')
      expect(tool.parameters).toBeDefined()
      expect(typeof tool.execute).toBe('function')
    })

    it('工具 execute 返回 Promise', async () => {
      const tool = {
        description: 'Test tool',
        parameters: {},
        execute: async (args: any) => ({ result: args }),
      }

      const result = await tool.execute({ input: 'test' })
      expect(result).toEqual({ result: { input: 'test' } })
    })
  })
})
