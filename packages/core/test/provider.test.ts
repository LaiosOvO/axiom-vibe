import { beforeEach, describe, expect, it } from 'bun:test'
import { Provider } from '../src/provider/index.ts'

describe('Provider', () => {
  beforeEach(() => {
    Provider.reset()
  })

  it('应该能获取内置 provider', () => {
    const anthropic = Provider.get('anthropic')

    expect(anthropic).toBeDefined()
    expect(anthropic?.id).toBe('anthropic')
    expect(anthropic?.name).toBe('Anthropic')
    expect(typeof anthropic?.models).toBe('object')
    expect(Object.keys(anthropic!.models).length).toBeGreaterThan(0)
    expect(anthropic?.env).toContain('ANTHROPIC_API_KEY')
  })

  it('应该能列出所有注册的 providers (>=15)', () => {
    const providers = Provider.list()

    expect(providers.length).toBeGreaterThanOrEqual(15)

    const ids = providers.map((p) => p.id)
    expect(ids).toContain('anthropic')
    expect(ids).toContain('openai')
    expect(ids).toContain('google')
    expect(ids).toContain('groq')
    expect(ids).toContain('together')
  })

  it('应该能通过模型名查找 provider', () => {
    const result = Provider.findModel('claude-sonnet-4-20250514')

    expect(result).toBeDefined()
    expect(result?.provider.id).toBe('anthropic')
    expect(result?.model.id).toBe('claude-sonnet-4-20250514')
  })

  it('应该能过滤有 API Key 的 providers', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'

    const available = Provider.getAvailable()

    const anthropicAvailable = available.find((p) => p.id === 'anthropic')
    expect(anthropicAvailable).toBeDefined()

    process.env.ANTHROPIC_API_KEY = undefined
  })

  it('应该能注册自定义 provider', () => {
    const customProvider: Provider.Info = {
      id: 'custom',
      name: 'Custom Provider',
      source: 'config',
      env: ['CUSTOM_API_KEY'],
      options: {},
      models: {
        'custom-model-1': {
          id: 'custom-model-1',
          providerID: 'custom',
          api: {
            id: 'custom-model-1',
            url: 'https://custom.api/v1',
            npm: '@ai-sdk/openai-compatible',
          },
          name: 'Custom Model 1',
          capabilities: {
            temperature: true,
            reasoning: false,
            attachment: false,
            toolcall: true,
            input: { text: true, audio: false, image: false, video: false, pdf: false },
            output: { text: true, audio: false, image: false, video: false, pdf: false },
            interleaved: false,
          },
          cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
          limit: { context: 128000, output: 4096 },
          status: 'active',
          options: {},
          headers: {},
          release_date: '2024-01-01',
        },
      },
    }

    Provider.register(customProvider)

    const retrieved = Provider.get('custom')
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('custom')
    expect(Object.keys(retrieved!.models)).toEqual(['custom-model-1'])
  })

  it('应该验证 provider schema', () => {
    const invalidProvider = {
      id: 'invalid',
    }

    expect(() => {
      Provider.register(invalidProvider as never)
    }).toThrow()
  })

  it('获取不存在的 provider 应该返回 undefined', () => {
    const notFound = Provider.get('nonexistent')
    expect(notFound).toBeUndefined()
  })

  it('findModel 找不到模型应该返回 undefined', () => {
    const result = Provider.findModel('nonexistent-model-xyz')
    expect(result).toBeUndefined()
  })

  it('reset 应该清除所有自定义注册，保留内置', () => {
    const customProvider: Provider.Info = {
      id: 'temp',
      name: 'Temp Provider',
      source: 'config',
      env: ['TEMP_API_KEY'],
      options: {},
      models: {
        'temp-model': {
          id: 'temp-model',
          providerID: 'temp',
          api: { id: 'temp-model', url: 'https://temp.api/v1', npm: '@ai-sdk/openai-compatible' },
          name: 'Temp Model',
          capabilities: {
            temperature: true,
            reasoning: false,
            attachment: false,
            toolcall: true,
            input: { text: true, audio: false, image: false, video: false, pdf: false },
            output: { text: true, audio: false, image: false, video: false, pdf: false },
            interleaved: false,
          },
          cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
          limit: { context: 128000, output: 4096 },
          status: 'active',
          options: {},
          headers: {},
          release_date: '2024-01-01',
        },
      },
    }

    Provider.register(customProvider)
    expect(Provider.get('temp')).toBeDefined()

    Provider.reset()

    expect(Provider.get('temp')).toBeUndefined()
    expect(Provider.get('anthropic')).toBeDefined()
  })

  it('Model 应该包含完整的 capabilities/cost/limit', () => {
    const anthropic = Provider.get('anthropic')
    const model = anthropic?.models['claude-sonnet-4-20250514']

    expect(model).toBeDefined()
    expect(model?.capabilities.reasoning).toBe(true)
    expect(model?.capabilities.toolcall).toBe(true)
    expect(model?.capabilities.input.text).toBe(true)
    expect(model?.cost.input).toBeGreaterThan(0)
    expect(model?.limit.context).toBeGreaterThan(0)
    expect(model?.status).toBe('active')
    expect(model?.api.npm).toBe('@ai-sdk/anthropic')
  })

  it('辅助方法应正常工作', () => {
    const anthropic = Provider.get('anthropic')!
    expect(Provider.getFirstModelName(anthropic)).toBeDefined()
    expect(Provider.getModelCount(anthropic)).toBeGreaterThan(0)
    expect(Provider.getModelNames(anthropic).length).toBeGreaterThan(0)
  })
})
