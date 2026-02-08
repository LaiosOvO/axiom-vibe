// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace AxiomClient {
  export const Config = z.object({
    baseUrl: z.string().default('http://127.0.0.1:4096'),
  })

  export type Config = z.infer<typeof Config>

  export interface Session {
    id: string
    modelId: string
    title: string
    createdAt: number
  }

  export interface Message {
    id: string
    role: string
    content: string
    createdAt: number
  }

  export interface Client {
    health(): Promise<{ status: string }>
    sessions: {
      list(): Promise<Session[]>
      create(opts: { modelId: string; title?: string }): Promise<Session>
      get(id: string): Promise<Session>
      remove(id: string): Promise<void>
    }
    messages: {
      send(sessionId: string, content: string): Promise<Message>
    }
  }

  export function create(config?: Partial<Config>): Client {
    const mergedConfig = Config.parse(config || {})
    const fetchFn = globalThis.fetch

    return {
      async health(): Promise<{ status: string }> {
        const response = await fetchFn(`${mergedConfig.baseUrl}/health`)
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.statusText}`)
        }
        return response.json() as Promise<{ status: string }>
      },

      sessions: {
        async list(): Promise<Session[]> {
          const response = await fetchFn(`${mergedConfig.baseUrl}/sessions`)
          if (!response.ok) {
            throw new Error(`Failed to list sessions: ${response.statusText}`)
          }
          return response.json() as Promise<Session[]>
        },

        async create(opts: {
          modelId: string
          title?: string
        }): Promise<Session> {
          const response = await fetchFn(`${mergedConfig.baseUrl}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(opts),
          })
          if (!response.ok) {
            throw new Error(`Failed to create session: ${response.statusText}`)
          }
          return response.json() as Promise<Session>
        },

        async get(id: string): Promise<Session> {
          const response = await fetchFn(
            `${mergedConfig.baseUrl}/sessions/${id}`
          )
          if (!response.ok) {
            throw new Error(`Failed to get session: ${response.statusText}`)
          }
          return response.json() as Promise<Session>
        },

        async remove(id: string): Promise<void> {
          const response = await fetchFn(
            `${mergedConfig.baseUrl}/sessions/${id}`,
            { method: 'DELETE' }
          )
          if (!response.ok) {
            throw new Error(`Failed to remove session: ${response.statusText}`)
          }
        },
      },

      messages: {
        async send(sessionId: string, content: string): Promise<Message> {
          const response = await fetchFn(
            `${mergedConfig.baseUrl}/sessions/${sessionId}/messages`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content }),
            }
          )
          if (!response.ok) {
            throw new Error(`Failed to send message: ${response.statusText}`)
          }
          return response.json() as Promise<Message>
        },
      },
    }
  }
}
