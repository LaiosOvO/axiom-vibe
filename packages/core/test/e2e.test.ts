import { beforeEach, describe, expect, it } from 'bun:test'
import { Agent } from '../src/agent'
import { AgentRunner } from '../src/agent/runner'
import { Config } from '../src/config'
import { Orchestrator } from '../src/orchestrator'
import { Permission } from '../src/permission'
import { Provider } from '../src/provider'
import { Server } from '../src/server'
import { Session } from '../src/session'
import { SystemPrompt } from '../src/session/system'
import { Skill } from '../src/skill'
import { ToolRegistry } from '../src/tool'

describe('E2E: 完整对话流程', () => {
  beforeEach(() => {
    Session.reset()
  })

  it('创建会话 → 添加消息 → 获取历史', () => {
    const session = Session.create({ modelId: 'anthropic/claude-3-5-sonnet', title: 'E2E测试' })
    expect(session.id).toBeTruthy()

    Session.addMessage(session.id, { role: 'user', content: '你好' })
    Session.addMessage(session.id, { role: 'assistant', content: '你好！有什么需要帮助的？' })

    const updated = Session.get(session.id)
    expect(updated!.messages.length).toBe(2)
    expect(updated!.messages[0]!.role).toBe('user')
    expect(updated!.messages[1]!.role).toBe('assistant')
  })

  it('多会话并行管理', () => {
    const s1 = Session.create({ modelId: 'anthropic/claude-3-5-sonnet', title: '会话1' })
    const s2 = Session.create({ modelId: 'openai/gpt-4', title: '会话2' })

    Session.addMessage(s1.id, { role: 'user', content: '会话1消息' })
    Session.addMessage(s2.id, { role: 'user', content: '会话2消息' })

    expect(Session.list().length).toBe(2)
    expect(Session.get(s1.id)!.messages.length).toBe(1)
    expect(Session.get(s2.id)!.messages.length).toBe(1)
  })

  it('会话删除', () => {
    const session = Session.create({ modelId: 'test/model', title: '要删除的' })
    Session.addMessage(session.id, { role: 'user', content: 'test' })
    Session.remove(session.id)
    expect(Session.get(session.id)).toBeUndefined()
  })

  it('会话支持 agentId 配置', () => {
    const session = Session.create({
      modelId: 'anthropic/claude-3-5-sonnet',
      title: 'Agent测试',
      agentId: 'build',
    })
    expect(session.agentId).toBe('build')
  })

  it('消息支持工具调用', () => {
    const session = Session.create({ modelId: 'test/model', title: '工具测试' })
    const msg = Session.addMessage(session.id, {
      role: 'assistant',
      content: '执行工具',
      toolCalls: [
        {
          id: 'call_1',
          name: 'read',
          arguments: { path: '/test.txt' },
        },
      ],
    })

    expect(msg.toolCalls).toBeDefined()
    expect(msg.toolCalls!.length).toBe(1)
    expect(msg.toolCalls![0]!.name).toBe('read')
  })
})

describe('E2E: Agent + Permission 集成', () => {
  it('Build agent 允许所有工具', () => {
    const agent = Agent.getAgentDef('build')
    expect(agent).toBeDefined()

    const result = Permission.evaluate(agent!.permissions, 'read')
    expect(result).toBe('allow')

    const writeResult = Permission.evaluate(agent!.permissions, 'write')
    expect(writeResult).toBe('allow')
  })

  it('Plan agent 只允许写 .md 文件', () => {
    const agent = Agent.getAgentDef('plan')
    expect(agent).toBeDefined()

    const mdResult = Permission.evaluate(agent!.permissions, 'write', { filePath: 'plan.md' })
    expect(mdResult).toBe('allow')

    const tsResult = Permission.evaluate(agent!.permissions, 'write', { filePath: 'code.ts' })
    expect(tsResult).toBe('deny')
  })

  it('Explore agent 拒绝写操作', () => {
    const agent = Agent.getAgentDef('explore')
    expect(agent).toBeDefined()

    const result = Permission.evaluate(agent!.permissions, 'write')
    expect(result).toBe('deny')

    const readResult = Permission.evaluate(agent!.permissions, 'read')
    expect(readResult).toBe('allow')
  })

  it('Title agent 拒绝所有工具', () => {
    const agent = Agent.getAgentDef('title')
    expect(agent).toBeDefined()

    const result = Permission.evaluate(agent!.permissions, 'read')
    expect(result).toBe('deny')
  })

  it('Doom loop 检测', () => {
    const history: Permission.ToolCallRecord[] = []
    const args = { path: '/test.ts' }

    for (let i = 0; i < 3; i++) {
      history.push({ toolName: 'read', args, timestamp: Date.now() })
    }

    expect(Permission.checkDoomLoop(history, 'read', args)).toBe(true)
    expect(Permission.checkDoomLoop(history, 'write', args)).toBe(false)
  })

  it('Permission 规则合并', () => {
    const base: Permission.PermissionRule[] = [{ tool: '*', action: 'deny' }]
    const override: Permission.PermissionRule[] = [{ tool: 'read', action: 'allow' }]

    const merged = Permission.merge(base, override)
    expect(merged.length).toBe(2)

    const readResult = Permission.evaluate(merged, 'read')
    expect(readResult).toBe('allow')

    const writeResult = Permission.evaluate(merged, 'write')
    expect(writeResult).toBe('deny')
  })
})

describe('E2E: SystemPrompt + Skill 集成', () => {
  it('构建完整的 system prompt', () => {
    const skills: Skill.Info[] = [
      {
        name: 'test-skill',
        description: '测试技能',
        source: 'project',
        filePath: '/test/SKILL.md',
        content: '# 测试技能内容',
      },
    ]

    const prompt = SystemPrompt.build({
      cwd: '/test/project',
      agent: 'Build',
      model: 'claude-3-5-sonnet',
      skills,
      customPrompt: '自定义规则',
    })

    expect(prompt.length).toBeGreaterThan(3)
    const joined = prompt.join('\n')
    expect(joined).toContain('Axiom')
    expect(joined).toContain('test-skill')
    expect(joined).toContain('自定义规则')
    expect(joined).toContain('Build')
    expect(joined).toContain('/test/project')
  })

  it('无 skills 时正常构建', () => {
    const prompt = SystemPrompt.build({ cwd: '/test' })
    expect(prompt.length).toBeGreaterThan(0)
    const joined = prompt.join('\n')
    expect(joined).not.toContain('available_skills')
  })

  it('System prompt 包含工具列表', () => {
    const prompt = SystemPrompt.build({ cwd: '/test' })
    const joined = prompt.join('\n')

    // 检查是否包含核心工具
    expect(joined).toContain('read')
    expect(joined).toContain('write')
    expect(joined).toContain('bash')
    expect(joined).toContain('edit')
  })

  it('System prompt 包含行为规则', () => {
    const prompt = SystemPrompt.build({})
    const joined = prompt.join('\n')

    expect(joined).toContain('准确性优先')
    expect(joined).toContain('工具优先')
    expect(joined).toContain('中文回复')
  })
})

describe('E2E: Tool 注册和解析', () => {
  it('所有内置工具已注册', () => {
    const tools = ToolRegistry.list()
    const names = tools.map((t) => t.name)
    expect(names).toContain('read')
    expect(names).toContain('write')
    expect(names).toContain('bash')
    expect(names).toContain('edit')
    expect(names).toContain('glob')
    expect(names).toContain('grep')
    expect(names).toContain('ls')
    expect(names).toContain('webfetch')
    expect(names).toContain('research')
  })

  it('resolve 只返回指定的工具', () => {
    const resolved = ToolRegistry.resolve(['read', 'glob'])
    expect(resolved.length).toBe(2)
    expect(resolved.map((t) => t.name)).toEqual(['read', 'glob'])
  })

  it('resolve 忽略不存在的工具', () => {
    const resolved = ToolRegistry.resolve(['read', 'nonexistent'])
    expect(resolved.length).toBe(1)
  })

  it('ToolRegistry.has 检查工具存在性', () => {
    expect(ToolRegistry.has('read')).toBe(true)
    expect(ToolRegistry.has('nonexistent')).toBe(false)
  })

  it('ToolRegistry.get 获取单个工具', () => {
    const tool = ToolRegistry.get('read')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('read')
    expect(tool!.description).toBeTruthy()
  })
})

describe('E2E: Agent Runner', () => {
  it('listAvailable 只返回 primary agents', () => {
    const available = AgentRunner.listAvailable()
    expect(available.length).toBeGreaterThan(0)
    for (const agent of available) {
      expect(agent.mode).toBe('primary')
    }
  })

  it('所有 primary agent 的工具都已注册', () => {
    const available = AgentRunner.listAvailable()
    const registeredTools = new Set(ToolRegistry.list().map((t) => t.name))

    for (const agent of available) {
      for (const toolName of agent.tools) {
        expect(registeredTools.has(toolName)).toBe(true)
      }
    }
  })

  it('Agent 定义包含完整字段', () => {
    const agent = Agent.getAgentDef('build')
    expect(agent).toBeDefined()
    expect(agent!.id).toBe('build')
    expect(agent!.name).toBe('Build')
    expect(agent!.description).toBeTruthy()
    expect(agent!.mode).toBe('primary')
    expect(agent!.model).toBeTruthy()
    expect(agent!.tools.length).toBeGreaterThan(0)
    expect(agent!.permissions.length).toBeGreaterThan(0)
  })
})

describe('E2E: Orchestrator Plan', () => {
  beforeEach(() => {
    Orchestrator.reset()
  })

  it('创建并执行 plan 的数据流', () => {
    const plan = Orchestrator.createPlan('测试计划', [
      { agentId: 'build', prompt: '步骤1', dependsOn: [], parallel: false },
      { agentId: 'build', prompt: '步骤2', dependsOn: [], parallel: true },
      { agentId: 'build', prompt: '步骤3', dependsOn: [], parallel: true },
    ])

    expect(plan.steps.length).toBe(3)
    const next = Orchestrator.getNextSteps(plan)
    expect(next.length).toBe(3)
  })

  it('依赖链正确阻塞', () => {
    const plan = Orchestrator.createPlan('依赖测试', [
      { agentId: 'build', prompt: '步骤1', dependsOn: [], parallel: false },
      { agentId: 'build', prompt: '步骤2', dependsOn: [], parallel: false },
    ])

    const step1 = plan.steps[0]!
    const step2 = plan.steps[1]!

    // 给步骤2添加对步骤1的依赖
    step2.dependsOn = [step1.id]

    let next = Orchestrator.getNextSteps(plan)
    expect(next.length).toBe(1)
    expect(next[0]!.id).toBe(step1.id)

    // 完成步骤1
    Orchestrator.updateStepStatus(plan.id, step1.id, 'completed')
    next = Orchestrator.getNextSteps(plan)
    expect(next.length).toBe(1)
    expect(next[0]!.id).toBe(step2.id)
  })

  it('Orchestrator Agent 预设存在', () => {
    const preset = Orchestrator.getPreset('orchestrator')
    expect(preset).toBeDefined()
    expect(preset!.name).toBe('Orchestrator')
  })

  it('createAgent 注册新 Agent', () => {
    const profile: Orchestrator.AgentProfile = {
      id: 'test-agent',
      name: 'Test Agent',
      description: '测试 Agent',
      systemPrompt: 'test prompt',
      model: 'test/model',
      tools: ['read'],
      mcps: [],
      skills: [],
      permissions: {
        canWrite: true,
        canExecute: false,
        canNetwork: false,
      },
    }

    Orchestrator.createAgent(profile)
    const retrieved = Orchestrator.getAgent('test-agent')
    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe('test-agent')
  })
})

describe('E2E: Server API', () => {
  beforeEach(() => {
    Session.reset()
  })

  it('Server createApp 返回 Hono 实例', () => {
    const app = Server.createApp()
    expect(app).toBeDefined()
  })

  it('健康检查端点', async () => {
    const app = Server.createApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ status: 'ok' })
  })

  it('GET /session 列出所有会话', async () => {
    const app = Server.createApp()
    Session.create({ modelId: 'test/model', title: '测试1' })
    Session.create({ modelId: 'test/model', title: '测试2' })

    const res = await app.request('/session')
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<{ id: string }>
    expect(data.length).toBe(2)
  })

  it('POST /session 创建新会话', async () => {
    const app = Server.createApp()
    const res = await app.request('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'test/model', title: '新会话' }),
    })

    expect(res.status).toBe(201)
    const data = (await res.json()) as { title: string }
    expect(data.title).toBe('新会话')
  })

  it('GET /session/:id 获取单个会话', async () => {
    const app = Server.createApp()
    const session = Session.create({ modelId: 'test/model', title: '查询测试' })

    const res = await app.request(`/session/${session.id}`)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { id: string }
    expect(data.id).toBe(session.id)
  })

  it('DELETE /session/:id 删除会话', async () => {
    const app = Server.createApp()
    const session = Session.create({ modelId: 'test/model', title: '删除测试' })

    const res = await app.request(`/session/${session.id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(Session.get(session.id)).toBeUndefined()
  })

  it('GET /agents 列出所有 agents', async () => {
    const app = Server.createApp()
    const res = await app.request('/agents')
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<{ id: string }>
    expect(data.length).toBeGreaterThan(0)
  })

  it('GET /tools 列出所有工具', async () => {
    const app = Server.createApp()
    const res = await app.request('/tools')
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<{ name: string }>
    expect(data.length).toBeGreaterThan(0)
  })
})

describe('E2E: Config', () => {
  it('默认配置加载', () => {
    const config = Config.load({ projectDir: '/tmp/test' })
    expect(config).toBeDefined()
    expect(config.provider).toBeDefined()
    expect(config.provider.default).toBe('anthropic')
  })

  it('Config.defaults 返回默认配置', () => {
    const config = Config.defaults()
    expect(config.provider.default).toBe('anthropic')
    expect(config.agent.default).toBe('orchestrator')
    expect(config.spec.dir).toBe('specs')
  })

  it('Config.merge 合并配置', () => {
    const base = Config.defaults()
    const override = { provider: { default: 'openai' } }
    const merged = Config.merge(base, override)

    expect(merged.provider.default).toBe('openai')
    expect(merged.agent.default).toBe('orchestrator') // 保持原值
  })
})

describe('E2E: Provider', () => {
  beforeEach(() => {
    Provider.reset()
  })

  it('Provider 注册和查询', () => {
    const all = Provider.list()
    expect(all.length).toBeGreaterThan(0)
  })

  it('Provider.get 获取单个 provider', () => {
    const provider = Provider.get('anthropic')
    expect(provider).toBeDefined()
    expect(provider!.id).toBe('anthropic')
    expect(provider!.name).toBe('Anthropic')
  })

  it('Provider.findModel 查找模型', () => {
    const result = Provider.findModel('claude-sonnet-4-20250514')
    expect(result).toBeDefined()
    expect(result!.provider.id).toBe('anthropic')
  })

  it('内置 provider 包含主流 LLM', () => {
    const names = Provider.list().map((p) => p.id)
    expect(names).toContain('anthropic')
    expect(names).toContain('openai')
    expect(names).toContain('google')
  })
})

describe('E2E: Skill 加载和格式化', () => {
  it('parseSkillMd 解析 frontmatter', () => {
    const content = `---
name: test-skill
description: 测试技能
---
# Skill 内容
这是技能内容`

    const result = Skill.parseSkillMd(content)
    expect(result.frontmatter.name).toBe('test-skill')
    expect(result.frontmatter.description).toBe('测试技能')
    expect(result.body).toContain('# Skill 内容')
  })

  it('formatForPrompt 生成 XML 格式', () => {
    const skills: Skill.Info[] = [
      {
        name: 'skill1',
        description: '技能1',
        source: 'project',
        filePath: '/test/skill1.md',
        content: '',
      },
      {
        name: 'skill2',
        description: '技能2',
        source: 'user',
        filePath: '/test/skill2.md',
        content: '',
      },
    ]

    const formatted = Skill.formatForPrompt(skills)
    expect(formatted).toContain('<available_skills>')
    expect(formatted).toContain('skill1')
    expect(formatted).toContain('skill2')
  })

  it('Skill.register 和 Skill.get', () => {
    Skill.reset()
    const skill: Skill.Info = {
      name: 'test-skill',
      description: '测试',
      source: 'project',
      filePath: '/test.md',
      content: '内容',
    }

    Skill.register(skill)
    const retrieved = Skill.get('test-skill')
    expect(retrieved).toBeDefined()
    expect(retrieved!.name).toBe('test-skill')
  })
})
