import { beforeEach, describe, expect, it } from 'bun:test'
import { Agent } from '../src/agent'

describe('Agent - 旧版 API', () => {
  beforeEach(() => {
    Agent.reset()
  })

  it('应该获取内置 agent - coder', () => {
    const coder = Agent.get('coder')
    expect(coder).toBeDefined()
    expect(coder?.id).toBe('coder')
    expect(coder?.name).toBe('Coder')
    expect(coder?.model).toBe('claude-sonnet-4-20250514')
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
      model: 'claude-sonnet-4-20250514',
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
      model: 'claude-sonnet-4-20250514',
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
      model: 'claude-sonnet-4-20250514',
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
      model: 'claude-sonnet-4-20250514',
      tools: [],
      temperature: 1.5,
    }

    Agent.register(agentWithTemp)
    const retrieved = Agent.get('temp-test')
    expect(retrieved?.temperature).toBe(1.5)
  })

  it('应该拒绝超出范围的 temperature', () => {
    const invalidAgent = {
      id: 'invalid-temp',
      name: 'Invalid Temp',
      description: '无效温度',
      systemPrompt: '测试',
      model: 'claude-sonnet-4-20250514',
      tools: [],
      temperature: 3,
    }

    expect(() => {
      Agent.register(invalidAgent as Agent.Info)
    }).toThrow()
  })
})

describe('Agent - 新版 AgentDef API', () => {
  beforeEach(() => {
    Agent.reset()
  })

  it('应该获取内置 AgentDef - build', () => {
    const build = Agent.getAgentDef('build')
    expect(build).toBeDefined()
    expect(build?.id).toBe('build')
    expect(build?.name).toBe('Build')
    expect(build?.mode).toBe('primary')
    expect(build?.model).toBe('claude-sonnet-4-20250514')
    expect(build?.tools).toContain('read')
    expect(build?.tools).toContain('write')
    expect(build?.systemPromptFile).toBe('build.txt')
  })

  it('应该列出所有内置 AgentDef', () => {
    const defs = Agent.listAgentDefs()
    expect(defs.length).toBeGreaterThanOrEqual(5)
    const ids = defs.map((d) => d.id)
    expect(ids).toContain('build')
    expect(ids).toContain('plan')
    expect(ids).toContain('explore')
    expect(ids).toContain('title')
    expect(ids).toContain('summary')
  })

  it('应该注册自定义 AgentDef', () => {
    const customDef: Agent.AgentDef = {
      id: 'custom-def',
      name: 'Custom Def',
      description: '自定义 AgentDef',
      mode: 'primary',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: '自定义 prompt',
      tools: ['read'],
      permissions: [{ tool: '*', action: 'allow' }],
    }

    Agent.registerAgentDef(customDef)
    const retrieved = Agent.getAgentDef('custom-def')
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('custom-def')
    expect(retrieved?.name).toBe('Custom Def')
    expect(retrieved?.mode).toBe('primary')
  })

  it('应该获取默认 Agent - build', () => {
    const defaultAgent = Agent.getDefaultAgent()
    expect(defaultAgent).toBeDefined()
    expect(defaultAgent.id).toBe('build')
    expect(defaultAgent.mode).toBe('primary')
  })

  it('应该加载 systemPrompt 字符串', async () => {
    const testDef: Agent.AgentDef = {
      id: 'test-prompt',
      name: 'Test Prompt',
      description: '测试 prompt',
      mode: 'primary',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: '这是直接提供的 prompt',
      tools: [],
      permissions: [],
    }

    const prompt = await Agent.loadSystemPrompt(testDef)
    expect(prompt).toBe('这是直接提供的 prompt')
  })

  it('应该生成默认 systemPrompt', async () => {
    const testDef: Agent.AgentDef = {
      id: 'test-default',
      name: 'Test Default',
      description: '测试默认 prompt 生成',
      mode: 'primary',
      model: 'claude-sonnet-4-20250514',
      tools: [],
      permissions: [],
    }

    const prompt = await Agent.loadSystemPrompt(testDef)
    expect(prompt).toBe('You are Test Default, 测试默认 prompt 生成')
  })

  it('应该验证 AgentMode 类型', () => {
    const primaryAgent = Agent.getAgentDef('build')
    expect(primaryAgent?.mode).toBe('primary')

    const subagent = Agent.getAgentDef('explore')
    expect(subagent?.mode).toBe('subagent')

    const hidden = Agent.getAgentDef('title')
    expect(hidden?.mode).toBe('hidden')
  })

  it('应该包含 permissions 规则', () => {
    const build = Agent.getAgentDef('build')
    expect(build?.permissions).toBeDefined()
    expect(build?.permissions.length).toBeGreaterThan(0)
    expect(build?.permissions).toContainEqual({ tool: '*', action: 'allow' })
  })
})
