import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

// models.dev 远程模型数据库 — 参考 opencode
export namespace ModelsDev {
  const MODELS_DEV_URL = process.env.AXIOM_MODELS_URL || 'https://models.dev'
  const cacheDir = join(homedir(), '.axiom', 'cache')
  const cachePath = join(cacheDir, 'models.json')

  export const Model = z.object({
    id: z.string(),
    name: z.string(),
    family: z.string().optional(),
    release_date: z.string(),
    attachment: z.boolean(),
    reasoning: z.boolean(),
    temperature: z.boolean(),
    tool_call: z.boolean(),
    interleaved: z
      .union([
        z.literal(true),
        z
          .object({
            field: z.enum(['reasoning_content', 'reasoning_details']),
          })
          .strict(),
      ])
      .optional(),
    cost: z
      .object({
        input: z.number(),
        output: z.number(),
        cache_read: z.number().optional(),
        cache_write: z.number().optional(),
      })
      .optional(),
    limit: z.object({
      context: z.number(),
      input: z.number().optional(),
      output: z.number(),
    }),
    modalities: z
      .object({
        input: z.array(z.enum(['text', 'audio', 'image', 'video', 'pdf'])),
        output: z.array(z.enum(['text', 'audio', 'image', 'video', 'pdf'])),
      })
      .optional(),
    status: z.enum(['alpha', 'beta', 'deprecated']).optional(),
    options: z.record(z.string(), z.any()),
    headers: z.record(z.string(), z.string()).optional(),
    provider: z.object({ npm: z.string() }).optional(),
  })
  export type Model = z.infer<typeof Model>

  export const Provider = z.object({
    api: z.string().optional(),
    name: z.string(),
    env: z.array(z.string()),
    id: z.string(),
    npm: z.string().optional(),
    models: z.record(z.string(), Model),
  })
  export type Provider = z.infer<typeof Provider>

  let cached: Record<string, Provider> | undefined

  export async function get(): Promise<Record<string, Provider>> {
    if (cached) return cached

    // 尝试读本地缓存
    try {
      const text = await readFile(cachePath, 'utf-8')
      cached = JSON.parse(text) as Record<string, Provider>
      // 后台刷新
      refresh().catch(() => {})
      return cached
    } catch {
      // 缓存不存在，直接 fetch
    }

    try {
      const json = await fetch(`${MODELS_DEV_URL}/api.json`, {
        signal: AbortSignal.timeout(10_000),
      }).then((r) => r.text())
      cached = JSON.parse(json) as Record<string, Provider>
      // 写入缓存
      await mkdir(cacheDir, { recursive: true }).catch(() => {})
      await writeFile(cachePath, json).catch(() => {})
      return cached
    } catch {
      // fetch 也失败了，返回空
      return {}
    }
  }

  export async function refresh(): Promise<void> {
    try {
      const result = await fetch(`${MODELS_DEV_URL}/api.json`, {
        signal: AbortSignal.timeout(10_000),
      })
      if (result.ok) {
        const text = await result.text()
        cached = JSON.parse(text) as Record<string, Provider>
        await mkdir(cacheDir, { recursive: true }).catch(() => {})
        await writeFile(cachePath, text).catch(() => {})
      }
    } catch {
      // 静默失败
    }
  }

  // 清除缓存（测试用）
  export function clearCache(): void {
    cached = undefined
  }
}

// 60 分钟自动刷新
const interval = setInterval(() => ModelsDev.refresh(), 60 * 60 * 1000)
if (typeof interval === 'object' && 'unref' in interval) {
  interval.unref()
}
