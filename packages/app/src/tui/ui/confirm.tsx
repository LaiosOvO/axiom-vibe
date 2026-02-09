/// <reference types="solid-js" />
import { useKeyboard } from '@opentui/solid'
import { type Component, For, createSignal } from 'solid-js'

interface ToolConfirmProps {
  toolName: string
  args: unknown
  onAllow: () => void
  onDeny: () => void
  onAlwaysAllow: () => void
}

/**
 * 工具确认对话框组件
 * 用于危险操作（如 bash、write、edit、webfetch）的用户确认
 */
export const ToolConfirm: Component<ToolConfirmProps> = (props) => {
  const [selectedOption, setSelectedOption] = createSignal(0)
  const options = ['允许 (A)', '拒绝 (D)', '始终允许 (Y)']

  useKeyboard((event) => {
    // 上箭头 - 选择上一个选项
    if (event.name === 'up') {
      setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1))
      return
    }

    // 下箭头 - 选择下一个选项
    if (event.name === 'down') {
      setSelectedOption((prev) => (prev < options.length - 1 ? prev + 1 : 0))
      return
    }

    // Enter - 确认选择
    if (event.name === 'return') {
      const selected = selectedOption()
      if (selected === 0) {
        props.onAllow()
      } else if (selected === 1) {
        props.onDeny()
      } else if (selected === 2) {
        props.onAlwaysAllow()
      }
      return
    }

    // 快捷键
    if (event.name === 'a' || event.name === 'A') {
      props.onAllow()
      return
    }
    if (event.name === 'd' || event.name === 'D') {
      props.onDeny()
      return
    }
    if (event.name === 'y' || event.name === 'Y') {
      props.onAlwaysAllow()
      return
    }
  })

  // 格式化参数显示
  const formatArgs = () => {
    try {
      return JSON.stringify(props.args, null, 2)
    } catch {
      return String(props.args)
    }
  }

  return (
    <box flexDirection="column" gap={1} padding={2}>
      {/* 标题 */}
      <text fg="#ffaa00" bold>
        ⚠️ 工具执行确认
      </text>

      {/* 工具信息 */}
      <box flexDirection="column" marginTop={1}>
        <text fg="#ffffff">
          工具名称: <text fg="#00ff00">{props.toolName}</text>
        </text>
        <text fg="#888888" marginTop={1}>
          参数:
        </text>
        <text fg="#888888" marginLeft={2}>
          {formatArgs()}
        </text>
      </box>

      {/* 选项列表 */}
      <box flexDirection="column" marginTop={1} gap={1}>
        <For each={options}>
          {(option, index) => (
            <text
              fg={selectedOption() === index() ? '#00ff00' : '#ffffff'}
              bold={selectedOption() === index()}
            >
              {selectedOption() === index() ? '► ' : '  '}
              {option}
            </text>
          )}
        </For>
      </box>

      {/* 提示文本 */}
      <text fg="#888888" marginTop={1}>
        使用 ↑/↓ 选择，Enter 确认，或按快捷键 A/D/Y
      </text>
    </box>
  )
}
