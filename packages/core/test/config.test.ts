import { beforeEach, describe, expect, test } from 'bun:test'
import { Config } from '../src/config'

describe('SPEC-01: 配置系统', () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('AXIOM_')) delete process.env[key]
    }
  })

  test('Config.Info schema 存在且可解析默认值', () => {
    const config = Config.Info.parse({})
    expect(config.provider.default).toBe('anthropic')
    expect(config.agent.default).toBe('orchestrator')
    expect(config.spec.dir).toBe('specs')
    expect(config.growth.enabled).toBe(true)
  })

  test('加载默认配置', () => {
    const config = Config.load({ projectDir: '/nonexistent' })
    expect(config.provider.default).toBe('anthropic')
  })

  test('深度合并配置', () => {
    const config = Config.merge(Config.defaults(), { provider: { default: 'openai' } })
    expect(config.provider.default).toBe('openai')
    expect(config.agent.default).toBe('orchestrator')
  })

  test('环境变量覆盖', () => {
    process.env.AXIOM_PROVIDER_DEFAULT = 'deepseek'
    const envOverrides = Config.fromEnv()
    expect(envOverrides.provider?.default).toBe('deepseek')
  })

  test('无效配置抛出错误', () => {
    expect(() => Config.Info.parse({ provider: 'invalid' })).toThrow()
  })

  test('Markdown frontmatter 解析', () => {
    const md = '---\nname: test\ntags:\n  - a\n  - b\n---\n# Content\nBody text'
    const result = Config.parseMarkdownFrontmatter(md)
    expect(result.frontmatter.name).toBe('test')
    expect(result.frontmatter.tags).toEqual(['a', 'b'])
    expect(result.content).toContain('# Content')
    expect(result.content).toContain('Body text')
  })

  test('没有 frontmatter 的 Markdown', () => {
    const md = '# Just Content'
    const result = Config.parseMarkdownFrontmatter(md)
    expect(result.frontmatter).toEqual({})
    expect(result.content).toBe('# Just Content')
  })
})
