import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

describe('Research Deep Engine', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `research-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {}
  })

  it('initRefDir — 创建 ref 和 ref/repos 目录', async () => {
    await Research.initRefDir(testDir)

    const { stat } = await import('node:fs/promises')
    const refStat = await stat(join(testDir, 'ref'))
    const reposStat = await stat(join(testDir, 'ref', 'repos'))

    expect(refStat.isDirectory()).toBe(true)
    expect(reposStat.isDirectory()).toBe(true)
  })

  it('analyzeStructure — 返回目录树结构', async () => {
    const projectDir = join(testDir, 'test-project')
    await mkdir(join(projectDir, 'src'), { recursive: true })
    await mkdir(join(projectDir, 'tests'), { recursive: true })
    await writeFile(join(projectDir, 'src', 'index.ts'), 'export const foo = 1')
    await writeFile(join(projectDir, 'tests', 'index.test.ts'), 'test()')

    const structure = await Research.analyzeStructure(projectDir)

    expect(structure).toBeDefined()
    expect(typeof structure).toBe('string')
    expect(structure).toContain('src')
    expect(structure).toContain('tests')
  })

  it('analyzeFiles — 提取文件导出信息', async () => {
    const projectDir = join(testDir, 'test-project')
    await mkdir(join(projectDir, 'src'), { recursive: true })
    await writeFile(
      join(projectDir, 'src', 'index.ts'),
      'export function hello() {}\nexport const world = "test"',
    )

    const files = await Research.analyzeFiles(projectDir)

    expect(files).toBeDefined()
    expect(Array.isArray(files)).toBe(true)
    expect(files.length).toBeGreaterThan(0)

    const indexFile = files.find((f) => f.path.includes('index.ts'))
    expect(indexFile).toBeDefined()
    expect(indexFile?.exports).toContain('hello')
    expect(indexFile?.exports).toContain('world')
  })

  it('generateModuleMapping — 生成功能映射', async () => {
    const projectDir = join(testDir, 'test-project')
    await mkdir(join(projectDir, 'src'), { recursive: true })
    await writeFile(join(projectDir, 'src', 'auth.ts'), 'export function login() {}')
    await writeFile(join(projectDir, 'src', 'user.ts'), 'export function getUser() {}')

    const mappings = await Research.generateModuleMapping(projectDir, ['auth', 'user'])

    expect(mappings).toBeDefined()
    expect(Array.isArray(mappings)).toBe(true)
    expect(mappings.length).toBe(2)

    const authMapping = mappings.find((m) => m.feature === 'auth')
    expect(authMapping).toBeDefined()
    expect(authMapping?.sourceFiles.length).toBeGreaterThan(0)
  })

  it('generateRefDocument — 生成完整参考文档', async () => {
    const projectDir = join(testDir, 'test-project')
    await mkdir(join(projectDir, 'src'), { recursive: true })
    await writeFile(join(projectDir, 'src', 'index.ts'), 'export const foo = 1')

    const project: Research.RefProject = {
      name: 'test-project',
      url: 'https://github.com/test/test',
      localPath: projectDir,
      clonedAt: Date.now(),
    }

    const doc = await Research.generateRefDocument(testDir, project, ['index'])

    expect(doc).toBeDefined()
    expect(doc.project).toBe('test-project')
    expect(doc.modules).toBeDefined()
    expect(doc.structure).toBeDefined()
    expect(doc.generatedAt).toBeGreaterThan(0)
  })

  it('saveRefDocument — 保存参考文档到文件', async () => {
    const doc: Research.RefDocument = {
      project: 'test-project',
      modules: [
        {
          feature: 'auth',
          sourceFiles: ['src/auth.ts'],
          description: '认证模块',
        },
      ],
      structure: 'src/\n└── auth.ts',
      generatedAt: Date.now(),
    }

    const savedPath = await Research.saveRefDocument(testDir, doc)

    expect(savedPath).toBeDefined()
    expect(savedPath).toContain('summary.md')

    const { stat } = await import('node:fs/promises')
    const summaryExists = await stat(join(testDir, 'ref', 'test-project', 'summary.md'))
    const structureExists = await stat(join(testDir, 'ref', 'test-project', 'structure.md'))
    const modulesExists = await stat(join(testDir, 'ref', 'test-project', 'modules.md'))

    expect(summaryExists.isFile()).toBe(true)
    expect(structureExists.isFile()).toBe(true)
    expect(modulesExists.isFile()).toBe(true)
  })

  it('listRefProjects — 列出所有参考项目', async () => {
    await mkdir(join(testDir, 'ref', 'repos', 'project1'), { recursive: true })
    await mkdir(join(testDir, 'ref', 'repos', 'project2'), { recursive: true })

    const projects = await Research.listRefProjects(testDir)

    expect(projects).toBeDefined()
    expect(Array.isArray(projects)).toBe(true)
    expect(projects.length).toBe(2)
    expect(projects.some((p) => p.name === 'project1')).toBe(true)
    expect(projects.some((p) => p.name === 'project2')).toBe(true)
  })

  it('getRefDocument — 获取指定项目的参考文档', async () => {
    const doc: Research.RefDocument = {
      project: 'test-project',
      modules: [],
      structure: 'src/',
      generatedAt: Date.now(),
    }

    await Research.saveRefDocument(testDir, doc)

    const retrieved = await Research.getRefDocument(testDir, 'test-project')

    expect(retrieved).toBeDefined()
    expect(retrieved?.project).toBe('test-project')
  })

  it('searchRef — 搜索参考文档中的关键词', async () => {
    await mkdir(join(testDir, 'ref', 'repos', 'project1'), { recursive: true })

    const doc: Research.RefDocument = {
      project: 'project1',
      modules: [
        {
          feature: 'authentication',
          sourceFiles: ['src/auth.ts'],
          description: '用户认证模块',
        },
      ],
      structure: 'src/',
      generatedAt: Date.now(),
    }

    await Research.saveRefDocument(testDir, doc)

    const results = await Research.searchRef(testDir, 'auth')

    expect(results).toBeDefined()
    expect(Array.isArray(results)).toBe(true)
  })
})
