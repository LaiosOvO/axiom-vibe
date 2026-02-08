import { beforeEach, describe, expect, it } from 'bun:test'
import { Agent } from '../src/agent'

describe('Agent', () => {
  beforeEach(() => {
    Agent.reset()
  })

  it('应该获取内置 agent - coder', () => {
    const coder = Agent.get('coder')
    expect(coder).toBeDefined()
    expect(coder?.id).toBe('coder')
    expect(coder?.name).toBe('Coder')
    expect(coder?.model).toBe('claude-3-5-sonnet-20241022')
    expect(coder?.tools).toContain('read')
    expect(coder?.tools).toContain('write')
    expect(coder?.tools).toContain('bash')
  })

  it('应该列出至少 6 个内置 agent', () => {
    const agents = Agent.list()
    expect(agents.length).toBeGreaterThanOrEqual(6)
    const ids = agents.map((a) => a.id)
    expect(ids).toContain('coder')
    expect(ids).toContain('architect')
    expect(ids).toContain('explorer')
    expect(ids).toContain('writer')
    expect(ids).toContain('reviewer')
    expect(ids).toContain('planner')
  })

  it('应该检查 agent 是否存在 - has', () => {
    expect(Agent.has('coder')).toBe(true)
    expect(Agent.has('architect')).toBe(true)
    expect(Agent.has('nonexistent')).toBe(false)
  })

  it('应该注册自定义 agent', () => {
    const customAgent: Agent.Info = {
      id: 'custom',
      name: 'Custom Agent',
      description: '自定义 agent',
      systemPrompt: '你是一个自定义 agent',
      model: 'claude-3-5-sonnet-20241022',
      tools: ['read'],
    }

    Agent.register(customAgent)
    const retrieved = Agent.get('custom')
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('custom')
    expect(retrieved?.name).toBe('Custom Agent')
  })

  it('应该删除 agent', () => {
    const customAgent: Agent.Info = {
      id: 'temp',
      name: 'Temp Agent',
      description: '临时 agent',
      systemPrompt: '临时',
      model: 'claude-3-5-sonnet-20241022',
      tools: [],
    }

    Agent.register(customAgent)
    expect(Agent.has('temp')).toBe(true)

    Agent.remove('temp')
    expect(Agent.has('temp')).toBe(false)
    expect(Agent.get('temp')).toBeUndefined()
  })

  it('应该重置为内置 agent', () => {
    const customAgent: Agent.Info = {
      id: 'custom2',
      name: 'Custom Agent 2',
      description: '自定义 agent 2',
      systemPrompt: '自定义',
      model: 'claude-3-5-sonnet-20241022',
      tools: [],
    }

    Agent.register(customAgent)
    expect(Agent.has('custom2')).toBe(true)

    Agent.reset()
    expect(Agent.has('custom2')).toBe(false)
    expect(Agent.has('coder')).toBe(true)
    expect(Agent.list().length).toBeGreaterThanOrEqual(6)
  })

  it('应该验证 schema - 无效数据抛错', () => {
    const invalidAgent = {
      id: 'invalid',
      name: 'Invalid',
      // 缺少必需字段
    }

    expect(() => {
      Agent.register(invalidAgent as Agent.Info)
    }).toThrow()
  })

  it('应该验证 temperature 范围', () => {
    const agentWithTemp: Agent.Info = {
      id: 'temp-test',
      name: 'Temp Test',
      description: '温度测试',
      systemPrompt: '测试',
      model: 'claude-3-5-sonnet-20241022',
      tools: [],
      temperature: 1.5,
    }

    Agent.register(agentWithTemp)
    const retrieved = Agent.get('temp-test')
    expect(retrieved?.temperature).toBe(1.5)
  })

  it('应该拒绝超出范围的 temperature', () => {
    const invalidAgent: any = {
      id: 'invalid-temp',
      name: 'Invalid Temp',
      description: '无效温度',
      systemPrompt: '测试',
      model: 'claude-3-5-sonnet-20241022',
      tools: [],
      temperature: 3, // 超过 2
    }

    expect(() => {
      Agent.register(invalidAgent)
    }).toThrow()
  })
})
