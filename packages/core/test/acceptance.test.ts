import { beforeEach, describe, expect, it } from 'bun:test'
import { Acceptance } from '../src/acceptance'

describe('Acceptance', () => {
  describe('parseAcceptanceCriteria', () => {
    it('从 markdown 提取验收场景 — 返回 TestCase 数组', () => {
      const markdown = `
## 验收场景

### 场景 1: 创建会话
- **当** 调用 create
- **那么** 返回会话对象

### 场景 2: 删除会话
- **当** 调用 remove
- **那么** get 返回 undefined
`
      const cases = Acceptance.parseAcceptanceCriteria(markdown)

      expect(cases).toHaveLength(2)
      expect(cases[0]?.name).toBe('场景 1: 创建会话')
      expect(cases[0]?.type).toBe('unit')
      expect(cases[0]?.status).toBe('pending')
      expect(cases[1]?.name).toBe('场景 2: 删除会话')
    })

    it('没有验收场景时返回空数组', () => {
      const markdown = '# 标题\n\n没有验收场景'
      const cases = Acceptance.parseAcceptanceCriteria(markdown)

      expect(cases).toHaveLength(0)
    })
  })

  describe('aggregateResults', () => {
    it('聚合测试用例为 TestResult — 统计通过/失败/跳过', () => {
      const cases: Acceptance.TestCase[] = [
        {
          name: '测试 1',
          type: 'unit',
          status: 'passed',
          duration: 100,
        },
        {
          name: '测试 2',
          type: 'unit',
          status: 'passed',
          duration: 150,
        },
        {
          name: '测试 3',
          type: 'unit',
          status: 'failed',
          error: '断言失败',
          duration: 50,
        },
        {
          name: '测试 4',
          type: 'unit',
          status: 'skipped',
        },
      ]

      const result = Acceptance.aggregateResults(cases)

      expect(result.total).toBe(4)
      expect(result.passed).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.duration).toBe(300)
      expect(result.cases).toEqual(cases)
    })
  })

  describe('createReport', () => {
    it('生成验收报告 — 包含 specId 和各类型测试结果', () => {
      const unitCases: Acceptance.TestCase[] = [
        { name: '单元测试 1', type: 'unit', status: 'passed', duration: 100 },
      ]
      const integrationCases: Acceptance.TestCase[] = [
        { name: '集成测试 1', type: 'integration', status: 'passed', duration: 200 },
      ]

      const report = Acceptance.createReport('SPEC-F06', {
        unit: unitCases,
        integration: integrationCases,
      })

      expect(report.specId).toBe('SPEC-F06')
      expect(report.unitTests).toBeDefined()
      expect(report.unitTests?.total).toBe(1)
      expect(report.integrationTests).toBeDefined()
      expect(report.integrationTests?.total).toBe(1)
      expect(report.e2eTests).toBeUndefined()
      expect(report.generatedAt).toBeDefined()
      expect(typeof report.generatedAt).toBe('number')
    })
  })

  describe('determineOverall', () => {
    it('全部通过 — overall 为 passed', () => {
      const report: Acceptance.AcceptanceReport = {
        specId: 'SPEC-F06',
        unitTests: {
          total: 2,
          passed: 2,
          failed: 0,
          skipped: 0,
          duration: 100,
          cases: [],
        },
        overall: 'passed',
        generatedAt: Date.now(),
      }

      const overall = Acceptance.determineOverall(report)
      expect(overall).toBe('passed')
    })

    it('部分通过 — overall 为 partial', () => {
      const report: Acceptance.AcceptanceReport = {
        specId: 'SPEC-F06',
        unitTests: {
          total: 3,
          passed: 2,
          failed: 1,
          skipped: 0,
          duration: 100,
          cases: [],
        },
        overall: 'partial',
        generatedAt: Date.now(),
      }

      const overall = Acceptance.determineOverall(report)
      expect(overall).toBe('partial')
    })

    it('全部失败 — overall 为 failed', () => {
      const report: Acceptance.AcceptanceReport = {
        specId: 'SPEC-F06',
        unitTests: {
          total: 2,
          passed: 0,
          failed: 2,
          skipped: 0,
          duration: 100,
          cases: [],
        },
        overall: 'failed',
        generatedAt: Date.now(),
      }

      const overall = Acceptance.determineOverall(report)
      expect(overall).toBe('failed')
    })
  })

  describe('formatReport', () => {
    it('格式化报告为 markdown — 包含统计信息', () => {
      const report: Acceptance.AcceptanceReport = {
        specId: 'SPEC-F06',
        unitTests: {
          total: 3,
          passed: 2,
          failed: 1,
          skipped: 0,
          duration: 250,
          cases: [
            { name: '测试 1', type: 'unit', status: 'passed', duration: 100 },
            { name: '测试 2', type: 'unit', status: 'passed', duration: 100 },
            { name: '测试 3', type: 'unit', status: 'failed', error: '断言失败', duration: 50 },
          ],
        },
        overall: 'partial',
        generatedAt: 1707000000000,
      }

      const markdown = Acceptance.formatReport(report)

      expect(markdown).toContain('SPEC-F06')
      expect(markdown).toContain('partial')
      expect(markdown).toContain('3')
      expect(markdown).toContain('2')
      expect(markdown).toContain('1')
      expect(markdown).toContain('250')
    })
  })
})
