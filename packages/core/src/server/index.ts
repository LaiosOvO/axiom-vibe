import { Hono } from 'hono'
import { z } from 'zod'
import { Agent } from '../agent'
import { AgentRunner } from '../agent/runner'
import { Provider } from '../provider'
import { ProviderFactory } from '../provider/llm'
import { Session } from '../session'
import { ToolRegistry } from '../tool'

export namespace Server {
  export const Config = z.object({
    port: z.number().default(4096),
    hostname: z.string().default('127.0.0.1'),
  })

  export type Config = z.infer<typeof Config>

  export function createApp(): Hono {
    const app = new Hono()

    app.get('/health', (c) => {
      return c.json({ status: 'ok' })
    })

    app.get('/session', (c) => {
      const sessions = Session.list()
      return c.json(sessions)
    })

    app.post('/session', async (c) => {
      try {
        const body = await c.req.json()
        const session = Session.create({
          modelId: body.modelId,
          title: body.title,
        })
        return c.json(session, 201)
      } catch (error) {
        return c.json({ error: 'Invalid request' }, 400)
      }
    })

    app.get('/session/:id', (c) => {
      const id = c.req.param('id')
      const session = Session.get(id)
      if (!session) {
        return c.json({ error: 'Session not found' }, 404)
      }
      return c.json(session)
    })

    app.delete('/session/:id', (c) => {
      const id = c.req.param('id')
      Session.remove(id)
      return new Response(null, { status: 204 })
    })

    app.post('/session/:id/message', async (c) => {
      try {
        const id = c.req.param('id')
        const body = await c.req.json()
        const message = Session.addMessage(id, {
          role: body.role,
          content: body.content,
          toolCalls: body.toolCalls,
          toolResults: body.toolResults,
        })
        return c.json(message, 201)
      } catch (error) {
        if (error instanceof Error && error.message.includes('不存在')) {
          return c.json({ error: 'Session not found' }, 404)
        }
        return c.json({ error: 'Invalid request' }, 400)
      }
    })

    // Agent 端点
    app.get('/agents', (c) => {
      const agents = Agent.listAgentDefs()
      return c.json(
        agents.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          mode: a.mode,
          model: a.model,
          tools: a.tools,
        })),
      )
    })

    app.get('/agents/:id', (c) => {
      const id = c.req.param('id')
      const agent = Agent.getAgentDef(id)
      if (!agent) {
        return c.json({ error: 'Agent not found' }, 404)
      }
      return c.json({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        mode: agent.mode,
        model: agent.model,
        tools: agent.tools,
      })
    })

    // Provider 端点
    app.get('/providers', (c) => {
      const providers = Provider.getAvailable()
      return c.json(
        providers.map((p) => ({
          id: p.id,
          name: p.name,
          models: p.models,
        })),
      )
    })

    // Tool 端点
    app.get('/tools', (c) => {
      const tools = ToolRegistry.list()
      return c.json(
        tools.map((t) => ({
          name: t.name,
          description: t.description,
        })),
      )
    })

    // SSE 流式聊天端点
    app.post('/session/:id/chat', async (c) => {
      const sessionId = c.req.param('id')
      const session = Session.get(sessionId)
      if (!session) {
        return c.json({ error: 'Session not found' }, 404)
      }

      try {
        const body = await c.req.json()
        const content = body.content as string
        if (!content) {
          return c.json({ error: 'content is required' }, 400)
        }

        // 添加用户消息
        Session.addMessage(sessionId, { role: 'user', content })

        // 返回 SSE 流
        return new Response(
          new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder()
              const send = (event: string, data: unknown) => {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                )
              }

              try {
                send('start', { sessionId })

                const modelId = body.model || process.env.AXIOM_MODEL
                const agentId = body.agentId || 'build'

                if (modelId) {
                  try {
                    const separator = modelId.includes('/') ? '/' : ':'
                    const parts = modelId.split(separator)
                    if (parts.length !== 2) {
                      throw new Error('Invalid model format')
                    }
                    const [providerId, modelName] = parts

                    const model = ProviderFactory.getLanguageModel(providerId, modelName)

                    const result = await AgentRunner.run({
                      agentId,
                      userMessage: content,
                      model,
                      projectRoot: process.cwd(),
                    })

                    send('text', { content: result.assistantMessage.content })
                    send('done', {
                      messageId: result.assistantMessage.id,
                      usage: result.usage,
                    })
                  } catch (modelError) {
                    const assistantMessage = Session.addMessage(sessionId, {
                      role: 'assistant',
                      content: `[SSE 响应占位] 收到消息: ${content}`,
                    })

                    send('text', { content: assistantMessage.content })
                    send('done', {
                      messageId: assistantMessage.id,
                      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                    })
                  }
                } else {
                  const assistantMessage = Session.addMessage(sessionId, {
                    role: 'assistant',
                    content: `[SSE 响应占位] 收到消息: ${content}`,
                  })

                  send('text', { content: assistantMessage.content })
                  send('done', {
                    messageId: assistantMessage.id,
                    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                  })
                }
              } catch (error) {
                send('error', { message: error instanceof Error ? error.message : String(error) })
              } finally {
                controller.close()
              }
            },
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          },
        )
      } catch (error) {
        return c.json({ error: 'Invalid request' }, 400)
      }
    })

    return app
  }
}
