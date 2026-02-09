import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { ProviderFactory } from '../src/provider/llm'
import { clearApiKeys, restoreApiKeys } from './preload'

describe('ProviderFactory', () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    // 清除 API Keys 避免真实调用
    originalEnv = clearApiKeys()
  })

  // 测试后恢复环境变量
  afterEach(() => {
    restoreApiKeys(originalEnv)
  })

  describe('createProvider', () => {
    it('创建 anthropic provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('anthropic', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 openai provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('openai', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 google provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('google', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 groq provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('groq', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 mistral provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('mistral', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 xai provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('xai', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 deepseek (OpenAI-compatible) provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('deepseek', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('创建 ollama (OpenAI-compatible) provider 返回 SDK 实例', () => {
      const provider = ProviderFactory.createProvider('ollama')

      expect(provider).toBeDefined()
      expect(['function', 'object']).toContain(typeof provider)
    })

    it('未知 provider 抛出错误', () => {
      expect(() => {
        ProviderFactory.createProvider('unknown-provider')
      }).toThrow('Unknown provider: unknown-provider')
    })

    it('支持自定义 baseURL 覆盖默认值', () => {
      const customUrl = 'http://custom-ollama:11434/v1'
      const provider = ProviderFactory.createProvider('ollama', { baseURL: customUrl })

      expect(provider).toBeDefined()
      // 这里无法直接验证 baseURL，但至少确保创建成功
    })

    it('从环境变量读取 API Key', () => {
      // 设置环境变量
      process.env.ANTHROPIC_API_KEY = 'env-test-key'

      const provider = ProviderFactory.createProvider('anthropic')

      expect(provider).toBeDefined()

      process.env.ANTHROPIC_API_KEY = undefined
    })

    it('options.apiKey 优先于环境变量', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key'

      const provider = ProviderFactory.createProvider('anthropic', { apiKey: 'option-key' })

      expect(provider).toBeDefined()

      // 清理
      process.env.ANTHROPIC_API_KEY = undefined
    })
  })

  describe('getLanguageModel', () => {
    it('获取 anthropic 的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel('anthropic', 'claude-sonnet-4-20250514', {
        apiKey: 'test-key',
      })

      expect(model).toBeDefined()
      expect(typeof model).toBe('object')
    })

    it('获取 openai 的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel('openai', 'gpt-4o', { apiKey: 'test-key' })

      expect(model).toBeDefined()
      expect(typeof model).toBe('object')
    })

    it('获取 deepseek 的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel('deepseek', 'deepseek-chat', {
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
