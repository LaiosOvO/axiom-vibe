import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

export namespace Config {
  export const Info = z
    .object({
      provider: z
        .object({
          default: z.string(),
        })
        .default({ default: 'anthropic' }),
      agent: z
        .object({
          default: z.string(),
        })
        .default({ default: 'orchestrator' }),
      spec: z
        .object({
          dir: z.string(),
        })
        .default({ dir: 'specs' }),
      growth: z
        .object({
          enabled: z.boolean(),
        })
        .default({ enabled: true }),
    })
    .default({
      provider: { default: 'anthropic' },
      agent: { default: 'orchestrator' },
      spec: { dir: 'specs' },
      growth: { enabled: true },
    })

  export type Info = z.infer<typeof Info>

  export function defaults(): Info {
    return Info.parse({})
  }

  export function merge(base: Partial<Info>, ...overrides: Partial<Info>[]): Info {
    let result: Record<string, unknown> = { ...base }

    for (const override of overrides) {
      result = deepMerge(result, override) as Record<string, unknown>
    }

    return Info.parse(result)
  }

  function deepMerge(target: unknown, source: unknown): unknown {
    if (!isObject(target) || !isObject(source)) {
      return source
    }

    const result = { ...target }

    for (const key of Object.keys(source)) {
      const sourceValue = (source as Record<string, unknown>)[key]
      const targetValue = (result as Record<string, unknown>)[key]

      if (isObject(sourceValue) && isObject(targetValue)) {
        ;(result as Record<string, unknown>)[key] = deepMerge(targetValue, sourceValue)
      } else {
        ;(result as Record<string, unknown>)[key] = sourceValue
      }
    }

    return result
  }

  function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  export function fromEnv(): Partial<Info> {
    const config: Record<string, unknown> = {}

    if (process.env.AXIOM_PROVIDER_DEFAULT) {
      config.provider = { default: process.env.AXIOM_PROVIDER_DEFAULT }
    }

    if (process.env.AXIOM_AGENT_DEFAULT) {
      config.agent = { default: process.env.AXIOM_AGENT_DEFAULT }
    }

    if (process.env.AXIOM_SPEC_DIR) {
      config.spec = { dir: process.env.AXIOM_SPEC_DIR }
    }

    if (process.env.AXIOM_GROWTH_ENABLED) {
      config.growth = { enabled: process.env.AXIOM_GROWTH_ENABLED === 'true' }
    }

    return config as Partial<Info>
  }

  export function load(opts?: { projectDir?: string }): Info {
    const base = defaults()
    const overrides: Partial<Info>[] = []

    const globalConfigPath = join(homedir(), '.axiom', 'config.json')
    if (existsSync(globalConfigPath)) {
      try {
        const content = readFileSync(globalConfigPath, 'utf-8')
        const globalConfig = JSON.parse(content)
        overrides.push(globalConfig)
      } catch {
        // 忽略解析错误
      }
    }

    if (opts?.projectDir) {
      const projectConfigPath = join(opts.projectDir, '.axiom.json')
      if (existsSync(projectConfigPath)) {
        try {
          const content = readFileSync(projectConfigPath, 'utf-8')
          const projectConfig = JSON.parse(content)
          overrides.push(projectConfig)
        } catch {
          // 忽略解析错误
        }
      }
    }

    const envConfig = fromEnv()
    if (Object.keys(envConfig).length > 0) {
      overrides.push(envConfig)
    }

    return merge(base, ...overrides)
  }

  export function parseMarkdownFrontmatter(content: string): {
    frontmatter: Record<string, unknown>
    content: string
  } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

    if (!match) {
      return { frontmatter: {}, content }
    }

    const yamlContent = match[1] ?? ''
    const bodyContent = match[2] ?? ''
    const frontmatter = parseSimpleYaml(yamlContent)

    return {
      frontmatter,
      content: bodyContent,
    }
  }

  function parseSimpleYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const lines = yaml.split('\n')
    let currentKey: string | null = null
    let currentArray: unknown[] = []

    for (const line of lines) {
      if (line.match(/^\s+-\s+(.+)$/)) {
        const value = line.match(/^\s+-\s+(.+)$/)?.[1]
        if (currentKey && value) {
          currentArray.push(parseValue(value))
        }
        continue
      }

      const kvMatch = line.match(/^([^:]+):\s*(.*)$/)
      if (kvMatch) {
        if (currentKey && currentArray.length > 0) {
          result[currentKey] = currentArray
          currentArray = []
        }

        const key = kvMatch[1] ?? ''
        const value = kvMatch[2] ?? ''
        currentKey = key.trim()

        if (value) {
          result[currentKey] = parseValue(value)
          currentKey = null
        }
      }
    }

    if (currentKey && currentArray.length > 0) {
      result[currentKey] = currentArray
    }

    return result
  }

  function parseValue(value: string): unknown {
    const trimmed = value.trim()

    if (trimmed === 'true') return true
    if (trimmed === 'false') return false

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed)
    }

    return trimmed
  }
}
