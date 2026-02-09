import type { LanguageModel } from 'ai'
import { Permission } from '../permission'
import { Session } from './index'
import { LLM } from './llm'

/**
 * SessionProcessor 命名空间 - 处理 LLM 交互的 agent loop
 */
export namespace SessionProcessor {
  /**
   * 处理输入配置
   */
  export type ProcessInput = {
    /** 会话 ID */
    sessionId: string
    /** 用户消息内容 */
    userMessage: string
    /** 语言模型 */
    model: LanguageModel
    /** 系统提示词（可选） */
    system?: string[]
    /** 工具定义（可选） */
    tools?: Record<
      string,
      {
        description: string
        parameters: unknown
        execute: (args: unknown) => Promise<unknown>
      }
    >
    /** 最大生成 token 数 */
    maxOutputTokens?: number
    /** 温度参数 */
    temperature?: number
    /** 中止信号 */
    abortSignal?: AbortSignal
    /** 权限规则（可选，未提供时默认全部 allow） */
    permissionRules?: Permission.PermissionRule[]
    /** 工具调用历史（用于 doom loop 检测） */
    toolCallHistory?: Permission.ToolCallRecord[]
    /** 项目根目录（用于 spec 操作） */
    projectRoot?: string
    /** 当前活跃的 spec change 名称 */
    specChangeName?: string
  }

  /**
   * 处理结果
   */
  export type ProcessResult = {
    /** 助手消息 */
    assistantMessage: Session.Message
    /** 总使用量 */
    usage: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
    }
    /** 完成原因 */
    finishReason: string
    /** spec 是否被推进 */
    specAdvanced?: boolean
    /** 当前 spec 阶段 */
    specPhase?: string
  }

  /**
   * 处理函数 - 实现 agent loop
   * 1. 发送用户消息
   * 2. 调用 LLM.stream 获取响应
   * 3. 处理 tool calls: 执行工具 -> 添加结果到消息 -> 继续循环
   * 4. 收集文本响应
   * 5. 返回最终结果
   */
  export async function process(input: ProcessInput): Promise<ProcessResult> {
    const session = Session.get(input.sessionId)
    if (!session) {
      throw new Error(`会话 ${input.sessionId} 不存在`)
    }

    // 添加用户消息到会话
    Session.addMessage(input.sessionId, {
      role: 'user',
      content: input.userMessage,
    })

    // 准备消息历史（转换 Session.Message -> LLM 格式）
    const messages = session.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))

    // Agent loop: 循环直到没有 tool calls
    let continueLoop = true
    let assistantContent = ''
    const totalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
    let lastFinishReason = 'stop'

    const toolCallHistory: Permission.ToolCallRecord[] = input.toolCallHistory || []
    const permissionRules = input.permissionRules || [{ tool: '*', action: 'allow' as const }]

    while (continueLoop) {
      const toolCalls: Array<{ id: string; name: string; arguments: unknown }> = []
      const toolResults: Array<{ callId: string; result: unknown }> = []
      let currentStepContent = ''

      try {
        // 调用 LLM.stream
        for await (const event of LLM.stream({
          model: input.model,
          system: input.system,
          messages,
          tools: input.tools,
          maxOutputTokens: input.maxOutputTokens,
          temperature: input.temperature,
          abortSignal: input.abortSignal,
        })) {
          switch (event.type) {
            case 'text-delta':
              // 累积文本内容
              currentStepContent += event.text
              break

            case 'tool-call':
              // 记录 tool call
              toolCalls.push({
                id: event.toolCallId,
                name: event.toolName,
                arguments: event.input,
              })
              break

            case 'tool-result':
              // 记录 tool result
              toolResults.push({
                callId: event.toolCallId,
                result: event.output,
              })
              break

            case 'finish':
              // 累积使用量
              totalUsage.inputTokens += event.usage.inputTokens
              totalUsage.outputTokens += event.usage.outputTokens
              totalUsage.totalTokens += event.usage.totalTokens
              break

            case 'error':
              throw event.error
          }
        }

        // 如果有文本内容,添加到助手回复
        if (currentStepContent) {
          assistantContent += currentStepContent
        }

        // 如果有 tool calls,处理它们
        if (toolCalls.length > 0) {
          // 添加助手消息（包含 tool calls）
          const assistantMsg = Session.addMessage(input.sessionId, {
            role: 'assistant',
            content: currentStepContent || '',
            toolCalls,
          })

          // 执行所有 tool calls
          for (const toolCall of toolCalls) {
            try {
              const toolDef = input.tools?.[toolCall.name]
              if (!toolDef) {
                throw new Error(`工具 ${toolCall.name} 不存在`)
              }

              const args = toolCall.arguments as Record<string, unknown>

              const permissionAction = Permission.evaluate(permissionRules, toolCall.name, args)
              if (permissionAction === 'deny') {
                Session.addMessage(input.sessionId, {
                  role: 'tool',
                  content: `权限拒绝: 工具 ${toolCall.name} 被禁止执行`,
                  toolResults: [
                    {
                      callId: toolCall.id,
                      result: { error: `权限拒绝: 工具 ${toolCall.name} 被禁止执行` },
                    },
                  ],
                })
                continue
              }

              if (permissionAction === 'ask') {
                Session.addMessage(input.sessionId, {
                  role: 'tool',
                  content: `权限待确认: 工具 ${toolCall.name} 需要用户确认`,
                  toolResults: [
                    {
                      callId: toolCall.id,
                      result: { error: `权限待确认: 工具 ${toolCall.name} 需要用户确认` },
                    },
                  ],
                })
                continue
              }

              if (Permission.checkDoomLoop(toolCallHistory, toolCall.name, args)) {
                Session.addMessage(input.sessionId, {
                  role: 'tool',
                  content: `检测到重复调用: 工具 ${toolCall.name} 在短时间内重复调用次数过多`,
                  toolResults: [
                    {
                      callId: toolCall.id,
                      result: {
                        error: `检测到重复调用: 工具 ${toolCall.name} 在短时间内重复调用次数过多`,
                      },
                    },
                  ],
                })
                continue
              }

              const result = await toolDef.execute(toolCall.arguments)

              toolCallHistory.push({
                toolName: toolCall.name,
                args,
                timestamp: Date.now(),
              })

              Session.addMessage(input.sessionId, {
                role: 'tool',
                content: JSON.stringify(result),
                toolResults: [
                  {
                    callId: toolCall.id,
                    result,
                  },
                ],
              })
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              Session.addMessage(input.sessionId, {
                role: 'tool',
                content: `错误: ${errorMessage}`,
                toolResults: [
                  {
                    callId: toolCall.id,
                    result: { error: errorMessage },
                  },
                ],
              })
            }
          }

          // 更新消息历史,继续循环
          const updatedSession = Session.get(input.sessionId)
          if (updatedSession) {
            messages.length = 0
            messages.push(
              ...updatedSession.messages.map((msg) => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content,
              })),
            )
          }
        } else {
          // 没有 tool calls,结束循环
          continueLoop = false
        }
      } catch (error) {
        // 错误处理
        continueLoop = false
        const errorMessage = error instanceof Error ? error.message : String(error)
        assistantContent += `\n\n错误: ${errorMessage}`
        lastFinishReason = 'error'
      }
    }

    // 添加最终的助手消息（如果还没有添加）
    const finalMessage = Session.addMessage(input.sessionId, {
      role: 'assistant',
      content: assistantContent,
    })

    let specAdvanced = false
    let specPhase: string | undefined

    if (input.projectRoot && input.specChangeName) {
      try {
        const { SpecEngine } = await import('../spec')
        const change = await SpecEngine.getChange(input.projectRoot, input.specChangeName)
        if (change) {
          specPhase = change.phase
          if (change.tasks?.every((t) => t.status === 'done')) {
            specPhase = await SpecEngine.advancePhase(input.projectRoot, input.specChangeName)
            specAdvanced = true
          }
        }
      } catch {
        // spec 操作失败不影响主流程
      }
    }

    return {
      assistantMessage: finalMessage,
      usage: totalUsage,
      finishReason: lastFinishReason,
      specAdvanced,
      specPhase,
    }
  }
}
