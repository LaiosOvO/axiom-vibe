// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace Session {
  export const Message = z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
    toolCalls: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          arguments: z.unknown(),
        }),
      )
      .optional(),
    toolResults: z
      .array(
        z.object({
          callId: z.string(),
          result: z.unknown(),
        }),
      )
      .optional(),
    createdAt: z.number(),
  })

  export type Message = z.infer<typeof Message>

  export const Info = z.object({
    id: z.string(),
    title: z.string(),
    modelId: z.string(),
    messages: z.array(Message),
    createdAt: z.number(),
    updatedAt: z.number(),
  })

  export type Info = z.infer<typeof Info>

  const registry = new Map<string, Info>()

  export function create(opts: { modelId: string; title?: string }): Info {
    const id = crypto.randomUUID()
    const now = Date.now()
    const title = opts.title ?? `会话 ${new Date(now).toLocaleString('zh-CN')}`

    const info: Info = {
      id,
      title,
      modelId: opts.modelId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    }

    registry.set(id, info)
    return info
  }

  export function get(id: string): Info | undefined {
    return registry.get(id)
  }

  export function list(): Info[] {
    return Array.from(registry.values())
  }

  export function addMessage(
    sessionId: string,
    message: {
      role: Message['role']
      content: string
      toolCalls?: Message['toolCalls']
      toolResults?: Message['toolResults']
    },
  ): Message {
    const session = registry.get(sessionId)
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`)
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    const msg: Message = {
      id,
      role: message.role,
      content: message.content,
      toolCalls: message.toolCalls,
      toolResults: message.toolResults,
      createdAt: now,
    }

    session.messages.push(msg)
    session.updatedAt = now

    return msg
  }

  export function remove(id: string): void {
    registry.delete(id)
  }

  export function reset(): void {
    registry.clear()
  }
}
