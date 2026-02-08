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
}
