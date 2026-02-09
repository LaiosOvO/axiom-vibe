import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
      expect(report.byMilestone['v1.0']!.total).toBe(3)
      expect(report.byMilestone['v1.0']!.completed).toBe(1)
      expect(report.byMilestone['v2.0']!.total).toBe(1)
      expect(report.byMilestone['v2.0']!.completed).toBe(0)
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
      expect(blocked[0]!.frontmatter.id).toBe('spec-003')
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

  describe('SpecEngine - File Operations', () => {
    let testDir: string

    beforeEach(async () => {
      testDir = await mkdtemp(join(tmpdir(), 'spec-test-'))
    })

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true })
    })

    describe('init', () => {
      it('创建 openspec 目录结构', async () => {
        await SpecEngine.init(testDir)

        const { existsSync } = await import('node:fs')
        expect(existsSync(join(testDir, 'openspec'))).toBe(true)
        expect(existsSync(join(testDir, 'openspec', 'specs'))).toBe(true)
        expect(existsSync(join(testDir, 'openspec', 'changes'))).toBe(true)
        expect(existsSync(join(testDir, 'openspec', 'project.md'))).toBe(true)
      })
    })

    describe('createChange', () => {
      it('创建新的变更提案', async () => {
        await SpecEngine.init(testDir)
        const change = await SpecEngine.createChange(testDir, 'test-change', '测试变更')

        expect(change.name).toBe('test-change')
        expect(change.phase).toBe('proposal')
        expect(change.proposal).toContain('test-change')
        expect(change.proposal).toContain('测试变更')

        const { existsSync } = await import('node:fs')
        expect(existsSync(join(testDir, 'openspec', 'changes', 'test-change', 'proposal.md'))).toBe(
          true,
        )
      })
    })

    describe('getChange', () => {
      it('获取存在的变更', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')

        const change = await SpecEngine.getChange(testDir, 'test-change')

        expect(change).not.toBeUndefined()
        expect(change?.name).toBe('test-change')
        expect(change?.phase).toBe('proposal')
      })

      it('获取不存在的变更返回 undefined', async () => {
        await SpecEngine.init(testDir)
        const change = await SpecEngine.getChange(testDir, 'non-existent')
        expect(change).toBeUndefined()
      })
    })

    describe('listChanges', () => {
      it('列出所有变更', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'change-1', '变更1')
        await SpecEngine.createChange(testDir, 'change-2', '变更2')

        const changes = await SpecEngine.listChanges(testDir)

        expect(changes.length).toBe(2)
        expect(changes.some((c) => c.name === 'change-1')).toBe(true)
        expect(changes.some((c) => c.name === 'change-2')).toBe(true)
      })

      it('空目录返回空数组', async () => {
        const changes = await SpecEngine.listChanges(testDir)
        expect(changes.length).toBe(0)
      })
    })

    describe('advancePhase', () => {
      it('从 proposal 推进到 definition', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')

        const newPhase = await SpecEngine.advancePhase(testDir, 'test-change')

        expect(newPhase).toBe('definition')

        const { existsSync } = await import('node:fs')
        expect(existsSync(join(testDir, 'openspec', 'changes', 'test-change', 'design.md'))).toBe(
          true,
        )
      })

      it('从 definition 推进到 apply', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')
        await SpecEngine.advancePhase(testDir, 'test-change')

        const newPhase = await SpecEngine.advancePhase(testDir, 'test-change')

        expect(newPhase).toBe('apply')

        const { existsSync } = await import('node:fs')
        expect(existsSync(join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'))).toBe(
          true,
        )
      })

      it('从 apply 推进到 archive', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')
        await SpecEngine.advancePhase(testDir, 'test-change')
        await SpecEngine.advancePhase(testDir, 'test-change')

        const newPhase = await SpecEngine.advancePhase(testDir, 'test-change')

        expect(newPhase).toBe('archive')

        const { existsSync } = await import('node:fs')
        expect(existsSync(join(testDir, 'openspec', 'changes', 'test-change', 'specs'))).toBe(true)
      })
    })

    describe('writeDesign', () => {
      it('写入设计文档', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')

        await SpecEngine.writeDesign(testDir, 'test-change', '# 设计文档\n\n详细设计')

        const { readFile } = await import('node:fs/promises')
        const content = await readFile(
          join(testDir, 'openspec', 'changes', 'test-change', 'design.md'),
          'utf-8',
        )
        expect(content).toContain('设计文档')
        expect(content).toContain('详细设计')
      })
    })

    describe('parseTasks', () => {
      it('解析待办任务', async () => {
        const content = `# Tasks

- [ ] task-1 实现登录功能
- [x] task-2 设计数据库
- [ ] task-3 编写测试
`

        const tasks = await SpecEngine.parseTasks(content)

        expect(tasks.length).toBe(3)
        expect(tasks[0]?.id).toBe('task-1')
        expect(tasks[0]?.description).toBe('实现登录功能')
        expect(tasks[0]?.status).toBe('pending')
        expect(tasks[1]?.id).toBe('task-2')
        expect(tasks[1]?.status).toBe('done')
        expect(tasks[2]?.id).toBe('task-3')
        expect(tasks[2]?.status).toBe('pending')
      })

      it('空内容返回空数组', async () => {
        const tasks = await SpecEngine.parseTasks('')
        expect(tasks.length).toBe(0)
      })
    })

    describe('writeTasks', () => {
      it('写入任务列表', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')

        const tasks: SpecEngine.TaskItem[] = [
          { id: 'task-1', description: '实现功能', status: 'pending' },
          { id: 'task-2', description: '编写测试', status: 'done' },
        ]

        await SpecEngine.writeTasks(testDir, 'test-change', tasks)

        const { readFile } = await import('node:fs/promises')
        const content = await readFile(
          join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'),
          'utf-8',
        )

        expect(content).toContain('- [ ] task-1 实现功能')
        expect(content).toContain('- [x] task-2 编写测试')
      })
    })

    describe('updateTaskStatus', () => {
      it('更新任务状态', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')

        const tasks: SpecEngine.TaskItem[] = [
          { id: 'task-1', description: '实现功能', status: 'pending' },
          { id: 'task-2', description: '编写测试', status: 'pending' },
        ]
        await SpecEngine.writeTasks(testDir, 'test-change', tasks)

        await SpecEngine.updateTaskStatus(testDir, 'test-change', 'task-1', 'done')

        const change = await SpecEngine.getChange(testDir, 'test-change')
        const task1 = change?.tasks?.find((t) => t.id === 'task-1')
        expect(task1?.status).toBe('done')
      })
    })

    describe('archiveChange', () => {
      it('归档变更到 archive 目录', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-change', '测试变更')

        await SpecEngine.archiveChange(testDir, 'test-change')

        const { existsSync } = await import('node:fs')
        expect(existsSync(join(testDir, 'openspec', 'changes', 'test-change'))).toBe(false)
        expect(existsSync(join(testDir, 'openspec', 'archive', 'test-change'))).toBe(true)
      })
    })

    describe('listSpecs', () => {
      it('列出所有 spec', async () => {
        await SpecEngine.init(testDir)

        const { mkdir, writeFile } = await import('node:fs/promises')
        await mkdir(join(testDir, 'openspec', 'specs', 'spec-1'), { recursive: true })
        await writeFile(
          join(testDir, 'openspec', 'specs', 'spec-1', 'spec.md'),
          '# Spec 1',
          'utf-8',
        )
        await mkdir(join(testDir, 'openspec', 'specs', 'spec-2'), { recursive: true })
        await writeFile(
          join(testDir, 'openspec', 'specs', 'spec-2', 'spec.md'),
          '# Spec 2',
          'utf-8',
        )

        const specs = await SpecEngine.listSpecs(testDir)

        expect(specs.length).toBe(2)
        expect(specs).toContain('spec-1')
        expect(specs).toContain('spec-2')
      })

      it('空目录返回空数组', async () => {
        await SpecEngine.init(testDir)
        const specs = await SpecEngine.listSpecs(testDir)
        expect(specs.length).toBe(0)
      })
    })

    describe('SessionProcessor 集成', () => {
      it('所有任务完成时自动推进 spec 阶段', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-integration', '集成测试')
        await SpecEngine.advancePhase(testDir, 'test-integration')
        await SpecEngine.advancePhase(testDir, 'test-integration')

        const tasks: SpecEngine.TaskItem[] = [
          { id: 'task-1', description: '任务1', status: 'done' },
          { id: 'task-2', description: '任务2', status: 'done' },
        ]
        await SpecEngine.writeTasks(testDir, 'test-integration', tasks)

        const { SessionProcessor } = await import('../src/session/processor')
        const { Session } = await import('../src/session')

        Session.reset()
        const session = Session.create({ modelId: 'test-model' })

        const mockModel = {
          modelId: 'test-model',
          provider: 'test',
          doStream: async function* () {
            yield {
              type: 'text-delta' as const,
              textDelta: 'Test response',
            }
            yield {
              type: 'finish' as const,
              finishReason: 'stop' as const,
              usage: { promptTokens: 10, completionTokens: 20 },
            }
          },
        }

        const result = await SessionProcessor.process({
          sessionId: session.id,
          userMessage: 'Test message',
          model: mockModel as any,
          projectRoot: testDir,
          specChangeName: 'test-integration',
        })

        expect(result.specAdvanced).toBe(true)
        expect(result.specPhase).toBe('archive')
      })

      it('任务未完成时不推进 spec 阶段', async () => {
        await SpecEngine.init(testDir)
        await SpecEngine.createChange(testDir, 'test-no-advance', '不推进测试')
        await SpecEngine.advancePhase(testDir, 'test-no-advance')
        await SpecEngine.advancePhase(testDir, 'test-no-advance')

        const tasks: SpecEngine.TaskItem[] = [
          { id: 'task-1', description: '任务1', status: 'done' },
          { id: 'task-2', description: '任务2', status: 'pending' },
        ]
        await SpecEngine.writeTasks(testDir, 'test-no-advance', tasks)

        const { SessionProcessor } = await import('../src/session/processor')
        const { Session } = await import('../src/session')

        Session.reset()
        const session = Session.create({ modelId: 'test-model' })

        const mockModel = {
          modelId: 'test-model',
          provider: 'test',
          doStream: async function* () {
            yield {
              type: 'text-delta' as const,
              textDelta: 'Test response',
            }
            yield {
              type: 'finish' as const,
              finishReason: 'stop' as const,
              usage: { promptTokens: 10, completionTokens: 20 },
            }
          },
        }

        const result = await SessionProcessor.process({
          sessionId: session.id,
          userMessage: 'Test message',
          model: mockModel as any,
          projectRoot: testDir,
          specChangeName: 'test-no-advance',
        })

        expect(result.specAdvanced).toBe(false)
        expect(result.specPhase).toBe('apply')
      })

      it('没有 projectRoot 时不执行 spec 操作', async () => {
        const { SessionProcessor } = await import('../src/session/processor')
        const { Session } = await import('../src/session')

        Session.reset()
        const session = Session.create({ modelId: 'test-model' })

        const mockModel = {
          modelId: 'test-model',
          provider: 'test',
          doStream: async function* () {
            yield {
              type: 'text-delta' as const,
              textDelta: 'Test response',
            }
            yield {
              type: 'finish' as const,
              finishReason: 'stop' as const,
              usage: { promptTokens: 10, completionTokens: 20 },
            }
          },
        }

        const result = await SessionProcessor.process({
          sessionId: session.id,
          userMessage: 'Test message',
          model: mockModel as any,
        })

        expect(result.specAdvanced).toBe(false)
        expect(result.specPhase).toBeUndefined()
      })
    })
  })
})
