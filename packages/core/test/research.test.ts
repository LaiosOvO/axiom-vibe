import { describe, expect, it } from 'bun:test'
import { Research } from '../src/research'

describe('Research', () => {
  it('parseRequest — 从自然语言提取 topic 和 keywords', () => {
    const result = Research.parseRequest('搜索 TUI 框架')

    expect(result).toBeDefined()
    expect(result.topic).toBe('搜索 TUI 框架')
    expect(result.keywords).toContain('TUI')
    expect(result.systemType).toBeUndefined()
    expect(result.maxRepos).toBe(5)
  })

  it('generateQueries — 返回多个搜索查询变体', () => {
    const request = Research.Request.parse({
      topic: 'TUI framework',
      keywords: ['TUI', 'terminal'],
    })

    const queries = Research.generateQueries(request)

    expect(queries).toBeDefined()
    expect(Array.isArray(queries)).toBe(true)
    expect(queries.length).toBeGreaterThan(0)
    expect(queries[0]).toBe('TUI framework')
  })

  it('getRefPath — 返回正确的 ref 目录路径', () => {
    const path = Research.getRefPath('tui-framework')

    expect(path).toBe('ref/tui-framework/')
  })

  it('formatRepoReport — 返回 markdown 格式的仓库报告', () => {
    const report = Research.RepoReport.parse({
      name: 'blessed',
      url: 'https://github.com/chjj/blessed',
      stars: 10000,
      language: 'JavaScript',
      lastUpdated: '2024-01-15',
      description: 'A high-level terminal interface library',
      techStack: ['Node.js', 'JavaScript'],
      pros: ['Easy to use', 'Well documented'],
      cons: ['Limited features'],
      takeaways: ['Great for TUI development'],
    })

    const markdown = Research.formatRepoReport(report)

    expect(markdown).toBeDefined()
    expect(typeof markdown).toBe('string')
    expect(markdown).toContain('blessed')
    expect(markdown).toContain('https://github.com/chjj/blessed')
    expect(markdown).toContain('10000')
  })

  it('formatSummary — 返回 markdown 格式的总结，包含所有 repo 信息', () => {
    const summary = Research.Summary.parse({
      topic: 'TUI Framework',
      repos: [
        {
          name: 'blessed',
          url: 'https://github.com/chjj/blessed',
          stars: 10000,
          language: 'JavaScript',
          lastUpdated: '2024-01-15',
          description: 'A high-level terminal interface library',
          techStack: ['Node.js', 'JavaScript'],
          pros: ['Easy to use'],
          cons: ['Limited features'],
          takeaways: ['Great for TUI'],
        },
      ],
      recommendation: 'Use blessed for simple TUI apps',
      generatedAt: 1707000000000,
    })

    const markdown = Research.formatSummary(summary)

    expect(markdown).toBeDefined()
    expect(typeof markdown).toBe('string')
    expect(markdown).toContain('TUI Framework')
    expect(markdown).toContain('blessed')
    expect(markdown).toContain('Use blessed for simple TUI apps')
  })

  it('Schema 验证 — RepoReport 和 Summary 验证通过', () => {
    const validReport = {
      name: 'blessed',
      url: 'https://github.com/chjj/blessed',
      stars: 10000,
      language: 'JavaScript',
      lastUpdated: '2024-01-15',
      description: 'A high-level terminal interface library',
      techStack: ['Node.js', 'JavaScript'],
      pros: ['Easy to use'],
      cons: ['Limited features'],
      takeaways: ['Great for TUI'],
    }

    const report = Research.RepoReport.parse(validReport)
    expect(report).toBeDefined()
    expect(report.name).toBe('blessed')

    const validSummary = {
      topic: 'TUI Framework',
      repos: [validReport],
      recommendation: 'Use blessed',
      generatedAt: 1707000000000,
    }

    const summary = Research.Summary.parse(validSummary)
    expect(summary).toBeDefined()
    expect(summary.topic).toBe('TUI Framework')
    expect(summary.repos.length).toBe(1)
  })
})
