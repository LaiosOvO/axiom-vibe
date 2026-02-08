import { beforeEach, describe, expect, it } from 'bun:test'
import { Server } from '../src/server'
import { Session } from '../src/session'

describe('Server', () => {
  let app: ReturnType<typeof Server.createApp>

  beforeEach(() => {
    Session.reset()
    app = Server.createApp()
  })

  it('健康检查 — GET /health 返回 { status: "ok" }', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ status: 'ok' })
  })

  it('创建会话 — POST /session 返回新会话', async () => {
    const res = await app.request('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'gpt-4', title: '测试会话' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
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
    const data = await res.json()
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
    const created = await createRes.json()
    const sessionId = created.id

    // 获取该会话
    const res = await app.request(`/session/${sessionId}`)
    expect(res.status).toBe(200)
    const data = await res.json()
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
    const created = await createRes.json()
    const sessionId = created.id

    // 发送消息
    const res = await app.request(`/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: '你好' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data.role).toBe('user')
    expect(data.content).toBe('你好')
    expect(data).toHaveProperty('createdAt')
  })
})
