import { beforeEach, describe, expect, it } from 'bun:test'
import { Orchestrator } from '../src/orchestrator'

describe('Orchestrator', () => {
  beforeEach(() => {
    Orchestrator.reset()
  })

  describe('预设 Agent', () => {
    it('应该返回至少 6 个预设 Agent', () => {
      const presets = Orchestrator.getPresets()
      expect(presets.length).toBeGreaterThanOrEqual(6)
    })

    it('应该能获取单个预设 Agent', () => {
      const orchestrator = Orchestrator.getPreset('orchestrator')
      expect(orchestrator).toBeDefined()
      expect(orchestrator?.id).toBe('orchestrator')
      expect(orchestrator?.name).toBe('Orchestrator')
      expect(orchestrator?.tools).toContain('read')
      expect(orchestrator?.tools).toContain('write')
      expect(orchestrator?.tools).toContain('bash')
      expect(orchestrator?.permissions.canWrite).toBe(true)
      expect(orchestrator?.permissions.canExecute).toBe(true)
      expect(orchestrator?.permissions.canNetwork).toBe(false)
    })

    it('应该包含所有 6 个预设 Agent', () => {
      const presets = Orchestrator.getPresets()
      const ids = presets.map((p) => p.id)
      expect(ids).toContain('orchestrator')
      expect(ids).toContain('explorer')
      expect(ids).toContain('oracle')
      expect(ids).toContain('librarian')
      expect(ids).toContain('builder')
      expect(ids).toContain('researcher')
    })
  })

  describe('自定义 Agent', () => {
    it('应该能创建自定义 Agent', () => {
      const customAgent: Orchestrator.AgentProfile = {
        id: 'custom-agent',
        name: 'Custom Agent',
        description: '自定义 Agent',
        systemPrompt: '你是一个自定义 Agent',
        model: 'claude-sonnet-4-20250514',
        tools: ['read', 'write'],
        mcps: [],
        skills: [],
        permissions: {
          canWrite: true,
          canExecute: false,
          canNetwork: false,
        },
      }
      Orchestrator.createAgent(customAgent)
      const retrieved = Orchestrator.getAgent('custom-agent')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Custom Agent')
    })

    it('应该列出所有 Agent（预设 + 自定义）', () => {
      const customAgent: Orchestrator.AgentProfile = {
        id: 'my-agent',
        name: 'My Agent',
        description: '我的 Agent',
        systemPrompt: '你是我的 Agent',
        model: 'claude-sonnet-4-20250514',
        tools: ['read'],
        mcps: [],
        skills: [],
        permissions: {
          canWrite: false,
          canExecute: true,
          canNetwork: false,
        },
      }
      Orchestrator.createAgent(customAgent)
      const all = Orchestrator.listAgents()
      expect(all.length).toBeGreaterThanOrEqual(7) // 6 预设 + 1 自定义
      const ids = all.map((a) => a.id)
      expect(ids).toContain('orchestrator')
      expect(ids).toContain('my-agent')
    })
  })

  describe('执行计划', () => {
    it('应该能创建执行计划', () => {
      const plan = Orchestrator.createPlan('测试计划', [
        {
          agentId: 'orchestrator',
          prompt: '第一步',
          dependsOn: [],
          parallel: false,
        },
        {
          agentId: 'builder',
          prompt: '第二步',
          dependsOn: [],
          parallel: false,
        },
      ])
      expect(plan.id).toBeDefined()
      expect(plan.title).toBe('测试计划')
      expect(plan.steps.length).toBe(2)
      expect(plan.steps[0]!.status).toBe('pending')
      expect(plan.steps[1]!.status).toBe('pending')
    })

    it('应该能获取下一批可执行的步骤（无依赖）', () => {
      const plan = Orchestrator.createPlan('依赖计划', [
        {
          agentId: 'orchestrator',
          prompt: '步骤 1',
          dependsOn: [],
          parallel: false,
        },
        {
          agentId: 'builder',
          prompt: '步骤 2',
          dependsOn: [],
          parallel: false,
        },
      ])
      const nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.length).toBe(2)
    })

    it('应该能获取下一批可执行的步骤（依赖已完成）', () => {
      const plan = Orchestrator.createPlan('依赖计划', [
        {
          agentId: 'orchestrator',
          prompt: '步骤 1',
          dependsOn: [],
          parallel: false,
        },
        {
          agentId: 'builder',
          prompt: '步骤 2',
          dependsOn: [],
          parallel: false,
        },
      ])
      const step1Id = plan.steps[0]!.id
      const step2Id = plan.steps[1]!.id
      plan.steps[1]!.dependsOn = [step1Id]

      let nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.length).toBe(1)
      expect(nextSteps[0]!.agentId).toBe('orchestrator')

      Orchestrator.updateStepStatus(plan.id, step1Id, 'completed')
      nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.length).toBe(1)
      expect(nextSteps[0]!.agentId).toBe('builder')
    })

    it('应该能更新步骤状态', () => {
      const plan = Orchestrator.createPlan('状态计划', [
        {
          agentId: 'orchestrator',
          prompt: '步骤 1',
          dependsOn: [],
          parallel: false,
        },
      ])
      const stepId = plan.steps[0]!.id
      Orchestrator.updateStepStatus(plan.id, stepId, 'running')
      const updated = Orchestrator.getNextSteps(plan)
      // 运行中的步骤不应该在下一批中
      expect(updated.length).toBe(0)
    })

    it('应该支持并行步骤', () => {
      const plan = Orchestrator.createPlan('并行计划', [
        {
          agentId: 'orchestrator',
          prompt: '步骤 1',
          dependsOn: [],
          parallel: true,
        },
        {
          agentId: 'builder',
          prompt: '步骤 2',
          dependsOn: [],
          parallel: true,
        },
        {
          agentId: 'explorer',
          prompt: '步骤 3',
          dependsOn: [],
          parallel: false,
        },
      ])
      const nextSteps = Orchestrator.getNextSteps(plan)
      // 应该返回所有无依赖的步骤
      expect(nextSteps.length).toBe(3)
      const parallelSteps = nextSteps.filter((s) => s.parallel)
      expect(parallelSteps.length).toBe(2)
    })
  })

  describe('重置', () => {
    it('应该能重置所有状态', () => {
      const customAgent: Orchestrator.AgentProfile = {
        id: 'temp-agent',
        name: 'Temp Agent',
        description: '临时 Agent',
        systemPrompt: '临时',
        model: 'claude-sonnet-4-20250514',
        tools: ['read'],
        mcps: [],
        skills: [],
        permissions: {
          canWrite: false,
          canExecute: false,
          canNetwork: false,
        },
      }
      Orchestrator.createAgent(customAgent)
      let all = Orchestrator.listAgents()
      expect(all.length).toBeGreaterThan(6)

      Orchestrator.reset()
      all = Orchestrator.listAgents()
      expect(all.length).toBe(6)
      expect(Orchestrator.getAgent('temp-agent')).toBeUndefined()
    })
  })

  describe('类型定义', () => {
    it('StepResult 类型存在', () => {
      const result: Orchestrator.StepResult = {
        stepId: 'step-1',
        agentId: 'builder',
        success: true,
        output: '执行成功',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      }
      expect(result.stepId).toBe('step-1')
      expect(result.success).toBe(true)
      expect(result.usage.totalTokens).toBe(150)
    })

    it('PlanResult 类型存在', () => {
      const planResult: Orchestrator.PlanResult = {
        planId: 'plan-1',
        results: [],
        allCompleted: false,
        totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
      expect(planResult.planId).toBe('plan-1')
      expect(planResult.allCompleted).toBe(false)
      expect(planResult.results.length).toBe(0)
    })
  })

  describe('复杂依赖场景', () => {
    it('plan 中所有 step 完成后 getNextSteps 返回空', () => {
      const plan = Orchestrator.createPlan('完成测试', [
        {
          agentId: 'builder',
          prompt: '步骤1',
          dependsOn: [],
          parallel: false,
        },
        {
          agentId: 'explorer',
          prompt: '步骤2',
          dependsOn: [],
          parallel: false,
        },
      ])

      for (const step of plan.steps) {
        Orchestrator.updateStepStatus(plan.id, step.id, 'completed')
      }

      const nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.length).toBe(0)
    })

    it('复杂依赖链处理正确', () => {
      const plan = Orchestrator.createPlan('复杂依赖', [
        {
          agentId: 'builder',
          prompt: '步骤1',
          dependsOn: [],
          parallel: false,
        },
      ])

      const step1Id = plan.steps[0]!.id

      plan.steps.push({
        id: 'step-2',
        agentId: 'explorer',
        prompt: '步骤2',
        dependsOn: [step1Id],
        parallel: false,
        status: 'pending',
      })

      plan.steps.push({
        id: 'step-3',
        agentId: 'oracle',
        prompt: '步骤3',
        dependsOn: [step1Id],
        parallel: false,
        status: 'pending',
      })

      let nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.length).toBe(1)
      expect(nextSteps[0]!.id).toBe(step1Id)

      Orchestrator.updateStepStatus(plan.id, step1Id, 'completed')

      nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.length).toBe(2)
      expect(nextSteps.map((s) => s.id).sort()).toEqual(['step-2', 'step-3'])
    })

    it('多重依赖链处理正确', () => {
      const plan = Orchestrator.createPlan('多重依赖', [
        {
          agentId: 'builder',
          prompt: '步骤1',
          dependsOn: [],
          parallel: false,
        },
        {
          agentId: 'explorer',
          prompt: '步骤2',
          dependsOn: [],
          parallel: false,
        },
      ])

      const step1Id = plan.steps[0]!.id
      const step2Id = plan.steps[1]!.id

      plan.steps.push({
        id: 'step-3',
        agentId: 'oracle',
        prompt: '步骤3',
        dependsOn: [step1Id, step2Id],
        parallel: false,
        status: 'pending',
      })

      Orchestrator.updateStepStatus(plan.id, step1Id, 'completed')

      let nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.map((s) => s.id)).not.toContain('step-3')

      Orchestrator.updateStepStatus(plan.id, step2Id, 'completed')

      nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.map((s) => s.id)).toContain('step-3')
    })

    it('失败的步骤不阻塞其他独立步骤', () => {
      const plan = Orchestrator.createPlan('失败测试', [
        {
          agentId: 'builder',
          prompt: '步骤1',
          dependsOn: [],
          parallel: false,
        },
        {
          agentId: 'explorer',
          prompt: '步骤2',
          dependsOn: [],
          parallel: false,
        },
      ])

      const step1Id = plan.steps[0]!.id

      Orchestrator.updateStepStatus(plan.id, step1Id, 'failed')

      const nextSteps = Orchestrator.getNextSteps(plan)
      expect(nextSteps.length).toBe(1)
      expect(nextSteps[0]!.id).toBe(plan.steps[1]!.id)
    })
  })
})
