import { beforeEach, describe, expect, it } from 'bun:test'
import { Session } from '../src/session'

describe('Session', () => {
  beforeEach(() => {
    Session.reset()
  })

  it('创建会话 — 返回 Info 包含 id、空 messages', () => {
    const info = Session.create({ modelId: 'claude-3-5-sonnet', title: '测试会话' })

    expect(info).toBeDefined()
    expect(info.id).toBeDefined()
    expect(typeof info.id).toBe('string')
    expect(info.title).toBe('测试会话')
    expect(info.modelId).toBe('claude-3-5-sonnet')
    expect(info.messages).toEqual([])
    expect(info.createdAt).toBeDefined()
    expect(typeof info.createdAt).toBe('number')
    expect(info.updatedAt).toBeDefined()
    expect(typeof info.updatedAt).toBe('number')
  })

  it('创建会话 — 不提供 title 时使用默认值', () => {
    const info = Session.create({ modelId: 'claude-3-5-sonnet' })

    expect(info.title).toBeDefined()
    expect(typeof info.title).toBe('string')
  })

  it('获取会话 — get 返回正确会话', () => {
    const created = Session.create({ modelId: 'claude-3-5-sonnet', title: '测试' })
    const retrieved = Session.get(created.id)

    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe(created.id)
    expect(retrieved?.title).toBe('测试')
    expect(retrieved?.modelId).toBe('claude-3-5-sonnet')
  })

  it('获取不存在会话 — get 返回 undefined', () => {
    const result = Session.get('non-existent-id')

    expect(result).toBeUndefined()
  })

  it('列出会话 — list 返回全部', () => {
    const session1 = Session.create({ modelId: 'claude-3-5-sonnet', title: '会话1' })
    const session2 = Session.create({ modelId: 'claude-3-5-haiku', title: '会话2' })

    const list = Session.list()

    expect(list).toHaveLength(2)
    expect(list.map((s) => s.id)).toContain(session1.id)
    expect(list.map((s) => s.id)).toContain(session2.id)
  })

  it('添加消息 — addMessage 后 messages 包含该消息', () => {
    const session = Session.create({ modelId: 'claude-3-5-sonnet' })

    const message = Session.addMessage(session.id, {
      role: 'user',
      content: '你好',
    })

    expect(message).toBeDefined()
    expect(message.id).toBeDefined()
    expect(message.role).toBe('user')
    expect(message.content).toBe('你好')
    expect(message.createdAt).toBeDefined()

    const updated = Session.get(session.id)
    expect(updated?.messages).toHaveLength(1)
    expect(updated?.messages[0]?.id).toBe(message.id)
    expect(updated?.messages[0]?.content).toBe('你好')
  })

  it('添加消息 — 支持 toolCalls', () => {
    const session = Session.create({ modelId: 'claude-3-5-sonnet' })

    const toolCalls = [
      {
        id: 'call-1',
        name: 'read_file',
        arguments: { path: '/tmp/test.txt' },
      },
    ]

    const message = Session.addMessage(session.id, {
      role: 'assistant',
      content: '我来读取文件',
      toolCalls,
    })

    expect(message.toolCalls).toEqual(toolCalls)

    const updated = Session.get(session.id)
    expect(updated?.messages[0]?.toolCalls).toEqual(toolCalls)
  })

  it('添加消息 — 支持 toolResults', () => {
    const session = Session.create({ modelId: 'claude-3-5-sonnet' })

    const toolResults = [
      {
        callId: 'call-1',
        result: { content: '文件内容' },
      },
    ]

    const message = Session.addMessage(session.id, {
      role: 'tool',
      content: '工具执行结果',
      toolResults,
    })

    expect(message.toolResults).toEqual(toolResults)

    const updated = Session.get(session.id)
    expect(updated?.messages[0]?.toolResults).toEqual(toolResults)
  })

  it('删除会话 — remove 后 get 返回 undefined', () => {
    const session = Session.create({ modelId: 'claude-3-5-sonnet' })

    Session.remove(session.id)

    const result = Session.get(session.id)
    expect(result).toBeUndefined()
  })

  it('重置 — reset 后 list 返回空数组', () => {
    Session.create({ modelId: 'claude-3-5-sonnet' })
    Session.create({ modelId: 'claude-3-5-haiku' })

    expect(Session.list()).toHaveLength(2)

    Session.reset()

    expect(Session.list()).toHaveLength(0)
  })

  it('Message schema 验证 — 有效的消息通过验证', () => {
    const validMessage = {
      id: 'msg-1',
      role: 'user' as const,
      content: '测试',
      createdAt: Date.now(),
    }

    const result = Session.Message.safeParse(validMessage)
    expect(result.success).toBe(true)
  })

  it('Message schema 验证 — 无效的 role 失败', () => {
    const invalidMessage = {
      id: 'msg-1',
      role: 'invalid',
      content: '测试',
      createdAt: Date.now(),
    }

    const result = Session.Message.safeParse(invalidMessage)
    expect(result.success).toBe(false)
  })

  it('Info schema 验证 — 有效的会话通过验证', () => {
    const validInfo = {
      id: 'session-1',
      title: '测试',
      modelId: 'claude-3-5-sonnet',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const result = Session.Info.safeParse(validInfo)
    expect(result.success).toBe(true)
  })
})
