// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace McpServer {
  export const LocalConfig = z.object({
    type: z.literal('local'),
    command: z.array(z.string()),
    environment: z.record(z.string(), z.string()).optional(),
    enabled: z.boolean().default(true),
    timeout: z.number().default(30000),
  })

  export const RemoteConfig = z.object({
    type: z.literal('remote'),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    enabled: z.boolean().default(true),
    timeout: z.number().default(30000),
  })

  export const Config = z.discriminatedUnion('type', [LocalConfig, RemoteConfig])
  export type Config = z.infer<typeof Config>

  export const Info = z.object({
    name: z.string(),
    config: Config,
    status: z.enum(['disconnected', 'connecting', 'connected', 'error']),
    error: z.string().optional(),
    toolCount: z.number().default(0),
  })
  export type Info = z.infer<typeof Info>

  const registry = new Map<string, Info>()

  export function register(name: string, config: Config): void {
    const validatedConfig = Config.parse(config)
    const info: Info = {
      name,
      config: validatedConfig,
      status: 'disconnected',
      toolCount: 0,
    }
    registry.set(name, info)
  }

  export function get(name: string): Info | undefined {
    return registry.get(name)
  }

  export function list(): Info[] {
    return Array.from(registry.values())
  }

  export function remove(name: string): void {
    registry.delete(name)
  }

  export function updateStatus(
    name: string,
    status: 'disconnected' | 'connecting' | 'connected' | 'error',
    error?: string,
  ): void {
    const info = registry.get(name)
    if (info) {
      info.status = status
      if (error !== undefined) {
        info.error = error
      } else if (status !== 'error') {
        info.error = undefined
      }
    }
  }

  export function reset(): void {
    registry.clear()
  }
}
