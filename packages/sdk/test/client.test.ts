import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
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

      if (url.includes('/session') && method === 'GET' && !url.includes('/session/')) {
        return new Response(
          JSON.stringify([
            {
              id: 'sess-1',
              modelId: 'gpt-4',
              title: 'Test Session',
              createdAt: Date.now(),
            },
          ]),
          { status: 200 },
        )
      }

      if (
        url.includes('/session') &&
        method === 'POST' &&
        !url.includes('/message') &&
        !url.includes('/chat')
      ) {
        return new Response(
          JSON.stringify({
            id: 'sess-new',
            modelId: body.modelId,
            title: body.title || 'Untitled',
            createdAt: Date.now(),
          }),
          { status: 200 },
        )
      }

      if (
        url.includes('/session/') &&
        method === 'GET' &&
        !url.includes('/message') &&
        !url.includes('/chat')
      ) {
        return new Response(
          JSON.stringify({
            id: 'sess-1',
            modelId: 'gpt-4',
            title: 'Test Session',
            createdAt: Date.now(),
          }),
          { status: 200 },
        )
      }

      if (url.includes('/session/') && method === 'DELETE') {
        return new Response(null, { status: 204 })
      }

      if (url.includes('/message') && method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello',
            createdAt: Date.now(),
          }),
          { status: 200 },
        )
      }

      if (url.includes('/agents') && method === 'GET' && !url.includes('/agents/')) {
        return new Response(
          JSON.stringify([
            {
              id: 'agent-1',
              name: 'Test Agent',
              description: 'Test agent description',
              mode: 'chat',
              model: 'gpt-4',
              tools: ['tool1', 'tool2'],
            },
          ]),
          { status: 200 },
        )
      }

      if (url.includes('/agents/') && method === 'GET') {
        return new Response(
          JSON.stringify({
            id: 'agent-1',
            name: 'Test Agent',
            description: 'Test agent description',
            mode: 'chat',
            model: 'gpt-4',
            tools: ['tool1', 'tool2'],
          }),
          { status: 200 },
        )
      }

      if (url.includes('/providers') && method === 'GET') {
        return new Response(
          JSON.stringify([
            {
              id: 'provider-1',
              name: 'OpenAI',
              models: ['gpt-4', 'gpt-3.5-turbo'],
            },
          ]),
          { status: 200 },
        )
      }

      if (url.includes('/tools') && method === 'GET') {
        return new Response(
          JSON.stringify([
            {
              name: 'tool1',
              description: 'Tool 1 description',
            },
            {
              name: 'tool2',
              description: 'Tool 2 description',
            },
          ]),
          { status: 200 },
        )
      }

      if (url.includes('/chat') && method === 'POST') {
        const encoder = new TextEncoder()
        const sseData = [
          'event: start',
          'data: {"sessionId":"sess-1"}',
          '',
          'event: text',
          'data: {"content":"Hello"}',
          '',
          'event: text',
          'data: {"content":" World"}',
          '',
          'event: done',
          'data: {"messageId":"msg-1","usage":{"inputTokens":10,"outputTokens":20,"totalTokens":30}}',
          '',
        ].join('\n')

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(sseData))
            controller.close()
          },
        })
        return new Response(stream, { status: 200 })
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
    expect(client.agents).toBeDefined()
    expect(client.providers).toBeDefined()
    expect(client.tools).toBeDefined()
    expect(client.chat).toBeDefined()
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
    expect(sessions[0]!.id).toBe('sess-1')
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

  test('get session returns session', async () => {
    const client = AxiomClient.create()
    const session = await client.sessions.get('sess-1')
    expect(session.id).toBe('sess-1')
    expect(session.modelId).toBe('gpt-4')
  })

  test('remove session succeeds', async () => {
    const client = AxiomClient.create()
    await expect(client.sessions.remove('sess-1')).resolves.toBeUndefined()
  })

  test('send message returns message', async () => {
    const client = AxiomClient.create()
    const message = await client.messages.send('sess-1', 'Hello')
    expect(message.id).toBe('msg-1')
    expect(message.role).toBe('assistant')
    expect(message.content).toBe('Hello')
  })

  test('list agents returns array', async () => {
    const client = AxiomClient.create()
    const agents = await client.agents.list()
    expect(Array.isArray(agents)).toBe(true)
    expect(agents.length).toBe(1)
    expect(agents[0]!.id).toBe('agent-1')
    expect(agents[0]!.name).toBe('Test Agent')
  })

  test('get agent returns agent', async () => {
    const client = AxiomClient.create()
    const agent = await client.agents.get('agent-1')
    expect(agent.id).toBe('agent-1')
    expect(agent.name).toBe('Test Agent')
    expect(agent.tools.length).toBe(2)
  })

  test('list providers returns array', async () => {
    const client = AxiomClient.create()
    const providers = await client.providers.list()
    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBe(1)
    expect(providers[0]!.id).toBe('provider-1')
    expect(providers[0]!.models.length).toBe(2)
  })

  test('list tools returns array', async () => {
    const client = AxiomClient.create()
    const tools = await client.tools.list()
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBe(2)
    expect(tools[0]!.name).toBe('tool1')
    expect(tools[1]!.name).toBe('tool2')
  })

  test('chat returns SSE event stream', async () => {
    const client = AxiomClient.create()
    const events: AxiomClient.ChatEvent[] = []

    for await (const event of client.chat('sess-1', 'Hello')) {
      events.push(event)
    }

    expect(events.length).toBe(4)
    expect(events[0]).toEqual({ type: 'start', sessionId: 'sess-1' })
    expect(events[1]).toEqual({ type: 'text', content: 'Hello' })
    expect(events[2]).toEqual({ type: 'text', content: ' World' })
    expect(events[3]).toEqual({
      type: 'done',
      messageId: 'msg-1',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })
})
