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
}
