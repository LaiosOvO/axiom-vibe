import { useKeyboard } from '@opentui/solid'
import { type Component, createSignal, onMount } from 'solid-js'

interface InputProps {
  placeholder?: string
  onSubmit: (text: string) => void
  onExit?: () => void
}

// 简单的输入组件
export const Input: Component<InputProps> = (props) => {
  const [value, setValue] = createSignal('')
  const [cursorPos, setCursorPos] = createSignal(0)

  useKeyboard((event) => {
    // Ctrl+C 退出
    if (event.ctrl && event.name === 'c') {
      props.onExit?.()
      return
    }

    // Enter 发送消息
    if (event.name === 'return' && !event.shift) {
      const text = value().trim()
      if (text) {
        props.onSubmit(text)
        setValue('')
        setCursorPos(0)
      }
      return
    }

    // Backspace 删除
    if (event.name === 'backspace') {
      const pos = cursorPos()
      if (pos > 0) {
        const current = value()
        setValue(current.slice(0, pos - 1) + current.slice(pos))
        setCursorPos(pos - 1)
      }
      return
    }

    // Delete 删除光标后的字符
    if (event.name === 'delete') {
      const pos = cursorPos()
      const current = value()
      if (pos < current.length) {
        setValue(current.slice(0, pos) + current.slice(pos + 1))
      }
      return
    }

    // 左箭头
    if (event.name === 'left') {
      setCursorPos(Math.max(0, cursorPos() - 1))
      return
    }

    // 右箭头
    if (event.name === 'right') {
      setCursorPos(Math.min(value().length, cursorPos() + 1))
      return
    }

    // Home 键
    if (event.name === 'home') {
      setCursorPos(0)
      return
    }

    // End 键
    if (event.name === 'end') {
      setCursorPos(value().length)
      return
    }

    // 普通字符输入
    if (event.sequence && event.sequence.length === 1) {
      const pos = cursorPos()
      const current = value()
      setValue(current.slice(0, pos) + event.sequence + current.slice(pos))
      setCursorPos(pos + 1)
    }
  })

  return (
    <box flexDirection="row" gap={1} paddingX={1}>
      <text fg="#888888">{'>'}</text>
      <text>{value() || props.placeholder || ''}</text>
      <text fg="#00ff00">_</text>
    </box>
  )
}
