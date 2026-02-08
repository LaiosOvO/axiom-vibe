// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace Agent {
  export const Info = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    model: z.string(),
    tools: z.array(z.string()),
    temperature: z.number().min(0).max(2).optional(),
  })

  export type Info = z.infer<typeof Info>

  const registry = new Map<string, Info>()

  const builtinAgents: Info[] = [
    {
      id: 'coder',
      name: 'Coder',
      description: '主编码 Agent，通用编码任务',
      systemPrompt: '你是一个专业的编程助手，擅长各种编程语言和框架',
      model: 'claude-3-5-sonnet-20241022',
      tools: ['read', 'write', 'bash'],
    },
    {
      id: 'architect',
      name: 'Architect',
      description: '架构设计和代码审查',
      systemPrompt: '你是一个资深的系统架构师，专注于代码设计和审查',
      model: 'claude-3-5-sonnet-20241022',
      tools: ['read', 'bash'],
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: '代码搜索和分析',
      systemPrompt: '你是一个代码分析专家，擅长搜索和理解代码库',
      model: 'claude-3-5-sonnet-20241022',
      tools: ['read', 'bash'],
    },
    {
      id: 'writer',
      name: 'Writer',
      description: '文档和注释编写',
      systemPrompt: '你是一个技术文档专家，擅长编写清晰的文档和注释',
      model: 'claude-3-5-sonnet-20241022',
      tools: ['read', 'write'],
    },
    {
      id: 'reviewer',
      name: 'Reviewer',
      description: '代码审查和质量检查',
      systemPrompt: '你是一个代码质量审查专家，关注代码的可读性和最佳实践',
      model: 'claude-3-5-sonnet-20241022',
      tools: ['read', 'bash'],
    },
    {
      id: 'planner',
      name: 'Planner',
      description: '任务规划和需求分析',
      systemPrompt: '你是一个项目规划专家，擅长分析需求和制定计划',
      model: 'claude-3-5-sonnet-20241022',
      tools: ['read'],
    },
  ]

  function initBuiltins() {
    for (const agent of builtinAgents) {
      registry.set(agent.id, agent)
    }
  }

  initBuiltins()

  export function register(agent: Info): void {
    const validated = Info.parse(agent)
    registry.set(validated.id, validated)
  }

  export function get(id: string): Info | undefined {
    return registry.get(id)
  }

  export function list(): Info[] {
    return Array.from(registry.values())
  }

  export function has(id: string): boolean {
    return registry.has(id)
  }

  export function remove(id: string): void {
    registry.delete(id)
  }

  export function reset(): void {
    registry.clear()
    initBuiltins()
  }
}
