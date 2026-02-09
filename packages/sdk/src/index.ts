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

  export interface AgentInfo {
    id: string
    name: string
    description: string
    mode: string
    model: string
    tools: string[]
  }

  export interface ProviderInfo {
    id: string
    name: string
    models: string[]
  }

  export interface ToolInfo {
    name: string
    description: string
  }

  /** SSE 聊天事件 */
  export type ChatEvent =
    | { type: 'start'; sessionId: string }
    | { type: 'text'; content: string }
    | { type: 'tool-call'; toolName: string; toolCallId: string; input: unknown }
    | {
        type: 'done'
        messageId: string
        usage: { inputTokens: number; outputTokens: number; totalTokens: number }
      }
    | { type: 'error'; message: string }

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
    agents: {
      list(): Promise<AgentInfo[]>
      get(id: string): Promise<AgentInfo>
    }
    providers: {
      list(): Promise<ProviderInfo[]>
    }
    tools: {
      list(): Promise<ToolInfo[]>
    }
    chat(sessionId: string, content: string): AsyncIterable<ChatEvent>
  }

  export function create(config?: Partial<Config>): Client {
    const mergedConfig = Config.parse(config || {})
    const fetchFn = globalThis.fetch

    async function request<T>(path: string, init?: RequestInit): Promise<T> {
      const response = await fetchFn(`${mergedConfig.baseUrl}${path}`, init)
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      return response.json() as Promise<T>
    }

    return {
      async health() {
        return request<{ status: string }>('/health')
      },

      sessions: {
        async list() {
          return request<Session[]>('/session')
        },
        async create(opts) {
          return request<Session>('/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(opts),
          })
        },
        async get(id) {
          return request<Session>(`/session/${id}`)
        },
        async remove(id) {
          await fetchFn(`${mergedConfig.baseUrl}/session/${id}`, { method: 'DELETE' })
        },
      },

      messages: {
        async send(sessionId, content) {
          return request<Message>(`/session/${sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'user', content }),
          })
        },
      },

      agents: {
        async list() {
          return request<AgentInfo[]>('/agents')
        },
        async get(id) {
          return request<AgentInfo>(`/agents/${id}`)
        },
      },

      providers: {
        async list() {
          return request<ProviderInfo[]>('/providers')
        },
      },

      tools: {
        async list() {
          return request<ToolInfo[]>('/tools')
        },
      },

      async *chat(sessionId, content) {
        const response = await fetchFn(`${mergedConfig.baseUrl}/session/${sessionId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (!response.ok) {
          throw new Error(`Chat failed: ${response.status}`)
        }
        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7)
            } else if (line.startsWith('data: ') && currentEvent) {
              const data = JSON.parse(line.slice(6))
              yield { type: currentEvent, ...data } as ChatEvent
              currentEvent = ''
            }
          }
        }
      },
    }
  }
}
