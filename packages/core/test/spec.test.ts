import { describe, expect, it } from 'bun:test'
import { SpecEngine } from '../src/spec'

describe('SpecEngine', () => {
  describe('parseFrontmatter', () => {
    it('正确提取所有字段', () => {
      const content = `---
id: spec-001
title: 实现登录功能
milestone: v1.0
priority: P0
status: in_progress
dependsOn: [spec-auth-001, spec-db-001]
created: 2025-02-09T10:00:00Z
updated: 2025-02-09T11:00:00Z
---

# 实现登录功能

这是 spec 内容。`

      const result = SpecEngine.parseFrontmatter(content)

      expect(result.id).toBe('spec-001')
      expect(result.title).toBe('实现登录功能')
      expect(result.milestone).toBe('v1.0')
      expect(result.priority).toBe('P0')
      expect(result.status).toBe('in_progress')
      expect(result.dependsOn).toEqual(['spec-auth-001', 'spec-db-001'])
      expect(result.created).toBe('2025-02-09T10:00:00Z')
      expect(result.updated).toBe('2025-02-09T11:00:00Z')
    })
  })

  describe('createSpec', () => {
    it('返回包含 frontmatter 的 markdown', () => {
      const result = SpecEngine.createSpec({
        id: 'spec-002',
        title: '数据库设计',
        milestone: 'v1.0',
        priority: 'P1',
        dependsOn: ['spec-001'],
      })

      expect(result).toContain('---')
      expect(result).toContain('id: spec-002')
      expect(result).toContain('title: 数据库设计')
      expect(result).toContain('milestone: v1.0')
      expect(result).toContain('priority: P1')
      expect(result).toContain('status: pending')
      expect(result).toContain('dependsOn: [spec-001]')
      expect(result).toContain('created:')
      expect(result).toContain('updated:')
    })
  })

  describe('updateStatus', () => {
    it('替换 status 字段', () => {
      const content = `---
id: spec-001
title: 实现登录功能
milestone: v1.0
priority: P0
status: pending
dependsOn: []
created: 2025-02-09T10:00:00Z
updated: 2025-02-09T11:00:00Z
---

# 实现登录功能`

      const result = SpecEngine.updateStatus(content, 'completed')

      expect(result).toContain('status: completed')
      expect(result).not.toContain('status: pending')
      expect(result).toContain('id: spec-001')
      expect(result).toContain('title: 实现登录功能')
    })
  })

  describe('generateProgress', () => {
    it('统计进度报告', () => {
      const specs: SpecEngine.Info[] = [
        {
          frontmatter: {
            id: 'spec-001',
            title: 'Spec 1',
            milestone: 'v1.0',
            priority: 'P0',
            status: 'completed',
            dependsOn: [],
            created: '2025-02-09T10:00:00Z',
            updated: '2025-02-09T11:00:00Z',
          },
          filePath: '/specs/spec-001.md',
          content: '# Spec 1',
        },
        {
          frontmatter: {
            id: 'spec-002',
            title: 'Spec 2',
            milestone: 'v1.0',
            priority: 'P1',
            status: 'in_progress',
            dependsOn: [],
            created: '2025-02-09T10:00:00Z',
            updated: '2025-02-09T11:00:00Z',
          },
          filePath: '/specs/spec-002.md',
          content: '# Spec 2',
        },
        {
          frontmatter: {
            id: 'spec-003',
            title: 'Spec 3',
            milestone: 'v2.0',
            priority: 'P2',
            status: 'pending',
            dependsOn: [],
            created: '2025-02-09T10:00:00Z',
            updated: '2025-02-09T11:00:00Z',
          },
          filePath: '/specs/spec-003.md',
          content: '# Spec 3',
        },
        {
          frontmatter: {
            id: 'spec-004',
            title: 'Spec 4',
            milestone: 'v1.0',
            priority: 'P0',
            status: 'blocked',
            dependsOn: [],
            created: '2025-02-09T10:00:00Z',
            updated: '2025-02-09T11:00:00Z',
          },
          filePath: '/specs/spec-004.md',
          content: '# Spec 4',
        },
      ]

      const report = SpecEngine.generateProgress(specs)

      expect(report.total).toBe(4)
      expect(report.completed).toBe(1)
      expect(report.inProgress).toBe(1)
      expect(report.blocked).toBe(1)
      expect(report.byMilestone['v1.0'].total).toBe(3)
      expect(report.byMilestone['v1.0'].completed).toBe(1)
      expect(report.byMilestone['v2.0'].total).toBe(1)
      expect(report.byMilestone['v2.0'].completed).toBe(0)
    })

    it('空列表返回全部为 0', () => {
      const report = SpecEngine.generateProgress([])

      expect(report.total).toBe(0)
      expect(report.completed).toBe(0)
      expect(report.inProgress).toBe(0)
      expect(report.blocked).toBe(0)
      expect(Object.keys(report.byMilestone).length).toBe(0)
    })
  })

  describe('findBlocked', () => {
    it('找到依赖未完成的 spec', () => {
      const specs: SpecEngine.Info[] = [
        {
          frontmatter: {
            id: 'spec-001',
            title: 'Spec 1',
            milestone: 'v1.0',
            priority: 'P0',
            status: 'completed',
            dependsOn: [],
            created: '2025-02-09T10:00:00Z',
            updated: '2025-02-09T11:00:00Z',
          },
          filePath: '/specs/spec-001.md',
          content: '# Spec 1',
        },
        {
          frontmatter: {
            id: 'spec-002',
            title: 'Spec 2',
            milestone: 'v1.0',
            priority: 'P1',
            status: 'pending',
            dependsOn: ['spec-001'],
            created: '2025-02-09T10:00:00Z',
            updated: '2025-02-09T11:00:00Z',
          },
          filePath: '/specs/spec-002.md',
          content: '# Spec 2',
        },
        {
          frontmatter: {
            id: 'spec-003',
            title: 'Spec 3',
            milestone: 'v1.0',
            priority: 'P2',
            status: 'pending',
            dependsOn: ['spec-002'],
            created: '2025-02-09T10:00:00Z',
            updated: '2025-02-09T11:00:00Z',
          },
          filePath: '/specs/spec-003.md',
          content: '# Spec 3',
        },
      ]

      const blocked = SpecEngine.findBlocked(specs)

      expect(blocked.length).toBe(1)
      expect(blocked[0].frontmatter.id).toBe('spec-003')
    })
  })

  describe('Schema validation', () => {
    it('无效 priority 抛错', () => {
      const content = `---
id: spec-001
title: 实现登录功能
milestone: v1.0
priority: P99
status: pending
dependsOn: []
created: 2025-02-09T10:00:00Z
updated: 2025-02-09T11:00:00Z
---

# 实现登录功能`

      expect(() => {
        SpecEngine.parseFrontmatter(content)
      }).toThrow()
    })
  })
})
