import { z } from 'zod'

export namespace Acceptance {
  export const TestCase = z.object({
    name: z.string(),
    type: z.enum(['unit', 'integration', 'e2e']),
    file: z.string().optional(),
    status: z.enum(['pending', 'passed', 'failed', 'skipped']).default('pending'),
    error: z.string().optional(),
    duration: z.number().optional(),
  })

  export type TestCase = z.infer<typeof TestCase>

  export const TestResult = z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    duration: z.number(),
    cases: z.array(TestCase),
  })

  export type TestResult = z.infer<typeof TestResult>

  export const AcceptanceReport = z.object({
    specId: z.string(),
    unitTests: TestResult.optional(),
    integrationTests: TestResult.optional(),
    e2eTests: TestResult.optional(),
    overall: z.enum(['passed', 'partial', 'failed']),
    generatedAt: z.number(),
  })

  export type AcceptanceReport = z.infer<typeof AcceptanceReport>

  export function parseAcceptanceCriteria(content: string): TestCase[] {
    const cases: TestCase[] = []

    const scenarioRegex = /###\s+(.+)/g
    let match: RegExpExecArray | null = null
    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern
    while ((match = scenarioRegex.exec(content)) !== null) {
      const nameRaw = match[1]
      if (nameRaw) {
        const name = nameRaw.trim()
        cases.push({
          name,
          type: 'unit',
          status: 'pending',
        })
      }
    }

    return cases
  }

  export function aggregateResults(cases: TestCase[]): TestResult {
    const total = cases.length
    const passed = cases.filter((c) => c.status === 'passed').length
    const failed = cases.filter((c) => c.status === 'failed').length
    const skipped = cases.filter((c) => c.status === 'skipped').length
    const duration = cases.reduce((sum, c) => sum + (c.duration ?? 0), 0)

    return {
      total,
      passed,
      failed,
      skipped,
      duration,
      cases,
    }
  }

  export function createReport(
    specId: string,
    results: {
      unit?: TestCase[]
      integration?: TestCase[]
      e2e?: TestCase[]
    },
  ): AcceptanceReport {
    const unitTests = results.unit ? aggregateResults(results.unit) : undefined
    const integrationTests = results.integration ? aggregateResults(results.integration) : undefined
    const e2eTests = results.e2e ? aggregateResults(results.e2e) : undefined

    const allResults = [unitTests, integrationTests, e2eTests].filter(Boolean) as TestResult[]
    const totalCases = allResults.reduce((sum, r) => sum + r.total, 0)
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0)

    let overall: 'passed' | 'partial' | 'failed'
    if (totalFailed === 0 && totalCases > 0) {
      overall = 'passed'
    } else if (totalFailed === totalCases) {
      overall = 'failed'
    } else {
      overall = 'partial'
    }

    return {
      specId,
      unitTests,
      integrationTests,
      e2eTests,
      overall,
      generatedAt: Date.now(),
    }
  }

  export function determineOverall(report: AcceptanceReport): 'passed' | 'partial' | 'failed' {
    const allResults = [report.unitTests, report.integrationTests, report.e2eTests].filter(
      Boolean,
    ) as TestResult[]

    if (allResults.length === 0) {
      return 'failed'
    }

    const totalCases = allResults.reduce((sum, r) => sum + r.total, 0)
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0)

    if (totalFailed === 0 && totalCases > 0) {
      return 'passed'
    }
    if (totalFailed === totalCases) {
      return 'failed'
    }
    return 'partial'
  }

  export function formatReport(report: AcceptanceReport): string {
    const lines: string[] = []

    lines.push(`# 验收报告 - ${report.specId}`)
    lines.push('')
    lines.push(`**总体状态**: ${report.overall}`)
    lines.push(`**生成时间**: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`)
    lines.push('')

    if (report.unitTests) {
      lines.push('## 单元测试')
      lines.push(formatTestResult(report.unitTests))
      lines.push('')
    }

    if (report.integrationTests) {
      lines.push('## 集成测试')
      lines.push(formatTestResult(report.integrationTests))
      lines.push('')
    }

    if (report.e2eTests) {
      lines.push('## E2E 测试')
      lines.push(formatTestResult(report.e2eTests))
      lines.push('')
    }

    return lines.join('\n')
  }

  function formatTestResult(result: TestResult): string {
    const lines: string[] = []

    lines.push(`- **总计**: ${result.total}`)
    lines.push(`- **通过**: ${result.passed}`)
    lines.push(`- **失败**: ${result.failed}`)
    lines.push(`- **跳过**: ${result.skipped}`)
    lines.push(`- **耗时**: ${result.duration}ms`)

    if (result.cases.length > 0) {
      lines.push('')
      lines.push('### 测试用例')
      for (const testCase of result.cases) {
        const statusEmoji = {
          passed: '✅',
          failed: '❌',
          skipped: '⏭️',
          pending: '⏳',
        }[testCase.status]

        let caseStr = `- ${statusEmoji} ${testCase.name}`
        if (testCase.duration !== undefined) {
          caseStr += ` (${testCase.duration}ms)`
        }
        if (testCase.error) {
          caseStr += ` - ${testCase.error}`
        }
        lines.push(caseStr)
      }
    }

    return lines.join('\n')
  }
}
