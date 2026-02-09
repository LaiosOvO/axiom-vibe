/// <reference types="solid-js" />
import { useKeyboard, useTerminalDimensions } from '@opentui/solid'
import { type Component, For, Show, createSignal } from 'solid-js'
import { Agent } from '../../../../core/src/agent'
import { Command } from '../../../../core/src/command'
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
  const [commandSuggestions, setCommandSuggestions] = createSignal<Command.Def[]>([])
  const [inputValue, setInputValue] = createSignal('')
  const [inputHistory, setInputHistory] = createSignal<string[]>([])
  const [historyIndex, setHistoryIndex] = createSignal(-1)

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

  const handleInputChange = (text: string) => {
    setInputValue(text)
    setHistoryIndex(-1)
    if (text.startsWith('/')) {
      const suggestions = Command.filterByPrefix(text)
      setCommandSuggestions(suggestions)
    } else {
      setCommandSuggestions([])
    }
  }

  // Tab 补全：选中第一个匹配的命令
  const handleTab = (): string | undefined => {
    const suggestions = commandSuggestions()
    if (suggestions.length > 0 && suggestions[0]) {
      const completed = `/${suggestions[0].name} `
      setCommandSuggestions([])
      return completed
    }
    return undefined
  }

  // 上箭头：浏览输入历史
  const handleArrowUp = (): string | undefined => {
    const history = inputHistory()
    if (history.length === 0) return undefined
    const newIndex = Math.min(historyIndex() + 1, history.length - 1)
    setHistoryIndex(newIndex)
    return history[newIndex]
  }

  // 下箭头：浏览输入历史
  const handleArrowDown = (): string | undefined => {
    const newIndex = historyIndex() - 1
    if (newIndex < 0) {
      setHistoryIndex(-1)
      return ''
    }
    setHistoryIndex(newIndex)
    return inputHistory()[newIndex] ?? ''
  }

  // 把提交的文本加入历史
  const addToHistory = (text: string) => {
    const history = inputHistory()
    if (history[0] === text) return
    setInputHistory([text, ...history].slice(0, 50))
  }

  const handleSubmit = async (text: string) => {
    const sess = session()
    if (!sess || isProcessing()) return

    addToHistory(text)
    setHistoryIndex(-1)
    setCommandSuggestions([])
    setInputValue('')

    // 检查是否是命令
    if (text.startsWith('/')) {
      Session.addMessage(sess.id, {
        role: 'user',
        content: text,
      })

      const result = await Command.execute(text, {
        sessionId: sess.id,
        currentAgent: sess.agentId,
        currentModel: sess.modelId,
      })

      if (result) {
        Session.addMessage(sess.id, {
          role: 'assistant',
          content: result.message,
        })

        // 处理命令动作
        if (result.action === 'quit') {
          props.onExit?.()
        } else if (result.action === 'navigate-home') {
          navigate({ type: 'home' })
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

            {/* 命令提示 */}
            <Show when={commandSuggestions().length > 0}>
              <box flexDirection="column" marginBottom={1}>
                <text fg="#888888">可用命令:</text>
                <For each={commandSuggestions()}>
                  {(cmd) => (
                    <box flexDirection="row" marginLeft={2}>
                      <text fg="#00aaff">{cmd.usage}</text>
                      <text fg="#888888" marginLeft={2}>
                        - {cmd.description}
                      </text>
                    </box>
                  )}
                </For>
              </box>
            </Show>

            {/* 帮助文本 */}
            <box marginBottom={1}>
              <text fg="#888888">Esc 返回主页 | Ctrl+C 退出 | / 显示命令</text>
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
              <Input
                placeholder="输入消息... (/ 显示命令, Tab 补全)"
                onSubmit={handleSubmit}
                onExit={props.onExit}
                onChange={handleInputChange}
                onTab={handleTab}
                onArrowUp={handleArrowUp}
                onArrowDown={handleArrowDown}
              />
            </Show>
          </>
        )}
      </Show>
    </box>
  )
}
