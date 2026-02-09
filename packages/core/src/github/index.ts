import { z } from 'zod'

export namespace GitHubSearch {
  export const SearchOptions = z.object({
    query: z.string(),
    language: z.string().optional(),
    minStars: z.number().default(0),
    maxAgeDays: z.number().optional(),
    sort: z.enum(['stars', 'updated', 'relevance']).default('stars'),
    limit: z.number().default(10),
  })

  export type SearchOptions = z.infer<typeof SearchOptions>

  export const RepoInfo = z.object({
    fullName: z.string(),
    url: z.string(),
    description: z.string(),
    stars: z.number(),
    forks: z.number(),
    language: z.string(),
    lastUpdated: z.string(),
    topics: z.array(z.string()),
    license: z.string(),
  })

  export type RepoInfo = z.infer<typeof RepoInfo>

  // 缓存存储：Map<query, { results: RepoInfo[]; timestamp: number }>
  const cache = new Map<string, { results: RepoInfo[]; timestamp: number }>()
  const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 小时

  // 构建 GitHub API 搜索查询字符串
  export function buildQuery(options: z.input<typeof SearchOptions>): string {
    let query = options.query

    if (options.language) {
      query += ` language:${options.language}`
    }

    const minStars = options.minStars ?? 0
    if (minStars > 0) {
      query += ` stars:>=${minStars}`
    }

    return query
  }

  // 扩展查询（中文 → 英文变体等）
  export function expandQuery(query: string): string[] {
    const variants: string[] = [query]

    // 添加小写版本
    if (query !== query.toLowerCase()) {
      variants.push(query.toLowerCase())
    }

    // 简单的中文到英文映射
    const chineseToEnglish: Record<string, string> = {
      框架: 'framework',
      库: 'library',
      工具: 'tool',
      终端: 'terminal',
      UI: 'ui',
      用户界面: 'ui',
    }

    // 检查是否包含中文关键词，生成英文变体
    let hasChineseKeyword = false
    let englishVariant = query

    for (const [chinese, english] of Object.entries(chineseToEnglish)) {
      if (query.includes(chinese)) {
        englishVariant = englishVariant.replace(chinese, english)
        hasChineseKeyword = true
      }
    }

    if (hasChineseKeyword && englishVariant !== query) {
      variants.push(englishVariant)
    }

    // 添加额外的通用变体
    if (query.toLowerCase().includes('tui')) {
      if (!variants.includes('terminal ui framework')) {
        variants.push('terminal ui framework')
      }
      if (!variants.includes('tui library')) {
        variants.push('tui library')
      }
    }

    return variants
  }

  // 对结果排序
  export function sortResults(
    results: RepoInfo[],
    sort: 'stars' | 'updated' | 'relevance',
  ): RepoInfo[] {
    const sorted = [...results]

    if (sort === 'stars') {
      sorted.sort((a, b) => b.stars - a.stars)
    } else if (sort === 'updated') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.lastUpdated).getTime()
        const dateB = new Date(b.lastUpdated).getTime()
        return dateB - dateA
      })
    }
    // relevance 保持原序

    return sorted
  }

  // 过滤过期仓库
  export function filterByAge(results: RepoInfo[], maxAgeDays: number): RepoInfo[] {
    const now = new Date()
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000

    return results.filter((repo) => {
      const lastUpdated = new Date(repo.lastUpdated)
      const ageMs = now.getTime() - lastUpdated.getTime()
      return ageMs <= maxAgeMs
    })
  }

  // 结果去重（按 fullName）
  export function deduplicate(results: RepoInfo[]): RepoInfo[] {
    const seen = new Set<string>()
    const deduped: RepoInfo[] = []

    for (const repo of results) {
      if (!seen.has(repo.fullName)) {
        seen.add(repo.fullName)
        deduped.push(repo)
      }
    }

    return deduped
  }

  // 缓存管理（内存缓存）
  export function getCached(query: string): RepoInfo[] | undefined {
    const cached = cache.get(query)

    if (!cached) {
      return undefined
    }

    // 检查缓存是否过期
    const now = Date.now()
    if (now - cached.timestamp > CACHE_TTL) {
      cache.delete(query)
      return undefined
    }

    return cached.results
  }

  export function setCache(query: string, results: RepoInfo[]): void {
    cache.set(query, {
      results,
      timestamp: Date.now(),
    })
  }

  export function clearCache(): void {
    cache.clear()
  }

  export function reset(): void {
    clearCache()
  }
}
