// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace Research {
  export const Request = z.object({
    topic: z.string(),
    systemType: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    maxRepos: z.number().default(5),
  })

  export type Request = z.infer<typeof Request>

  export const RepoReport = z.object({
    name: z.string(),
    url: z.string(),
    stars: z.number(),
    language: z.string(),
    lastUpdated: z.string(),
    description: z.string(),
    techStack: z.array(z.string()),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    takeaways: z.array(z.string()),
  })

  export type RepoReport = z.infer<typeof RepoReport>

  export const Summary = z.object({
    topic: z.string(),
    repos: z.array(RepoReport),
    recommendation: z.string(),
    generatedAt: z.number(),
  })

  export type Summary = z.infer<typeof Summary>

  export function parseRequest(input: string): Request {
    const words = input.trim().split(/\s+/)
    const firstWord = words[0] || ''
    const keywords = words.filter((w) => w.length > 2)

    return Request.parse({
      topic: input,
      keywords,
      maxRepos: 5,
    })
  }

  export function generateQueries(request: Request): string[] {
    const queries: string[] = [request.topic]

    if (request.keywords.length > 0) {
      queries.push(`${request.topic} github`)
    }

    queries.push(`${request.topic} repository`)

    return queries
  }

  export function getRefPath(topic: string): string {
    return `ref/${topic}/`
  }

  export function formatRepoReport(report: RepoReport): string {
    const lines: string[] = [
      `## ${report.name}`,
      '',
      `**URL:** [${report.url}](${report.url})`,
      `**Stars:** ${report.stars}`,
      `**Language:** ${report.language}`,
      `**Last Updated:** ${report.lastUpdated}`,
      '',
      `**Description:** ${report.description}`,
      '',
      `**Tech Stack:** ${report.techStack.join(', ')}`,
      '',
      '**Pros:**',
      ...report.pros.map((p) => `- ${p}`),
      '',
      '**Cons:**',
      ...report.cons.map((c) => `- ${c}`),
      '',
      '**Takeaways:**',
      ...report.takeaways.map((t) => `- ${t}`),
    ]

    return lines.join('\n')
  }

  export function formatSummary(summary: Summary): string {
    const lines: string[] = [
      `# ${summary.topic}`,
      '',
      `**Generated:** ${new Date(summary.generatedAt).toISOString()}`,
      '',
      '## Recommendation',
      summary.recommendation,
      '',
      '## Repositories',
      '',
    ]

    for (const repo of summary.repos) {
      lines.push(formatRepoReport(repo))
      lines.push('')
    }

    return lines.join('\n')
  }

  // ========== Deep Research 引擎 ==========

  /**
   * 参考项目信息
   */
  export interface RefProject {
    name: string
    url: string
    localPath: string
    clonedAt?: number
  }

  /**
   * 文件分析结果
   */
  export interface FileAnalysis {
    path: string
    purpose: string // 文件用途描述
    exports: string[] // 导出的模块/函数
  }

  /**
   * 模块功能映射
   */
  export interface ModuleMapping {
    feature: string // 功能名称
    sourceFiles: string[] // 参考项目中对应的文件路径
    description: string // 功能描述
  }

  /**
   * 参考文档
   */
  export interface RefDocument {
    project: string
    modules: ModuleMapping[]
    structure: string // 目录结构树
    generatedAt: number
  }

  /**
   * 初始化 ref 目录结构
   * @param projectRoot 项目根目录
   */
  export async function initRefDir(projectRoot: string): Promise<void> {
    const { mkdir } = await import('node:fs/promises')
    const { join } = await import('node:path')

    const refDir = join(projectRoot, 'ref')
    const reposDir = join(refDir, 'repos')

    await mkdir(refDir, { recursive: true })
    await mkdir(reposDir, { recursive: true })
  }

  /**
   * 克隆参考项目到 ref/repos/
   * @param projectRoot 项目根目录
   * @param url Git 仓库 URL
   * @param name 自定义项目名称（可选，默认从 URL 提取）
   */
  export async function cloneProject(
    projectRoot: string,
    url: string,
    name?: string,
  ): Promise<RefProject> {
    const { join } = await import('node:path')
    const { stat } = await import('node:fs/promises')

    // 从 URL 提取项目名
    const extractedName =
      name ||
      url
        .split('/')
        .pop()
        ?.replace(/\.git$/, '') ||
      'unknown'
    const localPath = join(projectRoot, 'ref', 'repos', extractedName)

    // 检查是否已存在
    try {
      await stat(localPath)
      // 已存在，直接返回
      return {
        name: extractedName,
        url,
        localPath,
        clonedAt: Date.now(),
      }
    } catch {
      // 不存在，继续克隆
    }

    // 确保 ref/repos 目录存在
    await initRefDir(projectRoot)

    // 执行 git clone
    const proc = Bun.spawn(['git', 'clone', url, localPath], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      throw new Error(`Git clone failed: ${stderr}`)
    }

    return {
      name: extractedName,
      url,
      localPath,
      clonedAt: Date.now(),
    }
  }

  /**
   * 分析项目目录结构
   * @param projectPath 项目路径
   */
  export async function analyzeStructure(projectPath: string): Promise<string> {
    const { readdir, stat } = await import('node:fs/promises')
    const { join, relative } = await import('node:path')

    const lines: string[] = []
    const visited = new Set<string>()

    const walk = async (dir: string, prefix = ''): Promise<void> => {
      const entries = await readdir(dir)
      const filtered = entries.filter(
        (name) =>
          !name.startsWith('.') && name !== 'node_modules' && name !== 'dist' && name !== 'build',
      )

      for (let i = 0; i < filtered.length; i++) {
        const name = filtered[i]
        if (!name) continue
        const fullPath = join(dir, name)

        if (visited.has(fullPath)) continue
        visited.add(fullPath)

        const isLast = i === filtered.length - 1
        const connector = isLast ? '└── ' : '├── '
        const stats = await stat(fullPath)

        lines.push(`${prefix}${connector}${name}`)

        if (stats.isDirectory()) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ')
          await walk(fullPath, newPrefix)
        }
      }
    }

    await walk(projectPath)
    return lines.join('\n')
  }

  /**
   * 分析文件导出内容
   * @param projectPath 项目路径
   * @param patterns 文件匹配模式（可选）
   */
  export async function analyzeFiles(
    projectPath: string,
    patterns: string[] = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  ): Promise<FileAnalysis[]> {
    const { readdir, stat, readFile } = await import('node:fs/promises')
    const { join, relative } = await import('node:path')

    const results: FileAnalysis[] = []
    const visited = new Set<string>()

    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir)

      for (const name of entries) {
        if (name.startsWith('.') || name === 'node_modules' || name === 'dist') {
          continue
        }

        const fullPath = join(dir, name)
        if (visited.has(fullPath)) continue
        visited.add(fullPath)

        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          await walk(fullPath)
        } else if (stats.isFile()) {
          const ext = name.split('.').pop()
          if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
            const content = await readFile(fullPath, 'utf-8')
            const exports = extractExports(content)
            const relativePath = relative(projectPath, fullPath)

            results.push({
              path: relativePath,
              purpose: inferPurpose(relativePath),
              exports,
            })
          }
        }
      }
    }

    await walk(projectPath)
    return results
  }

  /**
   * 从代码中提取 export 语句
   */
  function extractExports(code: string): string[] {
    const exports: string[] = []
    const lines = code.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // export function/class/const/interface/type
      const match = trimmed.match(
        /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      )
      if (match?.[1]) {
        exports.push(match[1])
      }

      // export { ... }
      const namedMatch = trimmed.match(/^export\s+{([^}]+)}/)
      if (namedMatch?.[1]) {
        const names = namedMatch[1]
          .split(',')
          .map((n) => n.trim().split(/\s+as\s+/)[0])
          .filter((n): n is string => n !== undefined)
        exports.push(...names)
      }
    }

    return Array.from(new Set(exports))
  }

  /**
   * 根据文件路径推断用途
   */
  function inferPurpose(path: string): string {
    const lower = path.toLowerCase()

    if (lower.includes('test') || lower.includes('spec')) return '测试'
    if (lower.includes('type') || lower.endsWith('.d.ts')) return '类型定义'
    if (lower.includes('util') || lower.includes('helper')) return '工具函数'
    if (lower.includes('config')) return '配置'
    if (lower.includes('component')) return '组件'
    if (lower.includes('api') || lower.includes('service')) return 'API 服务'
    if (lower.includes('route')) return '路由'
    if (lower.includes('store') || lower.includes('state')) return '状态管理'
    if (lower.includes('hook')) return 'Hooks'

    return '业务逻辑'
  }

  /**
   * 生成功能映射
   * @param projectPath 项目路径
   * @param features 需要映射的功能列表
   */
  export async function generateModuleMapping(
    projectPath: string,
    features: string[],
  ): Promise<ModuleMapping[]> {
    const files = await analyzeFiles(projectPath)
    const mappings: ModuleMapping[] = []

    for (const feature of features) {
      const featureLower = feature.toLowerCase()
      const relatedFiles = files.filter((f) => {
        const pathLower = f.path.toLowerCase()
        return (
          pathLower.includes(featureLower) ||
          f.exports.some((e) => e.toLowerCase().includes(featureLower))
        )
      })

      mappings.push({
        feature,
        sourceFiles: relatedFiles.map((f) => f.path),
        description:
          relatedFiles.length > 0 ? `找到 ${relatedFiles.length} 个相关文件` : '未找到相关文件',
      })
    }

    return mappings
  }

  /**
   * 生成完整参考文档
   * @param projectRoot 项目根目录
   * @param project 参考项目信息
   * @param features 需要分析的功能列表
   */
  export async function generateRefDocument(
    projectRoot: string,
    project: RefProject,
    features: string[],
  ): Promise<RefDocument> {
    const structure = await analyzeStructure(project.localPath)
    const modules = await generateModuleMapping(project.localPath, features)

    return {
      project: project.name,
      modules,
      structure,
      generatedAt: Date.now(),
    }
  }

  /**
   * 保存参考文档到 ref/<project>/
   * @param projectRoot 项目根目录
   * @param doc 参考文档
   * @returns 保存的文件路径
   */
  export async function saveRefDocument(projectRoot: string, doc: RefDocument): Promise<string> {
    const { mkdir, writeFile } = await import('node:fs/promises')
    const { join } = await import('node:path')

    const docDir = join(projectRoot, 'ref', doc.project)
    await mkdir(docDir, { recursive: true })

    // 保存 summary.md
    const summaryPath = join(docDir, 'summary.md')
    const summaryContent = [
      `# ${doc.project}`,
      '',
      `**生成时间:** ${new Date(doc.generatedAt).toISOString()}`,
      '',
      '## 功能模块',
      '',
      ...doc.modules.map(
        (m) =>
          `### ${m.feature}\n\n${m.description}\n\n**相关文件:**\n${m.sourceFiles.map((f) => `- ${f}`).join('\n')}`,
      ),
    ].join('\n')
    await writeFile(summaryPath, summaryContent, 'utf-8')

    // 保存 structure.md
    const structurePath = join(docDir, 'structure.md')
    const structureContent = [`# ${doc.project} - 目录结构`, '', '```', doc.structure, '```'].join(
      '\n',
    )
    await writeFile(structurePath, structureContent, 'utf-8')

    // 保存 modules.md
    const modulesPath = join(docDir, 'modules.md')
    const modulesContent = [
      `# ${doc.project} - 功能模块映射`,
      '',
      ...doc.modules.map(
        (m) =>
          `## ${m.feature}\n\n**描述:** ${m.description}\n\n**源文件:**\n${m.sourceFiles.map((f) => `- ${f}`).join('\n')}`,
      ),
    ].join('\n\n')
    await writeFile(modulesPath, modulesContent, 'utf-8')

    return summaryPath
  }

  /**
   * 列出所有参考项目
   * @param projectRoot 项目根目录
   */
  export async function listRefProjects(projectRoot: string): Promise<RefProject[]> {
    const { readdir, stat } = await import('node:fs/promises')
    const { join } = await import('node:path')

    const reposDir = join(projectRoot, 'ref', 'repos')
    const projects: RefProject[] = []

    try {
      const entries = await readdir(reposDir)

      for (const name of entries) {
        const localPath = join(reposDir, name)
        const stats = await stat(localPath)

        if (stats.isDirectory()) {
          projects.push({
            name,
            url: '', // 可以从 .git/config 读取
            localPath,
          })
        }
      }
    } catch {
      // ref/repos 目录不存在
    }

    return projects
  }

  /**
   * 获取指定项目的参考文档
   * @param projectRoot 项目根目录
   * @param projectName 项目名称
   */
  export async function getRefDocument(
    projectRoot: string,
    projectName: string,
  ): Promise<RefDocument | undefined> {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')

    try {
      const summaryPath = join(projectRoot, 'ref', projectName, 'summary.md')
      const structurePath = join(projectRoot, 'ref', projectName, 'structure.md')

      const summary = await readFile(summaryPath, 'utf-8')
      const structure = await readFile(structurePath, 'utf-8')

      // 简单解析 markdown（生产环境应使用专门的 markdown parser）
      const modules: ModuleMapping[] = []

      return {
        project: projectName,
        modules,
        structure,
        generatedAt: Date.now(),
      }
    } catch {
      return undefined
    }
  }

  /**
   * 搜索参考文档中的关键词
   * @param projectRoot 项目根目录
   * @param keyword 关键词
   */
  export async function searchRef(projectRoot: string, keyword: string): Promise<ModuleMapping[]> {
    const projects = await listRefProjects(projectRoot)
    const results: ModuleMapping[] = []

    for (const project of projects) {
      const doc = await getRefDocument(projectRoot, project.name)
      if (doc) {
        const matched = doc.modules.filter(
          (m) =>
            m.feature.toLowerCase().includes(keyword.toLowerCase()) ||
            m.description.toLowerCase().includes(keyword.toLowerCase()),
        )
        results.push(...matched)
      }
    }

    return results
  }
}
