import { useKeyboard, useTerminalDimensions } from '@opentui/solid'
import { type Component, For, Show, createEffect, createSignal } from 'solid-js'
import { Session } from '../../../../core/src/session/index'
import { useRoute } from '../context/route'
import { Input } from '../ui/input'

// 会话页面组件
export const SessionView: Component<{ onExit?: () => void }> = (props) => {
  const { route, navigate } = useRoute()
  const dimensions = useTerminalDimensions()
  const [isProcessing, setIsProcessing] = createSignal(false)

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

  // 处理消息提交
  const handleSubmit = (text: string) => {
    const sess = session()
    if (!sess) return

    // 添加用户消息
    Session.addMessage(sess.id, {
      role: 'user',
      content: text,
    })

    // 标记为处理中
    setIsProcessing(true)

    // TODO: 接入 AI - 这里只是添加一个模拟回复
    setTimeout(() => {
      Session.addMessage(sess.id, {
        role: 'assistant',
        content: `[AI 功能待接入] 收到你的消息: ${text}`,
      })
      setIsProcessing(false)
    }, 500)
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

              {/* 处理中提示 */}
              <Show when={isProcessing()}>
                <box flexDirection="row" gap={1}>
                  <text fg="#888888">正在思考...</text>
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

            {/* 输入框 */}
            <Input placeholder="输入消息..." onSubmit={handleSubmit} onExit={props.onExit} />
          </>
        )}
      </Show>
    </box>
  )
}
