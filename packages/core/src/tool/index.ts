// biome-ignore lint/style/useImportType: z 在 registerBuiltinTools 中作为值使用
import { z } from 'zod'

export namespace Tool {
  export interface Info<P = unknown, R = unknown> {
    name: string
    description: string
    // biome-ignore lint/suspicious/noExplicitAny: ZodType 需要这些泛型参数
    parameters: z.ZodType<P, any, any>
    // biome-ignore lint/suspicious/noExplicitAny: ZodType 需要这些泛型参数
    result: z.ZodType<R, any, any>
    // biome-ignore lint/suspicious/noExplicitAny: execute 接受验证前的原始输入
    execute: (params: any) => Promise<R>
  }

  export function define<S extends z.ZodType, T extends z.ZodType>(options: {
    name: string
    description: string
    parameters: S
    result: T
    execute: (params: z.infer<S>) => Promise<z.infer<T>>
  }): Info<z.infer<S>, z.infer<T>> {
    const { name, description, parameters, result, execute: rawExecute } = options

    // biome-ignore lint/suspicious/noExplicitAny: 接受任意输入进行验证
    const wrappedExecute = async (params: any): Promise<z.infer<T>> => {
      const validated = parameters.parse(params)
      return rawExecute(validated)
    }

    return {
      name,
      description,
      parameters: parameters as z.ZodType<z.infer<S>, any, any>,
      result: result as z.ZodType<z.infer<T>, any, any>,
      execute: wrappedExecute,
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: 需要存储不同类型的工具
const registry = new Map<string, Tool.Info<any, any>>()

export namespace ToolRegistry {
  export function register<P, R>(tool: Tool.Info<P, R>): void {
    registry.set(tool.name, tool)
  }

  export function get(name: string): Tool.Info | undefined {
    return registry.get(name)
  }

  export function list(): Tool.Info[] {
    return Array.from(registry.values())
  }

  export function has(name: string): boolean {
    return registry.has(name)
  }

  export function resolve(names: string[]): Tool.Info[] {
    const tools: Tool.Info[] = []
    for (const name of names) {
      const tool = registry.get(name)
      if (tool) {
        tools.push(tool)
      }
    }
    return tools
  }

  export function reset(): void {
    registry.clear()
    registerBuiltinTools()
  }
}

function registerBuiltinTools(): void {
  const read = Tool.define({
    name: 'read',
    description: '读取文件内容',
    parameters: z.object({ path: z.string() }),
    result: z.object({ content: z.string() }),
    execute: async (params) => {
      const content = await Bun.file(params.path).text()
      return { content }
    },
  })

  const write = Tool.define({
    name: 'write',
    description: '写入文件内容',
    parameters: z.object({ path: z.string(), content: z.string() }),
    result: z.object({ success: z.boolean() }),
    execute: async (params) => {
      await Bun.write(params.path, params.content)
      return { success: true }
    },
  })

  const bash = Tool.define({
    name: 'bash',
    description: '执行 bash 命令',
    parameters: z.object({ command: z.string() }),
    result: z.object({ stdout: z.string(), stderr: z.string(), exitCode: z.number() }),
    execute: async (params) => {
      const proc = Bun.spawn(['sh', '-c', params.command], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ])
      const exitCode = await proc.exited
      return { stdout, stderr, exitCode }
    },
  })

  ToolRegistry.register(read)
  ToolRegistry.register(write)
  ToolRegistry.register(bash)
}

registerBuiltinTools()
