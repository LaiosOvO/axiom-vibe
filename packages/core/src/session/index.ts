import { z } from 'zod'
import { Storage } from '../storage/index.js'

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
    agentId: z.string().optional(),
    messages: z.array(Message),
    createdAt: z.number(),
    updatedAt: z.number(),
  })

  export type Info = z.infer<typeof Info>

  const registry = new Map<string, Info>()

  export function create(opts: { modelId: string; title?: string; agentId?: string }): Info {
    const id = crypto.randomUUID()
    const now = Date.now()
    const title = opts.title ?? `会话 ${new Date(now).toLocaleString('zh-CN')}`

    const info: Info = {
      id,
      title,
      modelId: opts.modelId,
      agentId: opts.agentId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    }

    registry.set(id, info)

    save(id).catch((error) => {
      console.error(`保存会话 ${id} 失败:`, error)
    })

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

    save(sessionId).catch((error) => {
      console.error(`保存会话 ${sessionId} 失败:`, error)
    })

    return msg
  }

  export function remove(id: string): void {
    registry.delete(id)

    Storage.remove(['sessions', id]).catch((error) => {
      console.error(`删除会话 ${id} 失败:`, error)
    })
  }

  export function reset(): void {
    registry.clear()
  }

  /**
   * 将会话数据持久化到磁盘
   * @param id 会话 ID
   */
  export async function save(id: string): Promise<void> {
    const session = registry.get(id)
    if (!session) {
      throw new Error(`会话 ${id} 不存在`)
    }

    await Storage.write(['sessions', id], session)
  }

  /**
   * 从磁盘加载会话数据到内存
   * @param id 会话 ID
   * @returns 会话信息，如果不存在返回 undefined
   */
  export async function loadFromDisk(id: string): Promise<Info | undefined> {
    try {
      const data = await Storage.read<Info>(['sessions', id])
      const validated = Info.parse(data)
      registry.set(id, validated)
      return validated
    } catch (error) {
      if (error instanceof Storage.StorageNotFoundError) {
        return undefined
      }
      throw error
    }
  }

  /**
   * 从磁盘加载所有会话到内存
   */
  export async function loadAll(): Promise<void> {
    const keys = await Storage.list(['sessions'])

    for (const key of keys) {
      if (key.length === 2 && key[0] === 'sessions' && key[1]) {
        const id = key[1]
        try {
          await loadFromDisk(id)
        } catch (error) {
          console.error(`加载会话 ${id} 失败:`, error)
        }
      }
    }
  }

  /**
   * 从磁盘和内存中删除会话
   * @param id 会话 ID
   */
  export async function deleteFromDisk(id: string): Promise<void> {
    registry.delete(id)
    await Storage.remove(['sessions', id])
  }
}
