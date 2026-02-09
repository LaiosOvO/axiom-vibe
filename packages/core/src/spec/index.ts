import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace SpecEngine {
  export const Frontmatter = z.object({
    id: z.string(),
    title: z.string(),
    milestone: z.string(),
    priority: z.enum(['P0', 'P1', 'P2']),
    status: z.enum(['pending', 'in_progress', 'testing', 'completed', 'blocked']),
    dependsOn: z.array(z.string()).default([]),
    created: z.string(),
    updated: z.string(),
  })

  export type Frontmatter = z.infer<typeof Frontmatter>

  export const Info = z.object({
    frontmatter: Frontmatter,
    filePath: z.string(),
    content: z.string(),
  })

  export type Info = z.infer<typeof Info>

  export const ProgressReport = z.object({
    total: z.number(),
    completed: z.number(),
    inProgress: z.number(),
    blocked: z.number(),
    byMilestone: z.record(
      z.string(),
      z.object({
        total: z.number(),
        completed: z.number(),
      }),
    ),
  })

  export type ProgressReport = z.infer<typeof ProgressReport>

  /**
   * OpenSpec 四阶段类型
   */
  export type Phase = 'proposal' | 'definition' | 'apply' | 'archive'

  /**
   * 任务项类型
   */
  export interface TaskItem {
    id: string
    description: string
    status: 'pending' | 'in_progress' | 'done'
  }

  /**
   * 变更类型
   */
  export interface Change {
    name: string
    phase: Phase
    proposal?: string
    design?: string
    tasks?: TaskItem[]
    specs?: string[]
  }

  /**
   * 解析 markdown frontmatter（--- yaml ---）
   */
  export function parseFrontmatter(content: string): Frontmatter {
    const lines = content.split('\n')

    // 找到第一个和第二个 ---
    let startIdx = -1
    let endIdx = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line && line.trim() === '---') {
        if (startIdx === -1) {
          startIdx = i
        } else {
          endIdx = i
          break
        }
      }
    }

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Invalid frontmatter: missing --- delimiters')
    }

    // 提取 frontmatter 内容
    const frontmatterLines = lines.slice(startIdx + 1, endIdx as number)
    const frontmatterObj: Record<string, unknown> = {}

    for (const line of frontmatterLines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1) continue

      const key = trimmed.substring(0, colonIdx).trim()
      const valueStr = trimmed.substring(colonIdx + 1).trim()

      // 解析值
      let value: unknown

      if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        // 数组
        const arrayContent = valueStr.slice(1, -1)
        if (arrayContent.trim() === '') {
          value = []
        } else {
          value = arrayContent.split(',').map((item) => item.trim())
        }
      } else {
        // 字符串
        value = valueStr
      }

      frontmatterObj[key] = value
    }

    // 验证并返回
    return Frontmatter.parse(frontmatterObj)
  }

  /**
   * 创建 spec（返回完整 markdown 内容）
   */
  export function createSpec(opts: {
    id: string
    title: string
    milestone: string
    priority: 'P0' | 'P1' | 'P2'
    dependsOn?: string[]
  }): string {
    const now = new Date().toISOString()
    const dependsOn = opts.dependsOn ?? []

    const dependsOnStr = dependsOn.length === 0 ? '[]' : `[${dependsOn.join(', ')}]`

    const frontmatter = `---
id: ${opts.id}
title: ${opts.title}
milestone: ${opts.milestone}
priority: ${opts.priority}
status: pending
dependsOn: ${dependsOnStr}
created: ${now}
updated: ${now}
---

# ${opts.title}
`

    return frontmatter
  }

  /**
   * 更新 frontmatter 中的 status
   */
  export function updateStatus(content: string, newStatus: Frontmatter['status']): string {
    const lines = content.split('\n')

    // 找到第一个和第二个 ---
    let startIdx = -1
    let endIdx = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line && line.trim() === '---') {
        if (startIdx === -1) {
          startIdx = i
        } else {
          endIdx = i
          break
        }
      }
    }

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Invalid frontmatter: missing --- delimiters')
    }

    // 更新 status 行
    for (let i = startIdx + 1; i < (endIdx as number); i++) {
      const line = lines[i]
      if (line?.trim().startsWith('status:')) {
        lines[i] = `status: ${newStatus}`
        break
      }
    }

    return lines.join('\n')
  }

  /**
   * 从多个 spec 生成进度报告
   */
  export function generateProgress(specs: Info[]): ProgressReport {
    const report: ProgressReport = {
      total: specs.length,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      byMilestone: {},
    }

    for (const spec of specs) {
      const { status, milestone } = spec.frontmatter

      // 统计总体状态
      if (status === 'completed') {
        report.completed++
      } else if (status === 'in_progress') {
        report.inProgress++
      } else if (status === 'blocked') {
        report.blocked++
      }

      // 统计按 milestone
      if (!report.byMilestone[milestone]) {
        report.byMilestone[milestone] = {
          total: 0,
          completed: 0,
        }
      }

      report.byMilestone[milestone].total++
      if (status === 'completed') {
        report.byMilestone[milestone].completed++
      }
    }

    return report
  }

  /**
   * 查找被阻塞的 spec（依赖未完成）
   */
  export function findBlocked(specs: Info[]): Info[] {
    const completedIds = new Set(
      specs.filter((s) => s.frontmatter.status === 'completed').map((s) => s.frontmatter.id),
    )

    return specs.filter((spec) => {
      // 如果有任何依赖未完成，则被阻塞
      return spec.frontmatter.dependsOn.some((depId) => !completedIds.has(depId))
    })
  }

  /**
   * 初始化 openspec 目录结构
   */
  export async function init(projectRoot: string): Promise<void> {
    const openspecDir = join(projectRoot, 'openspec')
    const specsDir = join(openspecDir, 'specs')
    const changesDir = join(openspecDir, 'changes')

    await mkdir(openspecDir, { recursive: true })
    await mkdir(specsDir, { recursive: true })
    await mkdir(changesDir, { recursive: true })

    const projectMdPath = join(openspecDir, 'project.md')
    if (!existsSync(projectMdPath)) {
      await writeFile(projectMdPath, '# Project\n\nOpenSpec 项目配置文件\n', 'utf-8')
    }
  }

  /**
   * 创建新的变更提案
   */
  export async function createChange(
    projectRoot: string,
    name: string,
    description: string,
  ): Promise<Change> {
    const changesDir = join(projectRoot, 'openspec', 'changes')
    const changeDir = join(changesDir, name)
    const proposalPath = join(changeDir, 'proposal.md')

    await mkdir(changeDir, { recursive: true })

    const proposalContent = `# ${name}\n\n${description}\n`
    await writeFile(proposalPath, proposalContent, 'utf-8')

    return {
      name,
      phase: 'proposal',
      proposal: proposalContent,
    }
  }

  /**
   * 获取变更信息
   */
  export async function getChange(
    projectRoot: string,
    changeName: string,
  ): Promise<Change | undefined> {
    const changeDir = join(projectRoot, 'openspec', 'changes', changeName)

    if (!existsSync(changeDir)) {
      return undefined
    }

    const change: Change = {
      name: changeName,
      phase: 'proposal',
    }

    const proposalPath = join(changeDir, 'proposal.md')
    if (existsSync(proposalPath)) {
      change.proposal = await readFile(proposalPath, 'utf-8')
    }

    const designPath = join(changeDir, 'design.md')
    if (existsSync(designPath)) {
      change.design = await readFile(designPath, 'utf-8')
      change.phase = 'definition'
    }

    const tasksPath = join(changeDir, 'tasks.md')
    if (existsSync(tasksPath)) {
      const tasksContent = await readFile(tasksPath, 'utf-8')
      change.tasks = await parseTasks(tasksContent)
      change.phase = 'apply'
    }

    const specsDir = join(changeDir, 'specs')
    if (existsSync(specsDir)) {
      const files = await readdir(specsDir)
      change.specs = files.filter((f) => f.endsWith('.md'))
      if (change.specs.length > 0) {
        change.phase = 'archive'
      }
    }

    return change
  }

  /**
   * 列出所有变更
   */
  export async function listChanges(projectRoot: string): Promise<Change[]> {
    const changesDir = join(projectRoot, 'openspec', 'changes')

    if (!existsSync(changesDir)) {
      return []
    }

    const entries = await readdir(changesDir)
    const changes: Change[] = []

    for (const entry of entries) {
      const entryPath = join(changesDir, entry)
      const stats = await stat(entryPath)
      if (stats.isDirectory()) {
        const change = await getChange(projectRoot, entry)
        if (change) {
          changes.push(change)
        }
      }
    }

    return changes
  }

  /**
   * 推进变更到下一阶段
   */
  export async function advancePhase(projectRoot: string, changeName: string): Promise<Phase> {
    const change = await getChange(projectRoot, changeName)
    if (!change) {
      throw new Error(`Change ${changeName} not found`)
    }

    const changeDir = join(projectRoot, 'openspec', 'changes', changeName)

    switch (change.phase) {
      case 'proposal':
        await writeFile(join(changeDir, 'design.md'), '# Design\n\n', 'utf-8')
        return 'definition'
      case 'definition':
        await writeFile(join(changeDir, 'tasks.md'), '# Tasks\n\n', 'utf-8')
        return 'apply'
      case 'apply':
        await mkdir(join(changeDir, 'specs'), { recursive: true })
        return 'archive'
      case 'archive':
        return 'archive'
      default:
        throw new Error(`Unknown phase: ${change.phase}`)
    }
  }

  /**
   * 写入设计文档
   */
  export async function writeDesign(
    projectRoot: string,
    changeName: string,
    content: string,
  ): Promise<void> {
    const changeDir = join(projectRoot, 'openspec', 'changes', changeName)
    const designPath = join(changeDir, 'design.md')
    await writeFile(designPath, content, 'utf-8')
  }

  /**
   * 写入任务列表
   */
  export async function writeTasks(
    projectRoot: string,
    changeName: string,
    tasks: TaskItem[],
  ): Promise<void> {
    const changeDir = join(projectRoot, 'openspec', 'changes', changeName)
    const tasksPath = join(changeDir, 'tasks.md')

    let content = '# Tasks\n\n'
    for (const task of tasks) {
      const checkbox = task.status === 'done' ? '[x]' : '[ ]'
      content += `- ${checkbox} ${task.id} ${task.description}\n`
    }

    await writeFile(tasksPath, content, 'utf-8')
  }

  /**
   * 解析任务列表（支持 - [ ] id desc 和 - [x] id desc 格式）
   */
  export async function parseTasks(content: string): Promise<TaskItem[]> {
    const lines = content.split('\n')
    const tasks: TaskItem[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('-')) continue

      const checkboxMatch = trimmed.match(/^-\s*\[([x ])\]\s+(.+)$/)
      if (!checkboxMatch || !checkboxMatch[1] || !checkboxMatch[2]) continue

      const isDone = checkboxMatch[1] === 'x'
      const rest = checkboxMatch[2].trim()

      const parts = rest.split(/\s+/)
      if (parts.length < 2) continue

      const id = parts[0]
      if (!id) continue
      const description = parts.slice(1).join(' ')

      tasks.push({
        id,
        description,
        status: isDone ? 'done' : 'pending',
      })
    }

    return tasks
  }

  /**
   * 更新任务状态
   */
  export async function updateTaskStatus(
    projectRoot: string,
    changeName: string,
    taskId: string,
    status: TaskItem['status'],
  ): Promise<void> {
    const change = await getChange(projectRoot, changeName)
    if (!change || !change.tasks) {
      throw new Error(`Change ${changeName} or tasks not found`)
    }

    const task = change.tasks.find((t) => t.id === taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found in change ${changeName}`)
    }

    task.status = status
    await writeTasks(projectRoot, changeName, change.tasks)
  }

  /**
   * 归档变更
   */
  export async function archiveChange(projectRoot: string, changeName: string): Promise<void> {
    const changesDir = join(projectRoot, 'openspec', 'changes', changeName)
    const archiveDir = join(projectRoot, 'openspec', 'archive', changeName)

    await mkdir(dirname(archiveDir), { recursive: true })
    await rename(changesDir, archiveDir)
  }

  /**
   * 列出所有 spec 文件
   */
  export async function listSpecs(projectRoot: string): Promise<string[]> {
    const specsDir = join(projectRoot, 'openspec', 'specs')

    if (!existsSync(specsDir)) {
      return []
    }

    const entries = await readdir(specsDir)
    const specs: string[] = []

    for (const entry of entries) {
      const entryPath = join(specsDir, entry)
      const stats = await stat(entryPath)
      if (stats.isDirectory()) {
        const specPath = join(entryPath, 'spec.md')
        if (existsSync(specPath)) {
          specs.push(entry)
        }
      }
    }

    return specs
  }
}
