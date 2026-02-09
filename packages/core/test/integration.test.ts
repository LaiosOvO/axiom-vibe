import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Config } from '../src/config'
import { LspClient } from '../src/lsp/client'
import { McpClient } from '../src/mcp/client'
import { Permission } from '../src/permission'
import { Provider } from '../src/provider'
import { ProviderFactory } from '../src/provider/llm'
import { Session } from '../src/session'
import { LLM } from '../src/session/llm'
import { SessionProcessor } from '../src/session/processor'
import { SystemPrompt } from '../src/session/system'
import type { Skill } from '../src/skill'
import { Storage } from '../src/storage'
import { ToolRegistry } from '../src/tool'
import { cleanupTempDir, createTempDir } from './preload'

describe('M6 全链路集成测试', () => {
  // -- SystemPrompt --
  describe('SystemPrompt', () => {
    test('build() 返回包含核心段落的数组', () => {
      const sections = SystemPrompt.build()
      expect(Array.isArray(sections)).toBe(true)
      expect(sections.length).toBeGreaterThanOrEqual(3)
    })

    test('build() 包含 header/tools/rules', () => {
      const sections = SystemPrompt.build()
      const joined = sections.join('\n')
      expect(joined).toContain('Axiom')
      expect(joined).toContain('可用工具')
      expect(joined).toContain('行为规则')
    })

    test('build() 带 cwd 包含项目上下文', () => {
      const sections = SystemPrompt.build({ cwd: '/tmp/test' })
      const joined = sections.join('\n')
      expect(joined).toContain('/tmp/test')
      expect(joined).toContain('项目上下文')
    })

    test('build() 带 agent/model/customPrompt', () => {
      const sections = SystemPrompt.build({
        agent: 'coder',
        model: 'claude-3',
        customPrompt: '自定义规则',
      })
      const joined = sections.join('\n')
      expect(joined).toContain('coder')
      expect(joined).toContain('claude-3')
      expect(joined).toContain('自定义规则')
    })

    test('header() 返回身份描述', () => {
      const h = SystemPrompt.header()
      expect(h).toContain('Axiom')
      expect(h).toContain('核心能力')
    })

    test('tools() 从 ToolRegistry 动态获取', () => {
      const t = SystemPrompt.tools()
      const allTools = ToolRegistry.list()
      for (const tool of allTools) {
        expect(t).toContain(tool.name)
      }
    })

    test('rules() 返回行为准则', () => {
      const r = SystemPrompt.rules()
      expect(r).toContain('准确性优先')
      expect(r).toContain('中文回复')
    })

    test('context() 包含平台和日期', () => {
      const c = SystemPrompt.context('/tmp/project')
      expect(c).toContain('/tmp/project')
      expect(c).toContain(process.platform)
    })
  })

  // -- Config model 字段 --
  describe('Config model 字段', () => {
    test('defaults() 包含 model 配置', () => {
      const config = Config.defaults()
      expect(config.model).toBeDefined()
      expect(config.model.default).toBe('anthropic/claude-sonnet-4-20250514')
    })

    test('model 包含 maxOutputTokens 和 temperature', () => {
      const config = Config.defaults()
      expect(config.model.maxOutputTokens).toBe(16384)
      expect(config.model.temperature).toBe(0)
    })
  })

  // -- Session 持久化 --
  describe('Session 持久化', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await createTempDir()
      Storage.init(tempDir)
      Session.reset()
    })

    afterEach(async () => {
      Session.reset()
      await cleanupTempDir(tempDir)
    })

    test('save() 将会话写入磁盘', async () => {
      const session = Session.create({ modelId: 'test/model', title: '测试持久化' })
      await Session.save(session.id)

      const exists = await Storage.exists(['sessions', session.id])
      expect(exists).toBe(true)
    })

    test('loadFromDisk() 从磁盘恢复会话', async () => {
      const session = Session.create({ modelId: 'test/model', title: '加载测试' })
      Session.addMessage(session.id, { role: 'user', content: '你好' })
      await Session.save(session.id)

      Session.reset()
      expect(Session.get(session.id)).toBeUndefined()

      const loaded = await Session.loadFromDisk(session.id)
      expect(loaded).toBeDefined()
      expect(loaded?.title).toBe('加载测试')
      expect(loaded?.messages.length).toBe(1)
      expect(loaded?.messages[0]?.content).toBe('你好')
    })

    test('loadAll() 加载所有会话', async () => {
      const s1 = Session.create({ modelId: 'm1' })
      const s2 = Session.create({ modelId: 'm2' })
      await Session.save(s1.id)
      await Session.save(s2.id)

      Session.reset()
      expect(Session.list().length).toBe(0)

      await Session.loadAll()
      expect(Session.list().length).toBe(2)
    })

    test('deleteFromDisk() 删除磁盘和内存数据', async () => {
      const session = Session.create({ modelId: 'test/model' })
      await Session.save(session.id)

      await Session.deleteFromDisk(session.id)

      expect(Session.get(session.id)).toBeUndefined()
      const exists = await Storage.exists(['sessions', session.id])
      expect(exists).toBe(false)
    })

    test('loadFromDisk() 不存在时返回 undefined', async () => {
      const loaded = await Session.loadFromDisk('non-existent-id')
      expect(loaded).toBeUndefined()
    })
  })

  // -- ProviderFactory + LLM 类型 --
  describe('ProviderFactory 全链路', () => {
    test('getLanguageModel 返回有效的 LanguageModel', () => {
      const model = ProviderFactory.getLanguageModel('anthropic', 'claude-sonnet-4-20250514')
      expect(model).toBeDefined()
    })

    test('所有 bundled providers 可创建模型', () => {
      const providers = ['anthropic', 'openai', 'google', 'groq', 'mistral', 'xai']
      const models = [
        'claude-sonnet-4-20250514',
        'gpt-4o',
        'gemini-2.0-flash',
        'llama-3.3-70b-versatile',
        'mistral-large-latest',
        'grok-2',
      ]

      for (let i = 0; i < providers.length; i++) {
        const model = ProviderFactory.getLanguageModel(providers[i]!, models[i]!)
        expect(model).toBeDefined()
      }
    })
  })

  // -- LLM 类型验证 --
  describe('LLM 接口验证', () => {
    test('LLM.stream 是函数', () => {
      expect(typeof LLM.stream).toBe('function')
    })

    test('LLM.generate 是函数', () => {
      expect(typeof LLM.generate).toBe('function')
    })
  })

  // -- SessionProcessor 类型验证 --
  describe('SessionProcessor 接口验证', () => {
    test('SessionProcessor.process 是函数', () => {
      expect(typeof SessionProcessor.process).toBe('function')
    })
  })

  // -- McpClient 类型验证 --
  describe('McpClient', () => {
    test('McpClient.connect 是函数', () => {
      expect(typeof McpClient.connect).toBe('function')
    })

    test('ServerConfig 类型接受合法配置', () => {
      const config: McpClient.ServerConfig = {
        command: 'echo',
        args: ['test'],
        env: { KEY: 'value' },
      }
      expect(config.command).toBe('echo')
      expect(config.args).toEqual(['test'])
    })
  })

  // -- LspClient 类型验证 --
  describe('LspClient', () => {
    test('LspClient.connect 是函数', () => {
      expect(typeof LspClient.connect).toBe('function')
    })

    test('ServerConfig 类型接受合法配置', () => {
      const config: LspClient.ServerConfig = {
        command: 'typescript-language-server',
        args: ['--stdio'],
      }
      expect(config.command).toBe('typescript-language-server')
    })
  })

  // -- 工具转换链路 (ToolRegistry → SessionProcessor 格式) --
  describe('工具转换链路', () => {
    test('ToolRegistry 工具可转换为 SessionProcessor 格式', () => {
      const toolInfos = ToolRegistry.list()
      expect(toolInfos.length).toBeGreaterThanOrEqual(8)

      const tools: Record<
        string,
        {
          description: string
          parameters: unknown
          execute: (args: unknown) => Promise<unknown>
        }
      > = {}

      for (const toolInfo of toolInfos) {
        tools[toolInfo.name] = {
          description: toolInfo.description,
          parameters: toolInfo.parameters,
          execute: toolInfo.execute,
        }
      }

      expect(Object.keys(tools).length).toBe(toolInfos.length)
      expect(tools.read).toBeDefined()
      expect(tools.write).toBeDefined()
      expect(tools.bash).toBeDefined()
      expect(tools.glob).toBeDefined()
      expect(tools.grep).toBeDefined()
      expect(tools.edit).toBeDefined()
      expect(tools.ls).toBeDefined()
      expect(tools.webfetch).toBeDefined()
    })
  })

  // -- Headless 模式链路 (不调用真实 LLM) --
  describe('Headless 模式链路', () => {
    test('Config → Provider → Model → Session 全链路类型', () => {
      const config = Config.defaults()
      const defaultProvider = config.provider.default
      expect(defaultProvider).toBe('anthropic')

      const providerInfo = Provider.get(defaultProvider)
      expect(providerInfo).toBeDefined()
      expect(Object.keys(providerInfo!.models).length).toBeGreaterThan(0)

      const modelId = `${defaultProvider}/${Object.keys(providerInfo!.models)[0]}`
      const [providerId, ...modelParts] = modelId.split('/')
      const modelName = modelParts.join('/')

      expect(providerId).toBe('anthropic')
      expect(modelName).toBeTruthy()

      const model = ProviderFactory.getLanguageModel(providerId!, modelName!)
      expect(model).toBeDefined()

      Session.reset()
      const session = Session.create({ modelId, title: '集成测试' })
      expect(session.id).toBeDefined()
      expect(session.modelId).toBe(modelId)

      Session.addMessage(session.id, { role: 'user', content: '测试消息' })
      const messages = Session.get(session.id)!.messages
      expect(messages.length).toBe(1)
      expect(messages[0]?.role).toBe('user')

      Session.reset()
    })
  })

  describe('Permission + SessionProcessor 集成', () => {
    test('ProcessInput 类型接受 permissionRules 参数', () => {
      const input: SessionProcessor.ProcessInput = {
        sessionId: 'test-session',
        userMessage: '测试消息',
        model: ProviderFactory.getLanguageModel('anthropic', 'claude-sonnet-4-20250514'),
        permissionRules: [{ tool: 'read', action: 'allow' }],
      }
      expect(input.permissionRules).toBeDefined()
      expect(input.permissionRules?.length).toBe(1)
    })

    test('ProcessInput 类型接受 toolCallHistory 参数', () => {
      const input: SessionProcessor.ProcessInput = {
        sessionId: 'test-session',
        userMessage: '测试消息',
        model: ProviderFactory.getLanguageModel('anthropic', 'claude-sonnet-4-20250514'),
        toolCallHistory: [{ toolName: 'read', args: { filePath: '/test' }, timestamp: Date.now() }],
      }
      expect(input.toolCallHistory).toBeDefined()
      expect(input.toolCallHistory?.length).toBe(1)
    })

    test('ProcessInput 类型同时接受权限相关的两个参数', () => {
      const now = Date.now()
      const input: SessionProcessor.ProcessInput = {
        sessionId: 'test-session',
        userMessage: '测试消息',
        model: ProviderFactory.getLanguageModel('anthropic', 'claude-sonnet-4-20250514'),
        permissionRules: [
          { tool: 'bash', action: 'ask' },
          { tool: '*', action: 'allow' },
        ],
        toolCallHistory: [
          { toolName: 'read', args: { filePath: '/test' }, timestamp: now },
          { toolName: 'write', args: { filePath: '/test', content: 'x' }, timestamp: now + 1000 },
        ],
      }
      expect(input.permissionRules?.length).toBe(2)
      expect(input.toolCallHistory?.length).toBe(2)
    })
  })

  describe('SystemPrompt + Skill 集成', () => {
    test('skills 为空时 build 不添加 skill 段落', () => {
      const sections = SystemPrompt.build({ skills: [] })
      const joined = sections.join('\n')
      expect(joined).not.toContain('<available_skills>')
    })

    test('skills 未提供时不报错', () => {
      expect(() => {
        const sections = SystemPrompt.build({})
        expect(Array.isArray(sections)).toBe(true)
      }).not.toThrow()
    })

    test('有 skills 时 build 添加 XML 格式的 skill 列表', () => {
      const skills: Skill.Info[] = [
        {
          name: 'test-skill',
          description: '测试技能',
          source: 'user',
          filePath: '/test/SKILL.md',
          content: '技能内容',
        },
        {
          name: 'another-skill',
          description: '另一个技能',
          source: 'project',
          filePath: '/test/another/SKILL.md',
          content: '技能内容',
        },
      ]

      const sections = SystemPrompt.build({ skills })
      const joined = sections.join('\n')

      expect(joined).toContain('<available_skills>')
      expect(joined).toContain('<skill>')
      expect(joined).toContain('<name>test-skill</name>')
      expect(joined).toContain('<description>测试技能</description>')
      expect(joined).toContain('<name>another-skill</name>')
      expect(joined).toContain('<description>另一个技能</description>')
    })

    test('skills 和其他参数一起使用', () => {
      const skills: Skill.Info[] = [
        {
          name: 'coding-skill',
          description: '编码技能',
          source: 'builtin',
          filePath: '/builtin/SKILL.md',
          content: '编码技能内容',
        },
      ]

      const sections = SystemPrompt.build({
        cwd: '/tmp/project',
        agent: 'coder',
        model: 'claude-3',
        skills,
        customPrompt: '自定义规则',
      })

      const joined = sections.join('\n')

      expect(joined).toContain('/tmp/project')
      expect(joined).toContain('coder')
      expect(joined).toContain('claude-3')
      expect(joined).toContain('<available_skills>')
      expect(joined).toContain('coding-skill')
      expect(joined).toContain('自定义规则')
    })
  })
})
