import { beforeEach, describe, expect, it } from 'bun:test'
import { GitHubSearch } from '../src/github/index.ts'

describe('GitHubSearch', () => {
  beforeEach(() => {
    GitHubSearch.reset()
  })

  it('buildQuery 应该包含 language 和 stars 过滤', () => {
    const query = GitHubSearch.buildQuery({
      query: 'tui framework',
      language: 'typescript',
      minStars: 100,
    })

    expect(query).toBe('tui framework language:typescript stars:>=100')
  })

  it('expandQuery 应该返回多个查询变体', () => {
    const variants = GitHubSearch.expandQuery('TUI 框架')

    expect(variants).toBeInstanceOf(Array)
    expect(variants.length).toBeGreaterThanOrEqual(2)
    expect(variants).toContain('TUI 框架')
    expect(variants.some((v) => v.toLowerCase().includes('tui'))).toBe(true)
  })

  it('sortResults 应该按 stars 降序排列', () => {
    const results = [
      {
        fullName: 'repo1',
        url: 'https://github.com/repo1',
        description: 'desc1',
        stars: 50,
        forks: 10,
        language: 'typescript',
        lastUpdated: '2024-01-01T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
      {
        fullName: 'repo2',
        url: 'https://github.com/repo2',
        description: 'desc2',
        stars: 200,
        forks: 20,
        language: 'typescript',
        lastUpdated: '2024-01-02T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
      {
        fullName: 'repo3',
        url: 'https://github.com/repo3',
        description: 'desc3',
        stars: 100,
        forks: 15,
        language: 'typescript',
        lastUpdated: '2024-01-03T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
    ]

    const sorted = GitHubSearch.sortResults(results, 'stars')

    expect(sorted[0].stars).toBe(200)
    expect(sorted[1].stars).toBe(100)
    expect(sorted[2].stars).toBe(50)
  })

  it('filterByAge 应该过滤超过 maxAgeDays 的仓库', () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const results = [
      {
        fullName: 'repo1',
        url: 'https://github.com/repo1',
        description: 'desc1',
        stars: 50,
        forks: 10,
        language: 'typescript',
        lastUpdated: oneDayAgo.toISOString(),
        topics: [],
        license: 'MIT',
      },
      {
        fullName: 'repo2',
        url: 'https://github.com/repo2',
        description: 'desc2',
        stars: 200,
        forks: 20,
        language: 'typescript',
        lastUpdated: thirtyDaysAgo.toISOString(),
        topics: [],
        license: 'MIT',
      },
    ]

    const filtered = GitHubSearch.filterByAge(results, 7)

    expect(filtered.length).toBe(1)
    expect(filtered[0].fullName).toBe('repo1')
  })

  it('deduplicate 应该去除重复的 fullName', () => {
    const results = [
      {
        fullName: 'owner/repo1',
        url: 'https://github.com/owner/repo1',
        description: 'desc1',
        stars: 50,
        forks: 10,
        language: 'typescript',
        lastUpdated: '2024-01-01T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
      {
        fullName: 'owner/repo1',
        url: 'https://github.com/owner/repo1',
        description: 'desc1',
        stars: 50,
        forks: 10,
        language: 'typescript',
        lastUpdated: '2024-01-01T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
      {
        fullName: 'owner/repo2',
        url: 'https://github.com/owner/repo2',
        description: 'desc2',
        stars: 100,
        forks: 15,
        language: 'typescript',
        lastUpdated: '2024-01-02T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
    ]

    const deduped = GitHubSearch.deduplicate(results)

    expect(deduped.length).toBe(2)
    expect(deduped.map((r) => r.fullName)).toEqual(['owner/repo1', 'owner/repo2'])
  })

  it('setCache 后 getCached 应该返回结果', () => {
    const results = [
      {
        fullName: 'owner/repo1',
        url: 'https://github.com/owner/repo1',
        description: 'desc1',
        stars: 50,
        forks: 10,
        language: 'typescript',
        lastUpdated: '2024-01-01T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
    ]

    GitHubSearch.setCache('test-query', results)
    const cached = GitHubSearch.getCached('test-query')

    expect(cached).toBeDefined()
    expect(cached?.length).toBe(1)
    expect(cached?.[0].fullName).toBe('owner/repo1')
  })

  it('clearCache 后 getCached 应该返回 undefined', () => {
    const results = [
      {
        fullName: 'owner/repo1',
        url: 'https://github.com/owner/repo1',
        description: 'desc1',
        stars: 50,
        forks: 10,
        language: 'typescript',
        lastUpdated: '2024-01-01T00:00:00Z',
        topics: [],
        license: 'MIT',
      },
    ]

    GitHubSearch.setCache('test-query', results)
    expect(GitHubSearch.getCached('test-query')).toBeDefined()

    GitHubSearch.clearCache()
    expect(GitHubSearch.getCached('test-query')).toBeUndefined()
  })
})
