import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export namespace Orchestrator {
  export const TaskStep = z.object({
    id: z.string(),
    agentId: z.string(),
    prompt: z.string(),
    dependsOn: z.array(z.string()).default([]),
    parallel: z.boolean().default(false),
    status: z.enum(['pending', 'running', 'completed', 'failed']).default('pending'),
  })
  export type TaskStep = z.infer<typeof TaskStep>

  export const Plan = z.object({
    id: z.string(),
    title: z.string(),
    steps: z.array(TaskStep),
    createdAt: z.number(),
  })
  export type Plan = z.infer<typeof Plan>

  export const AgentProfile = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    model: z.string(),
    tools: z.array(z.string()),
    mcps: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
    permissions: z.object({
      canWrite: z.boolean().default(true),
      canExecute: z.boolean().default(true),
      canNetwork: z.boolean().default(false),
    }),
  })
  export type AgentProfile = z.infer<typeof AgentProfile>

  const presets: AgentProfile[] = [
    {
      id: 'orchestrator',
      name: 'Orchestrator',
      description: '任务编排和协调',
      systemPrompt: '你是一个任务编排专家，负责协调多个 Agent 完成复杂任务',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'write', 'bash'],
      mcps: [],
      skills: [],
      permissions: {
        canWrite: true,
        canExecute: true,
        canNetwork: false,
      },
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: '代码搜索和分析',
      systemPrompt: '你是一个代码分析专家，擅长搜索和理解代码库',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'bash'],
      mcps: [],
      skills: [],
      permissions: {
        canWrite: false,
        canExecute: true,
        canNetwork: false,
      },
    },
    {
      id: 'oracle',
      name: 'Oracle',
      description: '知识查询和问答',
      systemPrompt: '你是一个知识库专家，能够快速查询和回答各种问题',
      model: 'claude-sonnet-4-20250514',
      tools: ['read'],
      mcps: [],
      skills: [],
      permissions: {
        canWrite: false,
        canExecute: false,
        canNetwork: false,
      },
    },
    {
      id: 'librarian',
      name: 'Librarian',
      description: '文档管理和索引',
      systemPrompt: '你是一个文档管理专家，负责组织和索引各种文档',
      model: 'claude-sonnet-4-20250514',
      tools: ['read'],
      mcps: [],
      skills: [],
      permissions: {
        canWrite: false,
        canExecute: true,
        canNetwork: true,
      },
    },
    {
      id: 'builder',
      name: 'Builder',
      description: '代码构建和编译',
      systemPrompt: '你是一个构建系统专家，负责编译和构建代码',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'write', 'bash'],
      mcps: [],
      skills: [],
      permissions: {
        canWrite: true,
        canExecute: true,
        canNetwork: false,
      },
    },
    {
      id: 'researcher',
      name: 'Researcher',
      description: '研究和调查',
      systemPrompt: '你是一个研究专家，负责深入调查和分析问题',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'write'],
      mcps: [],
      skills: [],
      permissions: {
        canWrite: true,
        canExecute: false,
        canNetwork: true,
      },
    },
  ]

  const agentRegistry = new Map<string, AgentProfile>()
  const planRegistry = new Map<string, Plan>()

  function initPresets() {
    for (const preset of presets) {
      agentRegistry.set(preset.id, preset)
    }
  }

  initPresets()

  export function getPresets(): AgentProfile[] {
    return presets
  }

  export function getPreset(id: string): AgentProfile | undefined {
    return presets.find((p) => p.id === id)
  }

  export function createAgent(profile: AgentProfile): void {
    const validated = AgentProfile.parse(profile)
    agentRegistry.set(validated.id, validated)
  }

  export function getAgent(id: string): AgentProfile | undefined {
    return agentRegistry.get(id)
  }

  export function listAgents(): AgentProfile[] {
    return Array.from(agentRegistry.values())
  }

  export function createPlan(title: string, steps: Omit<TaskStep, 'id' | 'status'>[]): Plan {
    const planId = randomUUID()
    const taskSteps: TaskStep[] = steps.map((step) => ({
      ...step,
      id: randomUUID(),
      status: 'pending' as const,
    }))
    const plan: Plan = {
      id: planId,
      title,
      steps: taskSteps,
      createdAt: Date.now(),
    }
    planRegistry.set(planId, plan)
    return plan
  }

  export function updateStepStatus(
    planId: string,
    stepId: string,
    status: TaskStep['status'],
  ): void {
    const plan = planRegistry.get(planId)
    if (!plan) return
    const step = plan.steps.find((s) => s.id === stepId)
    if (step) {
      step.status = status
    }
  }

  export function getNextSteps(plan: Plan): TaskStep[] {
    const completedStepIds = new Set(
      plan.steps.filter((s) => s.status === 'completed').map((s) => s.id),
    )

    return plan.steps.filter((step) => {
      if (step.status !== 'pending') return false
      if (step.dependsOn.length === 0) return true
      return step.dependsOn.every((depId) => completedStepIds.has(depId))
    })
  }

  export function reset(): void {
    agentRegistry.clear()
    planRegistry.clear()
    initPresets()
  }

  export interface StepResult {
    stepId: string
    agentId: string
    success: boolean
    output: string
    usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  }

  export interface PlanResult {
    planId: string
    results: StepResult[]
    allCompleted: boolean
    totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  }

  export async function runStep(
    planId: string,
    step: TaskStep,
    model: import('ai').LanguageModel,
    projectRoot?: string,
  ): Promise<StepResult> {
    const { AgentRunner } = await import('../agent/runner')

    updateStepStatus(planId, step.id, 'running')

    try {
      const result = await AgentRunner.run({
        agentId: step.agentId,
        userMessage: step.prompt,
        model,
        projectRoot,
      })

      return {
        stepId: step.id,
        agentId: step.agentId,
        success: result.finishReason !== 'error',
        output: result.assistantMessage.content,
        usage: result.usage,
      }
    } catch (error) {
      return {
        stepId: step.id,
        agentId: step.agentId,
        success: false,
        output: error instanceof Error ? error.message : String(error),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    }
  }

  export async function executePlan(
    plan: Plan,
    model: import('ai').LanguageModel,
    projectRoot?: string,
  ): Promise<PlanResult> {
    const results: StepResult[] = []
    const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    const maxIterations = plan.steps.length + 1

    for (let i = 0; i < maxIterations; i++) {
      const nextSteps = getNextSteps(plan)
      if (nextSteps.length === 0) break

      const parallelSteps = nextSteps.filter((s) => s.parallel)
      const serialSteps = nextSteps.filter((s) => !s.parallel)

      if (parallelSteps.length > 0) {
        const parallelResults = await Promise.all(
          parallelSteps.map((step) => runStep(plan.id, step, model, projectRoot)),
        )
        for (const result of parallelResults) {
          results.push(result)
          totalUsage.inputTokens += result.usage.inputTokens
          totalUsage.outputTokens += result.usage.outputTokens
          totalUsage.totalTokens += result.usage.totalTokens

          const status = result.success ? 'completed' : 'failed'
          updateStepStatus(plan.id, result.stepId, status)
        }
      }

      if (serialSteps.length > 0) {
        const step = serialSteps[0]!
        const result = await runStep(plan.id, step, model, projectRoot)
        results.push(result)
        totalUsage.inputTokens += result.usage.inputTokens
        totalUsage.outputTokens += result.usage.outputTokens
        totalUsage.totalTokens += result.usage.totalTokens

        const status = result.success ? 'completed' : 'failed'
        updateStepStatus(plan.id, result.stepId, status)
      }
    }

    const allCompleted = plan.steps.every((s) => s.status === 'completed')
    return { planId: plan.id, results, allCompleted, totalUsage }
  }
}
