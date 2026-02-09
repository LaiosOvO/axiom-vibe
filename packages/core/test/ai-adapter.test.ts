import { describe, expect, it } from 'bun:test'
import { AiAdapter } from '../src/provider/adapter'

describe('AiAdapter', () => {
  describe('createModelId', () => {
    it('正确拼接 providerId 和 modelName', () => {
      const result = AiAdapter.createModelId('openai', 'gpt-4o')
      expect(result).toBe('openai/gpt-4o')
    })

    it('处理含特殊字符的 modelName', () => {
      const result = AiAdapter.createModelId('anthropic', 'claude-sonnet-4-20250514')
      expect(result).toBe('anthropic/claude-sonnet-4-20250514')
    })
  })

  describe('parseModelId', () => {
    it('正确分割简单的 modelId', () => {
      const result = AiAdapter.parseModelId('openai:gpt-4o')
      expect(result.providerId).toBe('openai')
      expect(result.modelName).toBe('gpt-4o')
    })

    it('处理含冒号的 model name（如 bedrock 模型）', () => {
      const result = AiAdapter.parseModelId('bedrock:anthropic.claude-sonnet-4-20250514-v2:0')
      expect(result.providerId).toBe('bedrock')
      expect(result.modelName).toBe('anthropic.claude-sonnet-4-20250514-v2:0')
    })

    it('处理多个冒号的情况', () => {
      const result = AiAdapter.parseModelId('provider:model:with:colons')
      expect(result.providerId).toBe('provider')
      expect(result.modelName).toBe('model:with:colons')
    })
  })

  describe('buildGenerateParams', () => {
    it('返回正确的参数结构', () => {
      const options: AiAdapter.GenerateOptions = {
        model: 'gpt-4o',
        system: 'You are a helpful assistant',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        maxTokens: 1000,
        temperature: 0.7,
      }

      const result = AiAdapter.buildGenerateParams(options)

      expect(result.model).toBe('gpt-4o')
      expect(result.system).toBe('You are a helpful assistant')
      expect(result.messages).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ])
      expect(result.maxTokens).toBe(1000)
      expect(result.temperature).toBe(0.7)
    })

    it('处理可选字段为 undefined', () => {
      const options: AiAdapter.GenerateOptions = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const result = AiAdapter.buildGenerateParams(options)

      expect(result.model).toBe('gpt-4o')
      expect(result.system).toBeUndefined()
      expect(result.maxTokens).toBeUndefined()
      expect(result.temperature).toBeUndefined()
    })
  })

  describe('normalizeResult', () => {
    it('处理完整的结果对象', () => {
      const raw = {
        text: 'Hello, world!',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        finishReason: 'stop',
      }

      const result = AiAdapter.normalizeResult(raw)

      expect(result.text).toBe('Hello, world!')
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      })
      expect(result.finishReason).toBe('stop')
    })

    it('处理 undefined 字段，使用默认值', () => {
      const raw = {
        text: undefined,
        usage: {
          promptTokens: undefined,
          completionTokens: undefined,
          totalTokens: undefined,
        },
      }

      const result = AiAdapter.normalizeResult(raw)

      expect(result.text).toBe('')
      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      })
      expect(result.finishReason).toBeUndefined()
    })

    it('处理缺失的 usage 对象', () => {
      const raw = {
        text: 'Response',
      }

      const result = AiAdapter.normalizeResult(raw)

      expect(result.text).toBe('Response')
      expect(result.usage).toBeUndefined()
    })
  })

  describe('normalizeStreamDelta', () => {
    it('处理 text-delta 事件', () => {
      const delta = {
        type: 'text-delta',
        textDelta: 'Hello ',
      }

      const result = AiAdapter.normalizeStreamDelta(delta)

      expect(result.type).toBe('text-delta')
      expect(result.text).toBe('Hello ')
    })

    it('处理 text-delta 事件，textDelta 为 undefined', () => {
      const delta = {
        type: 'text-delta',
        textDelta: undefined,
      }

      const result = AiAdapter.normalizeStreamDelta(delta)

      expect(result.type).toBe('text-delta')
      expect(result.text).toBe('')
    })

    it('处理非 text-delta 事件，返回 finish', () => {
      const delta = {
        type: 'finish',
      }

      const result = AiAdapter.normalizeStreamDelta(delta)

      expect(result.type).toBe('finish')
      expect(result.text).toBeUndefined()
    })

    it('处理 error 类型事件', () => {
      const delta = {
        type: 'error',
      }

      const result = AiAdapter.normalizeStreamDelta(delta)

      expect(result.type).toBe('finish')
    })
  })
})
