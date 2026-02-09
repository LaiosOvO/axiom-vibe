import { beforeEach, describe, expect, it } from 'bun:test'
import { Provider } from '../src/provider/index.ts'

describe('Provider', () => {
  beforeEach(() => {
    // 每个测试前重置状态
    Provider.reset()
  })

  it('应该能获取内置 provider', () => {
    const anthropic = Provider.get('anthropic')

    expect(anthropic).toBeDefined()
    expect(anthropic?.id).toBe('anthropic')
    expect(anthropic?.name).toBe('Anthropic')
    expect(anthropic?.models).toBeInstanceOf(Array)
    expect(anthropic?.models.length).toBeGreaterThan(0)
    expect(anthropic?.auth.type).toBe('env')
    expect(anthropic?.auth.envVar).toBe('ANTHROPIC_API_KEY')
  })

  it('应该能列出所有注册的 providers (>=15)', () => {
    const providers = Provider.list()

    expect(providers.length).toBeGreaterThanOrEqual(15)

    // 验证必须包含的 providers
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
    expect(result?.model).toBe('claude-sonnet-4-20250514')
  })

  it('应该能过滤有 API Key 的 providers', () => {
    // 设置一个环境变量
    process.env.ANTHROPIC_API_KEY = 'test-key'

    const available = Provider.getAvailable()

    // 至少应该有 anthropic（因为我们设置了 key）
    const anthropicAvailable = available.find((p) => p.id === 'anthropic')
    expect(anthropicAvailable).toBeDefined()

    // 清理
    process.env.ANTHROPIC_API_KEY = undefined
  })

  it('应该能注册自定义 provider', () => {
    const customProvider = {
      id: 'custom',
      name: 'Custom Provider',
      models: ['custom-model-1', 'custom-model-2'],
      auth: {
        type: 'env' as const,
        envVar: 'CUSTOM_API_KEY',
      },
    }

    Provider.register(customProvider)

    const retrieved = Provider.get('custom')
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('custom')
    expect(retrieved?.models).toEqual(['custom-model-1', 'custom-model-2'])
  })

  it('应该验证 provider schema', () => {
    const invalidProvider = {
      id: 'invalid',
      // 缺少必需的字段
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
    const customProvider = {
      id: 'temp',
      name: 'Temp Provider',
      models: ['temp-model'],
      auth: {
        type: 'env' as const,
        envVar: 'TEMP_API_KEY',
      },
    }

    Provider.register(customProvider)
    expect(Provider.get('temp')).toBeDefined()

    Provider.reset()

    // 自定义应该被清除
    expect(Provider.get('temp')).toBeUndefined()

    // 内置应该还在
    expect(Provider.get('anthropic')).toBeDefined()
  })
})
