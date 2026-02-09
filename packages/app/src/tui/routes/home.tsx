import { useKeyboard, useTerminalDimensions } from '@opentui/solid'
import { type Component, For, createSignal } from 'solid-js'
import { NAME, VERSION } from '../../../../core/src/index'
import { Provider } from '../../../../core/src/provider/index'
import { Session } from '../../../../core/src/session/index'
import { useRoute } from '../context/route'
import { Input } from '../ui/input'

// 主页组件
export const Home: Component<{ onExit?: () => void }> = (props) => {
  const { navigate } = useRoute()
  const dimensions = useTerminalDimensions()
  const [selectedIndex, setSelectedIndex] = createSignal(0)

  // 获取可用 provider 列表
  const availableProviders = Provider.getAvailable()

  // 获取最近会话列表（最多 5 个）
  const recentSessions = Session.list()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)

  // 键盘快捷键
  useKeyboard((event) => {
    // q 退出
    if (event.name === 'q' && !event.ctrl) {
      props.onExit?.()
      return
    }

    // Ctrl+C 退出
    if (event.ctrl && event.name === 'c') {
      props.onExit?.()
      return
    }

    // 上下箭头选择会话
    if (event.name === 'up') {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
      return
    }

    if (event.name === 'down') {
      setSelectedIndex((prev) => Math.min(recentSessions.length - 1, prev + 1))
      return
    }

    // Enter 打开选中的会话
    if (event.name === 'return' && recentSessions.length > 0) {
      const session = recentSessions[selectedIndex()]
      if (session) {
        navigate({ type: 'session', sessionId: session.id })
      }
    }
  })

  // 处理新消息提交
  const handleSubmit = (text: string) => {
    // 创建新会话
    const modelId = process.env.AXIOM_MODEL ?? 'anthropic/claude-3-5-sonnet-20241022'
    const session = Session.create({ modelId, title: text.slice(0, 50) })

    // 添加用户消息
    Session.addMessage(session.id, {
      role: 'user',
      content: text,
    })

    // 导航到会话页面
    navigate({ type: 'session', sessionId: session.id })
  }

  return (
    <box flexDirection="column" width={dimensions().width} height={dimensions().height} padding={2}>
      {/* 头部 - Axiom 标题 */}
      <box flexDirection="column" marginBottom={1}>
        <text fg="#00ff00" bold>
          {NAME} v{VERSION}
        </text>
        <text fg="#888888">AI 驱动的编码 Agent 平台</text>
      </box>

      {/* 分隔线 */}
      <box marginBottom={1}>
        <text fg="#444444">{'─'.repeat(dimensions().width - 4)}</text>
      </box>

      {/* 状态信息 */}
      <box flexDirection="column" marginBottom={2}>
        <text fg="#888888">可用 Provider: {availableProviders.length} 个</text>
        <text fg="#888888">最近会话: {recentSessions.length} 个</text>
      </box>

      {/* Provider 列表 */}
      {availableProviders.length > 0 && (
        <box flexDirection="column" marginBottom={2}>
          <text fg="#00ff00" marginBottom={1}>
            已配置的 Provider:
          </text>
          <For each={availableProviders.slice(0, 3)}>
            {(provider) => (
              <text fg="#ffffff" marginLeft={2}>
                • {provider.name} ({provider.models[0]})
              </text>
            )}
          </For>
          {availableProviders.length > 3 && (
            <text fg="#888888" marginLeft={2}>
              ... 还有 {availableProviders.length - 3} 个
            </text>
          )}
        </box>
      )}

      {/* 最近会话列表 */}
      {recentSessions.length > 0 && (
        <box flexDirection="column" marginBottom={2}>
          <text fg="#00ff00" marginBottom={1}>
            最近会话:
          </text>
          <For each={recentSessions}>
            {(session, index) => (
              <text
                fg={index() === selectedIndex() ? '#ffffff' : '#888888'}
                bg={index() === selectedIndex() ? '#333333' : undefined}
                marginLeft={2}
              >
                {index() === selectedIndex() ? '▶ ' : '  '}
                {session.title}
              </text>
            )}
          </For>
        </box>
      )}

      {/* 分隔线 */}
      <box marginBottom={1}>
        <text fg="#444444">{'─'.repeat(dimensions().width - 4)}</text>
      </box>

      {/* 帮助文本 */}
      <box flexDirection="column" marginBottom={1}>
        <text fg="#888888">输入消息开始新会话</text>
        <text fg="#888888">↑↓ 选择会话 | Enter 打开 | q 或 Ctrl+C 退出</text>
      </box>

      {/* 输入框 */}
      <Input placeholder="输入你的问题..." onSubmit={handleSubmit} onExit={props.onExit} />
    </box>
  )
}
