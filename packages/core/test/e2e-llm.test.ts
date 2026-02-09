import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { AgentRunner } from '../src/agent/runner'
import { ProviderFactory } from '../src/provider/llm'
import { Session } from '../src/session'
import { LLM } from '../src/session/llm'
import { SessionProcessor } from '../src/session/processor'
import { ToolRegistry } from '../src/tool'

/**
 * E2E LLM 测试 - 验证端到端 AI 对话流程
 *
 * 注意: 这些测试需要真实的 API Key 才能运行
 * 如果没有 API Key，测试会被自动跳过
 */

// 检查是否有可用的 API Key
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
const hasOpenAIKey = !!process.env.OPENAI_API_KEY
const hasGoogleKey = !!process.env.GOOGLE_API_KEY
const hasGroqKey = !!process.env.GROQ_API_KEY

// 使用便宜的模型进行测试
const TEST_MODELS = {
  anthropic: 'claude-3-haiku-20240307',
  openai: 'gpt-4o-mini',
  google: 'gemini-1.5-flash',
  groq: 'llama-3.3-70b-versatile',
}

describe('E2E LLM 测试', () => {
  beforeEach(() => {
    // 每个测试前清空会话注册表
    Session.reset()
  })

  afterEach(() => {
    // 每个测试后清空会话注册表
    Session.reset()
  })

  describe('Provider 连通性测试', () => {
    describe.skipIf(!hasAnthropicKey)('Anthropic Provider', () => {
      it(
        '应该能够调用 Anthropic API 并获取响应',
        async () => {
          const model = ProviderFactory.getLanguageModel('anthropic', TEST_MODELS.anthropic)

          const result = await LLM.generate({
            model,
            messages: [{ role: 'user', content: '你好，请回复"收到"' }],
            maxOutputTokens: 50,
          })

          expect(result.text).toBeTruthy()
          expect(result.text.length).toBeGreaterThan(0)
          expect(result.usage.inputTokens).toBeGreaterThan(0)
          expect(result.usage.outputTokens).toBeGreaterThan(0)
          expect(result.finishReason).toBe('stop')
        },
        { timeout: 30000 },
      )

      it(
        '应该能够使用流式调用',
        async () => {
          const model = ProviderFactory.getLanguageModel('anthropic', TEST_MODELS.anthropic)

          let textChunks = ''
          let finishEvent: LLM.StreamEvent | null = null

          for await (const event of LLM.stream({
            model,
            messages: [{ role: 'user', content: '数到3' }],
            maxOutputTokens: 50,
          })) {
            if (event.type === 'text-delta') {
              textChunks += event.text
            } else if (event.type === 'finish') {
              finishEvent = event
            }
          }

          expect(textChunks.length).toBeGreaterThan(0)
          expect(finishEvent).not.toBeNull()
          expect(finishEvent?.type).toBe('finish')
        },
        { timeout: 30000 },
      )
    })

    describe.skipIf(!hasOpenAIKey)('OpenAI Provider', () => {
      it(
        '应该能够调用 OpenAI API 并获取响应',
        async () => {
          const model = ProviderFactory.getLanguageModel('openai', TEST_MODELS.openai)

          const result = await LLM.generate({
            model,
            messages: [{ role: 'user', content: '你好，请回复"收到"' }],
            maxOutputTokens: 50,
          })

          expect(result.text).toBeTruthy()
          expect(result.text.length).toBeGreaterThan(0)
          expect(result.usage.inputTokens).toBeGreaterThan(0)
          expect(result.usage.outputTokens).toBeGreaterThan(0)
          expect(result.finishReason).toBe('stop')
        },
        { timeout: 30000 },
      )
    })

    describe.skipIf(!hasGoogleKey)('Google Provider', () => {
      it(
        '应该能够调用 Google API 并获取响应',
        async () => {
          const model = ProviderFactory.getLanguageModel('google', TEST_MODELS.google)

          const result = await LLM.generate({
            model,
            messages: [{ role: 'user', content: '你好，请回复"收到"' }],
            maxOutputTokens: 50,
          })

          expect(result.text).toBeTruthy()
          expect(result.text.length).toBeGreaterThan(0)
          expect(result.usage.inputTokens).toBeGreaterThan(0)
          expect(result.usage.outputTokens).toBeGreaterThan(0)
        },
        { timeout: 30000 },
      )
    })

    describe.skipIf(!hasGroqKey)('Groq Provider', () => {
      it(
        '应该能够调用 Groq API 并获取响应',
        async () => {
          const model = ProviderFactory.getLanguageModel('groq', TEST_MODELS.groq)

          const result = await LLM.generate({
            model,
            messages: [{ role: 'user', content: '你好，请回复"收到"' }],
            maxOutputTokens: 50,
          })

          expect(result.text).toBeTruthy()
          expect(result.text.length).toBeGreaterThan(0)
          expect(result.usage.inputTokens).toBeGreaterThan(0)
          expect(result.usage.outputTokens).toBeGreaterThan(0)
        },
        { timeout: 30000 },
      )
    })
  })

  describe.skipIf(!hasAnthropicKey)('完整对话测试', () => {
    it(
      '应该能够创建会话并获取 AI 回复',
      async () => {
        const model = ProviderFactory.getLanguageModel('anthropic', TEST_MODELS.anthropic)

        // 创建会话
        const session = Session.create({
          modelId: TEST_MODELS.anthropic,
          title: '测试会话',
        })

        expect(session.id).toBeTruthy()
        expect(session.messages).toHaveLength(0)

        // 发送用户消息并处理
        const result = await SessionProcessor.process({
          sessionId: session.id,
          userMessage: '你好，请用一句话自我介绍',
          model,
          maxOutputTokens: 100,
        })

        // 验证响应
        expect(result.assistantMessage).toBeDefined()
        expect(result.assistantMessage.role).toBe('assistant')
        expect(result.assistantMessage.content).toBeTruthy()
        expect(result.assistantMessage.content.length).toBeGreaterThan(0)

        // 验证使用量
        expect(result.usage.inputTokens).toBeGreaterThan(0)
        expect(result.usage.outputTokens).toBeGreaterThan(0)
        expect(result.usage.totalTokens).toBeGreaterThan(0)

        // 验证会话中有消息
        const updatedSession = Session.get(session.id)
        expect(updatedSession).toBeDefined()
        expect(updatedSession!.messages.length).toBeGreaterThan(0)

        // 应该有用户消息和助手回复
        const userMessages = updatedSession!.messages.filter((m) => m.role === 'user')
        const assistantMessages = updatedSession!.messages.filter((m) => m.role === 'assistant')

        expect(userMessages.length).toBeGreaterThanOrEqual(1)
        expect(assistantMessages.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 30000 },
    )

    it(
      '应该能够进行多轮对话并保持上下文',
      async () => {
        const model = ProviderFactory.getLanguageModel('anthropic', TEST_MODELS.anthropic)

        // 创建会话
        const session = Session.create({
          modelId: TEST_MODELS.anthropic,
          title: '多轮对话测试',
        })

        // 第一轮: 告诉 AI 一个数字
        const firstResult = await SessionProcessor.process({
          sessionId: session.id,
          userMessage: '我最喜欢的数字是 42',
          model,
          maxOutputTokens: 50,
        })

        expect(firstResult.assistantMessage.content).toBeTruthy()

        // 第二轮: 询问刚才说的数字
        const secondResult = await SessionProcessor.process({
          sessionId: session.id,
          userMessage: '我刚才说我最喜欢的数字是多少？',
          model,
          maxOutputTokens: 50,
        })

        // AI 应该能记住是 42
        expect(secondResult.assistantMessage.content).toBeTruthy()
        expect(secondResult.assistantMessage.content.toLowerCase()).toContain('42')

        // 验证会话中有4条消息（2条用户 + 2条助手）
        const updatedSession = Session.get(session.id)
        expect(updatedSession).toBeDefined()

        const userMessages = updatedSession!.messages.filter((m) => m.role === 'user')
        const assistantMessages = updatedSession!.messages.filter((m) => m.role === 'assistant')

        expect(userMessages.length).toBe(2)
        expect(assistantMessages.length).toBe(2)
      },
      { timeout: 60000 },
    )
  })

  describe.skipIf(!hasAnthropicKey)('工具调用测试', () => {
    it(
      '应该能够调用工具并获取结果',
      async () => {
        const model = ProviderFactory.getLanguageModel('anthropic', TEST_MODELS.anthropic)

        // 创建会话
        const session = Session.create({
          modelId: TEST_MODELS.anthropic,
          title: '工具调用测试',
        })

        // 准备工具 - 使用 read 工具读取当前测试文件
        const readTool = ToolRegistry.get('read')
        expect(readTool).toBeDefined()

        const tools = {
          read: {
            description: readTool!.description,
            parameters: readTool!.parameters,
            execute: readTool!.execute,
          },
        }

        // 发送需要工具的请求
        const result = await SessionProcessor.process({
          sessionId: session.id,
          userMessage: `请使用 read 工具读取文件 ${__filename} 的内容，然后告诉我文件的第一行是什么`,
          model,
          tools,
          maxOutputTokens: 500,
        })

        // 验证响应
        expect(result.assistantMessage).toBeDefined()
        expect(result.assistantMessage.content).toBeTruthy()

        // 验证会话中有工具调用
        const updatedSession = Session.get(session.id)
        expect(updatedSession).toBeDefined()

        const toolMessages = updatedSession!.messages.filter((m) => m.role === 'tool')
        const assistantMessagesWithTools = updatedSession!.messages.filter(
          (m) => m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0,
        )

        expect(toolMessages.length).toBeGreaterThan(0)
        expect(assistantMessagesWithTools.length).toBeGreaterThan(0)

        // 验证工具调用的是 read
        const toolCall = assistantMessagesWithTools[0]?.toolCalls?.[0]
        expect(toolCall).toBeDefined()
        expect(toolCall!.name).toBe('read')
      },
      { timeout: 60000 },
    )
  })

  describe.skipIf(!hasAnthropicKey)('AgentRunner 集成测试', () => {
    it(
      '应该能够通过 AgentRunner 运行 Agent',
      async () => {
        const model = ProviderFactory.getLanguageModel('anthropic', TEST_MODELS.anthropic)

        const result = await AgentRunner.run({
          agentId: 'build',
          userMessage: '你好，请简单介绍一下你自己',
          model,
        })

        // 验证响应
        expect(result.assistantMessage).toBeDefined()
        expect(result.assistantMessage.role).toBe('assistant')
        expect(result.assistantMessage.content).toBeTruthy()
        expect(result.assistantMessage.content.length).toBeGreaterThan(0)

        // 验证使用量
        expect(result.usage.inputTokens).toBeGreaterThan(0)
        expect(result.usage.outputTokens).toBeGreaterThan(0)
        expect(result.usage.totalTokens).toBeGreaterThan(0)
      },
      { timeout: 30000 },
    )
  })

  describe('无 API Key 时的行为', () => {
    it('应该提示缺少 API Key（仅在没有任何 Key 时）', () => {
      if (!hasAnthropicKey && !hasOpenAIKey && !hasGoogleKey && !hasGroqKey) {
        console.log('⚠️  没有检测到任何 LLM API Key，E2E 测试已跳过')
        console.log('提示: 设置以下环境变量以运行 E2E 测试:')
        console.log('  - ANTHROPIC_API_KEY')
        console.log('  - OPENAI_API_KEY')
        console.log('  - GOOGLE_API_KEY')
        console.log('  - GROQ_API_KEY')
      }
      expect(true).toBe(true)
    })
  })
})
