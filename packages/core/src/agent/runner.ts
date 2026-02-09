import type { LanguageModel } from 'ai'
import { Session } from '../session/index'
import { SessionProcessor } from '../session/processor'
import { SystemPrompt } from '../session/system'
import { Skill } from '../skill'
import { ToolRegistry } from '../tool'
import { Agent } from './index'

/**
 * AgentRunner 命名空间 - 封装 Agent 启动和运行的完整流程
 */
export namespace AgentRunner {
  /**
   * 运行配置
   */
  export type RunInput = {
    /** Agent ID（默认 'build'） */
    agentId?: string
    /** 用户消息 */
    userMessage: string
    /** 语言模型 */
    model: LanguageModel
    /** 项目根目录 */
    projectRoot?: string
    /** 中止信号 */
    abortSignal?: AbortSignal
  }

  /**
   * 运行 Agent
   * 1. 解析 Agent 定义
   * 2. 加载 Skills
   * 3. 构建 System Prompt
   * 4. 解析工具列表（根据 agent.tools 过滤）
   * 5. 调用 SessionProcessor.process()
   */
  export async function run(input: RunInput): Promise<SessionProcessor.ProcessResult> {
    const agentId = input.agentId || 'build'
    const agent = Agent.getAgentDef(agentId)
    if (!agent) {
      throw new Error(`Agent "${agentId}" 不存在`)
    }

    const projectRoot = input.projectRoot || process.cwd()

    // 1. 加载 Skills
    const skills = await Skill.loadAll(projectRoot)

    // 2. 构建 System Prompt
    const buildOpts: Parameters<typeof SystemPrompt.build>[0] = {
      cwd: projectRoot,
      agent: agent.name,
      model: agent.model,
    }
    const systemPrompt = SystemPrompt.build(buildOpts)

    // 3. 解析工具列表（根据 agent.tools 过滤）
    const agentTools = ToolRegistry.resolve(agent.tools)
    const tools: Record<
      string,
      {
        description: string
        parameters: unknown
        execute: (args: unknown) => Promise<unknown>
      }
    > = {}

    for (const tool of agentTools) {
      tools[tool.name] = {
        description: tool.description,
        parameters: tool.parameters,
        execute: tool.execute,
      }
    }

    // 4. 创建会话
    const session = Session.create({
      modelId: agent.model,
      title: `${agent.name}: ${input.userMessage.slice(0, 50)}`,
    })

    // 5. 调用 SessionProcessor
    return SessionProcessor.process({
      sessionId: session.id,
      userMessage: input.userMessage,
      model: input.model,
      system: systemPrompt,
      tools,
      abortSignal: input.abortSignal,
    })
  }

  /**
   * 列出可用的 primary agents
   */
  export function listAvailable(): Agent.AgentDef[] {
    return Agent.listAgentDefs().filter((a) => a.mode === 'primary')
  }
}
