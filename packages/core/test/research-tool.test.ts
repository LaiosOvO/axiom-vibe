import { describe, expect, it } from 'bun:test'
import { ToolRegistry } from '../src/tool'

describe('Research Tool', () => {
  it('research 工具已注册到 ToolRegistry', () => {
    const tool = ToolRegistry.get('research')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('research')
  })

  it('research 工具有正确的描述', () => {
    const tool = ToolRegistry.get('research')
    expect(tool!.description).toContain('深度研究')
  })

  it('research 工具参数 schema 验证 - 必须有 url', () => {
    const tool = ToolRegistry.get('research')
    expect(() => {
      tool!.parameters.parse({})
    }).toThrow()
  })

  it('research 工具参数 schema 验证 - url 有效', () => {
    const tool = ToolRegistry.get('research')
    const result = tool!.parameters.parse({ url: 'https://github.com/test/repo' })
    expect(result.url).toBe('https://github.com/test/repo')
    expect(result.features).toEqual([])
  })

  it('research 工具参数 schema 验证 - 自定义 features', () => {
    const tool = ToolRegistry.get('research')
    const result = tool!.parameters.parse({
      url: 'https://github.com/test/repo',
      features: ['auth', 'session'],
      name: 'my-project',
    })
    expect(result.features).toEqual(['auth', 'session'])
    expect(result.name).toBe('my-project')
  })
})
