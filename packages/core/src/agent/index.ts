import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { Permission } from '../permission'

export namespace Agent {
  /**
   * Agent 模式
   * - primary: 主 Agent，用户可选择
   * - subagent: 子 Agent，可被主 Agent 调用
   * - hidden: 隐藏 Agent，系统内部使用
   */
  export type AgentMode = 'primary' | 'subagent' | 'hidden'

  /**
   * 增强的 Agent 定义（新架构）
   */
  export interface AgentDef {
    id: string
    name: string
    description: string
    mode: AgentMode
    model: string
    systemPromptFile?: string
    systemPrompt?: string
    tools: string[]
    permissions: Permission.PermissionRule[]
    temperature?: number
    maxOutputTokens?: number
  }

  /**
   * 旧版 Agent 信息（向后兼容）
   */
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
  const defRegistry = new Map<string, AgentDef>()

  /**
   * 内置 Agent 定义（新架构）
   */
  const builtinAgentDefs: AgentDef[] = [
    {
      id: 'build',
      name: 'Build',
      description: '默认 Agent，全功能编码助手',
      mode: 'primary',
      model: 'claude-sonnet-4-20250514',
      systemPromptFile: 'build.txt',
      tools: ['read', 'write', 'edit', 'bash', 'glob', 'grep', 'ls', 'webfetch'],
      permissions: [
        { tool: '*', action: 'allow' },
        { tool: 'bash', pattern: 'rm -rf /', action: 'deny' },
      ],
    },
    {
      id: 'plan',
      name: 'Plan',
      description: '规划 Agent，只能编辑 plan 文件',
      mode: 'primary',
      model: 'claude-sonnet-4-20250514',
      systemPromptFile: 'plan.txt',
      tools: ['read', 'write', 'edit', 'glob', 'grep'],
      permissions: [
        { tool: 'write', pattern: '*.md', action: 'allow' },
        { tool: 'write', action: 'deny' },
        { tool: 'edit', pattern: '*.md', action: 'allow' },
        { tool: 'edit', action: 'deny' },
        { tool: '*', action: 'allow' },
      ],
    },
    {
      id: 'explore',
      name: 'Explore',
      description: '搜索分析 Agent，只读',
      mode: 'subagent',
      model: 'claude-sonnet-4-20250514',
      systemPromptFile: 'explore.txt',
      tools: ['read', 'glob', 'grep', 'bash', 'ls', 'webfetch'],
      permissions: [
        { tool: 'read', action: 'allow' },
        { tool: 'glob', action: 'allow' },
        { tool: 'grep', action: 'allow' },
        { tool: 'ls', action: 'allow' },
        { tool: 'bash', action: 'ask' },
        { tool: 'webfetch', action: 'allow' },
        { tool: '*', action: 'deny' },
      ],
    },
    {
      id: 'title',
      name: 'Title',
      description: '生成会话标题',
      mode: 'hidden',
      model: 'claude-sonnet-4-20250514',
      tools: [],
      permissions: [{ tool: '*', action: 'deny' }],
    },
    {
      id: 'summary',
      name: 'Summary',
      description: '生成会话摘要',
      mode: 'hidden',
      model: 'claude-sonnet-4-20250514',
      tools: [],
      permissions: [{ tool: '*', action: 'deny' }],
    },
  ]

  /**
   * 旧版内置 Agent（向后兼容）
   */
  const builtinAgents: Info[] = [
    {
      id: 'coder',
      name: 'Coder',
      description: '主编码 Agent，通用编码任务',
      systemPrompt: '你是一个专业的编程助手，擅长各种编程语言和框架',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'write', 'bash'],
    },
    {
      id: 'architect',
      name: 'Architect',
      description: '架构设计和代码审查',
      systemPrompt: '你是一个资深的系统架构师，专注于代码设计和审查',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'bash'],
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: '代码搜索和分析',
      systemPrompt: '你是一个代码分析专家，擅长搜索和理解代码库',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'bash'],
    },
    {
      id: 'writer',
      name: 'Writer',
      description: '文档和注释编写',
      systemPrompt: '你是一个技术文档专家，擅长编写清晰的文档和注释',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'write'],
    },
    {
      id: 'reviewer',
      name: 'Reviewer',
      description: '代码审查和质量检查',
      systemPrompt: '你是一个代码质量审查专家，关注代码的可读性和最佳实践',
      model: 'claude-sonnet-4-20250514',
      tools: ['read', 'bash'],
    },
    {
      id: 'planner',
      name: 'Planner',
      description: '任务规划和需求分析',
      systemPrompt: '你是一个项目规划专家，擅长分析需求和制定计划',
      model: 'claude-sonnet-4-20250514',
      tools: ['read'],
    },
  ]

  function initBuiltins() {
    for (const agent of builtinAgents) {
      registry.set(agent.id, agent)
    }
    for (const def of builtinAgentDefs) {
      defRegistry.set(def.id, def)
    }
  }

  initBuiltins()

  /**
   * 注册旧版 Agent（向后兼容）
   */
  export function register(agent: Info): void {
    const validated = Info.parse(agent)
    registry.set(validated.id, validated)
  }

  /**
   * 获取旧版 Agent（向后兼容）
   */
  export function get(id: string): Info | undefined {
    return registry.get(id)
  }

  /**
   * 列出旧版 Agent（向后兼容）
   */
  export function list(): Info[] {
    return Array.from(registry.values())
  }

  /**
   * 检查旧版 Agent 是否存在（向后兼容）
   */
  export function has(id: string): boolean {
    return registry.has(id)
  }

  /**
   * 删除旧版 Agent（向后兼容）
   */
  export function remove(id: string): void {
    registry.delete(id)
  }

  /**
   * 重置为内置 Agent（向后兼容）
   */
  export function reset(): void {
    registry.clear()
    defRegistry.clear()
    initBuiltins()
  }

  /**
   * 获取 AgentDef（新架构）
   */
  export function getAgentDef(id: string): AgentDef | undefined {
    return defRegistry.get(id)
  }

  /**
   * 列出所有 AgentDef（新架构）
   */
  export function listAgentDefs(): AgentDef[] {
    return Array.from(defRegistry.values())
  }

  /**
   * 注册 AgentDef（新架构）
   */
  export function registerAgentDef(agent: AgentDef): void {
    defRegistry.set(agent.id, agent)
  }

  /**
   * 获取默认 Agent
   */
  export function getDefaultAgent(): AgentDef {
    const buildAgent = defRegistry.get('build')
    if (!buildAgent) {
      throw new Error('Default agent "build" not found')
    }
    return buildAgent
  }

  /**
   * 加载 Agent 的 system prompt
   * @param agent Agent 定义
   * @param projectRoot 项目根目录（可选）
   * @returns System prompt 字符串
   */
  export async function loadSystemPrompt(agent: AgentDef, projectRoot?: string): Promise<string> {
    if (agent.systemPrompt) {
      return agent.systemPrompt
    }

    if (agent.systemPromptFile) {
      const promptPath = projectRoot
        ? join(projectRoot, 'agent/prompt', agent.systemPromptFile)
        : join(process.cwd(), 'agent/prompt', agent.systemPromptFile)

      try {
        const content = await readFile(promptPath, 'utf-8')
        return content.trim()
      } catch (error) {
        throw new Error(
          `Failed to load system prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    return `You are ${agent.name}, ${agent.description}`
  }
}
