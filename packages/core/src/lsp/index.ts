import { z } from 'zod'

export namespace LspServer {
  export const Config = z.object({
    language: z.string(),
    command: z.array(z.string()),
    extensions: z.array(z.string()),
    rootPatterns: z.array(z.string()).optional(),
    initOptions: z.record(z.string(), z.unknown()).optional(),
  })

  export type Config = z.infer<typeof Config>

  export const Info = z.object({
    language: z.string(),
    config: Config,
    status: z.enum(['stopped', 'starting', 'running', 'error']),
    error: z.string().optional(),
  })

  export type Info = z.infer<typeof Info>

  const registry = new Map<string, Info>()

  const builtinServers: Info[] = [
    {
      language: 'typescript',
      config: {
        language: 'typescript',
        command: ['typescript-language-server', '--stdio'],
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
      status: 'stopped',
    },
    {
      language: 'python',
      config: {
        language: 'python',
        command: ['pylsp'],
        extensions: ['.py'],
      },
      status: 'stopped',
    },
    {
      language: 'go',
      config: {
        language: 'go',
        command: ['gopls'],
        extensions: ['.go'],
      },
      status: 'stopped',
    },
    {
      language: 'rust',
      config: {
        language: 'rust',
        command: ['rust-analyzer'],
        extensions: ['.rs'],
      },
      status: 'stopped',
    },
    {
      language: 'json',
      config: {
        language: 'json',
        command: ['vscode-json-language-server', '--stdio'],
        extensions: ['.json'],
      },
      status: 'stopped',
    },
  ]

  function initBuiltins() {
    for (const server of builtinServers) {
      registry.set(server.language, server)
    }
  }

  initBuiltins()

  export function register(config: Config): void {
    const validated = Config.parse(config)
    const info: Info = {
      language: validated.language,
      config: validated,
      status: 'stopped',
    }
    registry.set(validated.language, info)
  }

  export function get(language: string): Info | undefined {
    return registry.get(language)
  }

  export function list(): Info[] {
    return Array.from(registry.values())
  }

  export function getByExtension(ext: string): Info | undefined {
    for (const server of list()) {
      if (server.config.extensions.includes(ext)) {
        return server
      }
    }
    return undefined
  }

  export function updateStatus(
    language: string,
    status: 'stopped' | 'starting' | 'running' | 'error',
    error?: string,
  ): void {
    const server = registry.get(language)
    if (server) {
      server.status = status
      if (error) {
        server.error = error
      } else {
        server.error = undefined
      }
    }
  }

  export function remove(language: string): void {
    registry.delete(language)
  }

  export function reset(): void {
    registry.clear()
    initBuiltins()
  }
}

export namespace LspDiagnostic {
  export const Info = z.object({
    file: z.string(),
    line: z.number(),
    character: z.number(),
    severity: z.enum(['error', 'warning', 'info', 'hint']),
    message: z.string(),
    source: z.string().optional(),
  })

  export type Info = z.infer<typeof Info>
}
