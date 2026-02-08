import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { AxiomClient } from '../src/index'

describe('AxiomClient', () => {
  let mockFetch: (url: string, options?: any) => Promise<Response>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    mockFetch = async (url: string, options?: any) => {
      const method = options?.method || 'GET'
      const body = options?.body ? JSON.parse(options.body) : null

      if (url.includes('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
        })
      }

      if (url.includes('/sessions') && method === 'GET') {
        return new Response(
          JSON.stringify([
            {
              id: 'sess-1',
              modelId: 'gpt-4',
              title: 'Test Session',
              createdAt: Date.now(),
            },
          ]),
          { status: 200 }
        )
      }

      if (url.includes('/sessions') && method === 'POST' && !url.includes('/messages')) {
        return new Response(
          JSON.stringify({
            id: 'sess-new',
            modelId: body.modelId,
            title: body.title || 'Untitled',
            createdAt: Date.now(),
          }),
          { status: 200 }
        )
      }

      if (url.includes('/sessions/') && method === 'GET' && !url.includes('/messages')) {
        return new Response(
          JSON.stringify({
            id: 'sess-1',
            modelId: 'gpt-4',
            title: 'Test Session',
            createdAt: Date.now(),
          }),
          { status: 200 }
        )
      }

      if (url.includes('/sessions/') && method === 'DELETE') {
        return new Response(null, { status: 204 })
      }

      if (url.includes('/messages') && method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello',
            createdAt: Date.now(),
          }),
          { status: 200 }
        )
      }

      return new Response(null, { status: 404 })
    }

    globalThis.fetch = mockFetch as any
  })

  test('create client with default config', () => {
    const client = AxiomClient.create()
    expect(client).toBeDefined()
    expect(client.health).toBeDefined()
    expect(client.sessions).toBeDefined()
    expect(client.messages).toBeDefined()
  })

  test('create client with custom baseUrl', () => {
    const client = AxiomClient.create({ baseUrl: 'http://localhost:3000' })
    expect(client).toBeDefined()
  })

  test('health check returns status', async () => {
    const client = AxiomClient.create()
    const result = await client.health()
    expect(result.status).toBe('ok')
  })

  test('list sessions returns array', async () => {
    const client = AxiomClient.create()
    const sessions = await client.sessions.list()
    expect(Array.isArray(sessions)).toBe(true)
    expect(sessions.length).toBe(1)
    expect(sessions[0].id).toBe('sess-1')
  })

  test('create session returns new session', async () => {
    const client = AxiomClient.create()
    const session = await client.sessions.create({
      modelId: 'gpt-4',
      title: 'New Session',
    })
    expect(session.id).toBe('sess-new')
    expect(session.modelId).toBe('gpt-4')
    expect(session.title).toBe('New Session')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })
})
