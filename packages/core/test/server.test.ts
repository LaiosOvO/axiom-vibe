import { beforeEach, describe, expect, it } from 'bun:test'
import { Server } from '../src/server'
import { Session } from '../src/session'

type SessionResponse = {
  id: string
  modelId?: string
  title?: string
  messages: Array<{ role: string; content: string; id?: string; createdAt?: string }>
}
type AgentResponse = {
  id: string
  name: string
  description: string
  mode: string
  model: string
  tools: string[]
}
type ToolResponse = { name: string; description: string }
type ProviderResponse = { id: string; name: string; models: string[] }
type MessageResponse = { id: string; role: string; content: string; createdAt: string }
type ErrorResponse = { error: string }

describe('Server', () => {
  let app: ReturnType<typeof Server.createApp>

  beforeEach(() => {
    Session.reset()
    app = Server.createApp()
  })

  it('健康检查 — GET /health 返回 { status: "ok" }', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const data = (await res.json()) as { status: string }
    expect(data).toEqual({ status: 'ok' })
  })

  it('创建会话 — POST /session 返回新会话', async () => {
    const res = await app.request('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'gpt-4', title: '测试会话' }),
    })
    expect(res.status).toBe(201)
    const data = (await res.json()) as SessionResponse
    expect(data).toHaveProperty('id')
    expect(data.modelId).toBe('gpt-4')
    expect(data.title).toBe('测试会话')
    expect(data).toHaveProperty('messages')
    expect(Array.isArray(data.messages)).toBe(true)
  })

  it('列出会话 — GET /session 返回数组', async () => {
    // 先创建两个会话
    await app.request('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'gpt-4' }),
    })
    await app.request('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'claude-3' }),
    })

    const res = await app.request('/session')
    expect(res.status).toBe(200)
    const data = (await res.json()) as SessionResponse[]
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(2)
  })

  it('获取会话 — GET /session/:id 返回会话详情', async () => {
    // 先创建一个会话
    const createRes = await app.request('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'gpt-4', title: '我的会话' }),
    })
    const created = (await createRes.json()) as SessionResponse
    const sessionId = created.id

    // 获取该会话
    const res = await app.request(`/session/${sessionId}`)
    expect(res.status).toBe(200)
    const data = (await res.json()) as SessionResponse
    expect(data.id).toBe(sessionId)
    expect(data.title).toBe('我的会话')
  })

  it('404 处理 — GET /session/不存在 返回 404', async () => {
    const res = await app.request('/session/nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('发送消息 — POST /session/:id/message 返回消息', async () => {
    // 先创建一个会话
    const createRes = await app.request('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'gpt-4' }),
    })
    const created = (await createRes.json()) as SessionResponse
    const sessionId = created.id

    // 发送消息
    const res = await app.request(`/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: '你好' }),
    })
    expect(res.status).toBe(201)
    const data = (await res.json()) as MessageResponse
    expect(data).toHaveProperty('id')
    expect(data.role).toBe('user')
    expect(data.content).toBe('你好')
    expect(data).toHaveProperty('createdAt')
  })

  describe('Agent 端点', () => {
    it('GET /agents — 返回 agent 列表', async () => {
      const res = await app.request('/agents')
      expect(res.status).toBe(200)
      const data = (await res.json()) as AgentResponse[]
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      const agent = data[0]!
      expect(agent).toHaveProperty('id')
      expect(agent).toHaveProperty('name')
      expect(agent).toHaveProperty('description')
      expect(agent).toHaveProperty('mode')
      expect(agent).toHaveProperty('model')
      expect(agent).toHaveProperty('tools')
      expect(Array.isArray(agent.tools)).toBe(true)
    })

    it('GET /agents/:id — 返回指定 agent (build)', async () => {
      const res = await app.request('/agents/build')
      expect(res.status).toBe(200)
      const data = (await res.json()) as AgentResponse
      expect(data.id).toBe('build')
      expect(data.name).toBe('Build')
      expect(data.mode).toBe('primary')
      expect(data).toHaveProperty('model')
      expect(data).toHaveProperty('tools')
      expect(Array.isArray(data.tools)).toBe(true)
    })

    it('GET /agents/:id — 返回指定 agent (explore)', async () => {
      const res = await app.request('/agents/explore')
      expect(res.status).toBe(200)
      const data = (await res.json()) as AgentResponse
      expect(data.id).toBe('explore')
      expect(data.name).toBe('Explore')
      expect(data.mode).toBe('subagent')
    })

    it('GET /agents/nonexistent — 返回 404', async () => {
      const res = await app.request('/agents/nonexistent')
      expect(res.status).toBe(404)
      const data = (await res.json()) as ErrorResponse
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Agent not found')
    })
  })

  describe('Provider 端点', () => {
    it('GET /providers — 返回 provider 列表', async () => {
      const res = await app.request('/providers')
      expect(res.status).toBe(200)
      const data = (await res.json()) as ProviderResponse[]
      expect(Array.isArray(data)).toBe(true)
      if (data.length > 0) {
        const provider = data[0]!
        expect(provider).toHaveProperty('id')
        expect(provider).toHaveProperty('name')
        expect(provider).toHaveProperty('models')
        expect(Array.isArray(provider.models)).toBe(true)
      }
    })
  })

  describe('Tool 端点', () => {
    it('GET /tools — 返回工具列表', async () => {
      const res = await app.request('/tools')
      expect(res.status).toBe(200)
      const data = (await res.json()) as ToolResponse[]
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      const tool = data[0]
      expect(tool).toHaveProperty('name')
      expect(tool).toHaveProperty('description')
    })

    it('GET /tools — 包含内置工具 read', async () => {
      const res = await app.request('/tools')
      const data = (await res.json()) as ToolResponse[]
      const readTool = data.find((t) => t.name === 'read')
      expect(readTool).toBeDefined()
      expect(readTool!.description).toBe('读取文件内容')
    })

    it('GET /tools — 包含内置工具 write', async () => {
      const res = await app.request('/tools')
      const data = (await res.json()) as ToolResponse[]
      const writeTool = data.find((t) => t.name === 'write')
      expect(writeTool).toBeDefined()
      expect(writeTool!.description).toBe('写入文件内容')
    })
  })

  describe('SSE 流式聊天端点', () => {
    it('POST /session/:id/chat — 返回 SSE 流', async () => {
      const createRes = await app.request('/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: 'gpt-4' }),
      })
      const session = (await createRes.json()) as SessionResponse
      const sessionId = session.id

      const res = await app.request(`/session/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '你好' }),
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/event-stream')
      expect(res.headers.get('Cache-Control')).toBe('no-cache')

      const text = await res.text()
      expect(text).toContain('event: start')
      expect(text).toContain('event: text')
      expect(text).toContain('event: done')
      expect(text).toContain(sessionId)
    })

    it('POST /session/:id/chat — 无 content 返回 400', async () => {
      const createRes = await app.request('/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: 'gpt-4' }),
      })
      const session = (await createRes.json()) as SessionResponse
      const sessionId = session.id

      const res = await app.request(`/session/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const data = (await res.json()) as ErrorResponse
      expect(data.error).toBe('content is required')
    })

    it('POST /session/nonexistent/chat — 返回 404', async () => {
      const res = await app.request('/session/nonexistent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '你好' }),
      })

      expect(res.status).toBe(404)
      const data = (await res.json()) as ErrorResponse
      expect(data.error).toBe('Session not found')
    })

    it('POST /session/:id/chat — 验证消息已添加到会话', async () => {
      const createRes = await app.request('/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: 'gpt-4' }),
      })
      const session = (await createRes.json()) as SessionResponse
      const sessionId = session.id

      await app.request(`/session/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hello' }),
      })

      const getRes = await app.request(`/session/${sessionId}`)
      const updatedSession = (await getRes.json()) as SessionResponse
      expect(updatedSession.messages.length).toBeGreaterThan(0)
      const userMsg = updatedSession.messages.find((m) => m.role === 'user')
      const assistantMsg = updatedSession.messages.find((m) => m.role === 'assistant')
      expect(userMsg).toBeDefined()
      expect(userMsg!.content).toBe('Hello')
      expect(assistantMsg).toBeDefined()
    })
  })
})
