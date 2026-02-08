import { Hono } from 'hono'
// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'
import { Session } from '../session'

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

    return app
  }
}
