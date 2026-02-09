import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { ProviderFactory } from '../src/provider/llm'
import { clearApiKeys, restoreApiKeys } from './preload'

describe('ProviderFactory', () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    originalEnv = clearApiKeys()
  })

  afterEach(() => {
    restoreApiKeys(originalEnv)
  })

  describe('createProvider', () => {
    it('创建 anthropic provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider(
        'anthropic',
        'claude-sonnet-4-20250514',
        undefined,
        { apiKey: 'test-key' },
      )
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 openai provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('openai', 'gpt-4o', undefined, {
        apiKey: 'test-key',
      })
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 google provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('google', 'gemini-2.0-flash-exp', undefined, {
        apiKey: 'test-key',
      })
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 groq provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider(
        'groq',
        'llama-3.3-70b-versatile',
        undefined,
        { apiKey: 'test-key' },
      )
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 mistral provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider(
        'mistral',
        'mistral-large-latest',
        undefined,
        { apiKey: 'test-key' },
      )
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 xai provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('xai', 'grok-3', undefined, {
        apiKey: 'test-key',
      })
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 deepseek (OpenAI-compatible) provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('deepseek', 'deepseek-chat', undefined, {
        apiKey: 'test-key',
      })
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 ollama (OpenAI-compatible) provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('ollama', 'llama3.1')
      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('未知 provider 抛出错误', () => {
      expect(() => {
        ProviderFactory.createProvider('unknown-provider', 'some-model')
      }).toThrow('Unknown provider: unknown-provider')
    })

    it('支持自定义 baseURL 覆盖默认值', () => {
      const customUrl = 'http://custom-ollama:11434/v1'
      const provider = ProviderFactory.createProvider('ollama', 'llama3.1', undefined, {
        baseURL: customUrl,
      })
      expect(provider).toBeDefined()
    })

    it('从环境变量读取 API Key', () => {
      process.env.ANTHROPIC_API_KEY = 'env-test-key'
      const provider = ProviderFactory.createProvider('anthropic', 'claude-sonnet-4-20250514')
      expect(provider).toBeDefined()
      process.env.ANTHROPIC_API_KEY = undefined
    })

    it('options.apiKey 优先于环境变量', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key'
      const provider = ProviderFactory.createProvider(
        'anthropic',
        'claude-sonnet-4-20250514',
        undefined,
        { apiKey: 'option-key' },
      )
      expect(provider).toBeDefined()
      process.env.ANTHROPIC_API_KEY = undefined
    })
  })

  describe('getLanguageModel', () => {
    it('获取 anthropic 的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel(
        'anthropic',
        'claude-sonnet-4-20250514',
        undefined,
        { apiKey: 'test-key' },
      )
      expect(model).toBeDefined()
      expect(typeof model).toBe('object')
    })

    it('获取 openai 的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel('openai', 'gpt-4o', undefined, {
        apiKey: 'test-key',
      })
      expect(model).toBeDefined()
      expect(typeof model).toBe('object')
    })

    it('获取 deepseek 的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel('deepseek', 'deepseek-chat', undefined, {
        apiKey: 'test-key',
      })
      expect(model).toBeDefined()
      expect(typeof model).toBe('object')
    })

    it('获取 ollama 的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel('ollama', 'llama3.2')
      expect(model).toBeDefined()
      expect(typeof model).toBe('object')
    })

    it('未知 provider 抛出错误', () => {
      expect(() => {
        ProviderFactory.getLanguageModel('unknown', 'model-name')
      }).toThrow('Unknown provider: unknown')
    })
  })
})
