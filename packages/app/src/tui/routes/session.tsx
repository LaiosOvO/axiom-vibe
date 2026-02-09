/// <reference types="solid-js" />
import { useKeyboard, useTerminalDimensions } from '@opentui/solid'
import { type Component, For, Show, createSignal } from 'solid-js'
import { Agent } from '../../../../core/src/agent'
import { AiAdapter } from '../../../../core/src/provider/adapter'
import { ProviderFactory } from '../../../../core/src/provider/llm'
import { Session } from '../../../../core/src/session/index'
import { LLM } from '../../../../core/src/session/llm'
import { ToolRegistry } from '../../../../core/src/tool/index'
import { useRoute } from '../context/route'
import { ToolConfirm } from '../ui/confirm'
import { Input } from '../ui/input'

// 安全工具白名单 - 这些工具不需要用户确认
const SAFE_TOOLS = ['read', 'ls', 'glob', 'grep']

// 危险工具 - 需要用户确认
const DANGEROUS_TOOLS = ['write', 'edit', 'bash', 'webfetch']

// 工具调用状态
type ToolCallState = {
  toolCallId: string
  toolName: string
  input: unknown
}

// 会话页面组件
export const SessionView: Component<{ onExit?: () => void }> = (props) => {
  const { route, navigate } = useRoute()
  const dimensions = useTerminalDimensions()
  const [isProcessing, setIsProcessing] = createSignal(false)
  const [streamingText, setStreamingText] = createSignal('')
  const [error, setError] = createSignal<string | undefined>()
  const [pendingToolCall, setPendingToolCall] = createSignal<ToolCallState | undefined>()
  const [alwaysAllowTools, setAlwaysAllowTools] = createSignal<Set<string>>(new Set())

  // 获取当前会话
  const sessionId = () => {
    const r = route()
    return r.type === 'session' ? r.sessionId : undefined
  }

  const session = () => {
    const id = sessionId()
    return id ? Session.get(id) : undefined
  }

  // 键盘快捷键
  useKeyboard((event) => {
    // Esc 返回主页
    if (event.name === 'escape') {
      navigate({ type: 'home' })
      return
    }

    // Ctrl+C 退出
    if (event.ctrl && event.name === 'c') {
      props.onExit?.()
      return
    }
  })

  // 检查工具是否需要确认
  const needsConfirmation = (toolName: string): boolean => {
    if (SAFE_TOOLS.includes(toolName)) {
      return false
    }
    if (alwaysAllowTools().has(toolName)) {
      return false
    }
    return DANGEROUS_TOOLS.includes(toolName)
  }

  // 工具确认的 Promise resolver
  let toolConfirmResolve: ((allowed: boolean) => void) | undefined

  // 处理工具确认
  const handleToolAllow = async (toolCall: ToolCallState) => {
    setPendingToolCall(undefined)
    toolConfirmResolve?.(true)
  }

  const handleToolDeny = () => {
    setPendingToolCall(undefined)
    toolConfirmResolve?.(false)
  }

  const handleToolAlwaysAllow = async (toolCall: ToolCallState) => {
    setAlwaysAllowTools((prev) => {
      const newSet = new Set(prev)
      newSet.add(toolCall.toolName)
      return newSet
    })
    setPendingToolCall(undefined)
    toolConfirmResolve?.(true)
  }

  // 请求工具执行确认
  const requestToolConfirmation = async (
    toolName: string,
    toolCallId: string,
    input: unknown,
  ): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      toolConfirmResolve = resolve
      setPendingToolCall({
        toolCallId,
        toolName,
        input,
      })
    })
  }

  // 处理消息提交
  const handleSubmit = async (text: string) => {
    const sess = session()
    if (!sess || isProcessing()) return

    if (text.startsWith('/agent')) {
      const parts = text.trim().split(/\s+/)
      const agentId = parts[1]

      Session.addMessage(sess.id, {
        role: 'user',
        content: text,
      })

      if (!agentId) {
        const currentAgentId = sess.agentId || 'build'
        const currentAgent = Agent.getAgentDef(currentAgentId)
        const allAgents = Agent.listAgentDefs()

        const agentList = allAgents.map((a) => `  • ${a.id}: ${a.name}`).join('\n')
        const systemMessage = `当前 Agent: ${currentAgent?.name ?? currentAgentId}\n\n可用 Agents:\n${agentList}\n\n使用 /agent <id> 切换 Agent`

        Session.addMessage(sess.id, {
          role: 'assistant',
          content: systemMessage,
        })
      } else {
        const agent = Agent.getAgentDef(agentId)
        if (!agent) {
          const allAgents = Agent.listAgentDefs()
          const agentList = allAgents.map((a) => `  • ${a.id}: ${a.name}`).join('\n')
          const errorMessage = `❌ Agent "${agentId}" 不存在\n\n可用 Agents:\n${agentList}`

          Session.addMessage(sess.id, {
            role: 'assistant',
            content: errorMessage,
          })
        } else {
          sess.agentId = agentId

          const successMessage = `✅ 已切换到 Agent: ${agent.name}`
          Session.addMessage(sess.id, {
            role: 'assistant',
            content: successMessage,
          })

          Session.save(sess.id).catch((error) => {
            console.error('保存会话失败:', error)
          })
        }
      }
      return
    }

    // 添加用户消息
    Session.addMessage(sess.id, {
      role: 'user',
      content: text,
    })

    setIsProcessing(true)
    setStreamingText('')
    setError(undefined)

    try {
      // 解析 modelId
      const { providerId, modelName } = AiAdapter.parseModelId(sess.modelId)
      const model = ProviderFactory.getLanguageModel(providerId, modelName)

      // 构建工具列表，包装 execute 函数以支持用户确认
      const allTools = ToolRegistry.list()
      const tools: Record<
        string,
        {
          description: string
          parameters: unknown
          execute: (args: unknown) => Promise<unknown>
        }
      > = {}

      for (const tool of allTools) {
        const originalExecute = tool.execute
        tools[tool.name] = {
          description: tool.description,
          parameters: tool.parameters,
          execute: async (args: unknown) => {
            // 检查是否需要用户确认
            if (needsConfirmation(tool.name)) {
              const allowed = await requestToolConfirmation(tool.name, crypto.randomUUID(), args)
              if (!allowed) {
                throw new Error(`工具 ${tool.name} 被用户拒绝`)
              }
            }
            // 执行工具
            return originalExecute(args)
          },
        }
      }

      // 流式调用 LLM
      let currentAssistantMessage = ''
      const toolCalls: Array<{ id: string; name: string; arguments: unknown }> = []

      for await (const event of LLM.stream({
        model,
        messages: sess.messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        tools,
        system: ['你是 Axiom AI 助手，一个智能编码助手。'],
      })) {
        switch (event.type) {
          case 'text-delta':
            currentAssistantMessage += event.text
            setStreamingText(currentAssistantMessage)
            break

          case 'tool-call':
            toolCalls.push({
              id: event.toolCallId,
              name: event.toolName,
              arguments: event.input,
            })
            break

          case 'tool-result':
            // 工具执行完成
            break

          case 'finish':
            // 添加助手消息
            Session.addMessage(sess.id, {
              role: 'assistant',
              content: currentAssistantMessage || '(无响应)',
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            })
            break

          case 'error':
            throw event.error
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      setError(`错误: ${errorMessage}`)
    } finally {
      setIsProcessing(false)
      setStreamingText('')
    }
  }

  return (
    <box flexDirection="column" width={dimensions().width} height={dimensions().height} padding={2}>
      <Show
        when={session()}
        fallback={
          <box flexDirection="column">
            <text fg="#ff0000">会话未找到</text>
            <text fg="#888888">按 Esc 返回主页</text>
          </box>
        }
      >
        {(sess: () => NonNullable<ReturnType<typeof session>>) => (
          <>
            {/* 头部 - 会话标题 */}
            <box flexDirection="column" marginBottom={1}>
              <text fg="#00ff00" bold>
                {sess().title}
              </text>
              <text fg="#888888">模型: {sess().modelId}</text>
              <text fg="#888888">
                Agent: {(() => {
                  const agentId = sess().agentId
                  if (!agentId) return 'Build'
                  const agent = Agent.getAgentDef(agentId)
                  return agent?.name ?? agentId
                })()}
              </text>
            </box>

            {/* 分隔线 */}
            <box marginBottom={1}>
              <text fg="#444444">{'─'.repeat(dimensions().width - 4)}</text>
            </box>

            {/* 消息列表 */}
            <box flexDirection="column" gap={1} height={dimensions().height - 12} marginBottom={1}>
              <For each={sess().messages}>
                {(message) => (
                  <box flexDirection="column">
                    <text fg={message.role === 'user' ? '#00aaff' : '#00ff00'} bold>
                      {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
                    </text>
                    <text fg="#ffffff" marginLeft={2}>
                      {message.content}
                    </text>
                    {/* 显示 tool calls */}
                    <Show when={message.toolCalls && message.toolCalls.length > 0}>
                      <box flexDirection="column" marginLeft={2} marginTop={1}>
                        <text fg="#ffaa00">🔧 Tool Calls:</text>
                        <For each={message.toolCalls}>
                          {(tool) => (
                            <text fg="#888888" marginLeft={2}>
                              • {tool.name}()
                            </text>
                          )}
                        </For>
                      </box>
                    </Show>
                  </box>
                )}
              </For>

              {/* 流式生成中的文本 */}
              <Show when={isProcessing() && streamingText()}>
                <box flexDirection="column">
                  <text fg="#00ff00" bold>
                    🤖 Assistant
                  </text>
                  <text fg="#888888" marginLeft={2}>
                    {streamingText()}
                  </text>
                </box>
              </Show>

              {/* 处理中提示 */}
              <Show when={isProcessing() && !streamingText()}>
                <box flexDirection="row" gap={1}>
                  <text fg="#888888">正在思考...</text>
                </box>
              </Show>

              {/* 错误提示 */}
              <Show when={error()}>
                <box flexDirection="column">
                  <text fg="#ff0000" bold>
                    ❌ 错误
                  </text>
                  <text fg="#ff0000" marginLeft={2}>
                    {error()}
                  </text>
                </box>
              </Show>
            </box>

            {/* 分隔线 */}
            <box marginBottom={1}>
              <text fg="#444444">{'─'.repeat(dimensions().width - 4)}</text>
            </box>

            {/* 帮助文本 */}
            <box marginBottom={1}>
              <text fg="#888888">Esc 返回主页 | Ctrl+C 退出</text>
            </box>

            {/* 工具确认对话框 */}
            <Show when={pendingToolCall()}>
              {(toolCall: () => ToolCallState) => (
                <ToolConfirm
                  toolName={toolCall().toolName}
                  args={toolCall().input}
                  onAllow={() => handleToolAllow(toolCall())}
                  onDeny={handleToolDeny}
                  onAlwaysAllow={() => handleToolAlwaysAllow(toolCall())}
                />
              )}
            </Show>

            {/* 输入框 */}
            <Show when={!pendingToolCall()}>
              <Input placeholder="输入消息..." onSubmit={handleSubmit} onExit={props.onExit} />
            </Show>
          </>
        )}
      </Show>
    </box>
  )
}
