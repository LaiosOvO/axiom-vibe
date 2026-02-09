/// <reference types="solid-js" />
import { useKeyboard } from '@opentui/solid'
import { type Component, createSignal } from 'solid-js'

interface InputProps {
  placeholder?: string
  onSubmit: (text: string) => void
  onExit?: () => void
  onChange?: (text: string) => void
  /** Tab 键回调，返回补全文本则替换当前输入 */
  onTab?: () => string | undefined
  /** 上箭头回调，返回历史文本则替换当前输入 */
  onArrowUp?: () => string | undefined
  /** 下箭头回调，返回历史文本则替换当前输入 */
  onArrowDown?: () => string | undefined
}

// 输入组件 — 支持 Tab 补全、上下箭头历史浏览
export const Input: Component<InputProps> = (props) => {
  const [value, setValue] = createSignal('')
  const [cursorPos, setCursorPos] = createSignal(0)

  // 设置输入值并同步光标和 onChange
  const setInput = (newValue: string, cursor?: number) => {
    setValue(newValue)
    setCursorPos(cursor ?? newValue.length)
    props.onChange?.(newValue)
  }

  useKeyboard((event) => {
    // Ctrl+C 退出
    if (event.ctrl && event.name === 'c') {
      props.onExit?.()
      return
    }

    // Tab 键 — 命令补全
    if (event.name === 'tab') {
      const completed = props.onTab?.()
      if (completed !== undefined) {
        setInput(completed)
      }
      return
    }

    // 上箭头 — 浏览历史
    if (event.name === 'up') {
      const historyText = props.onArrowUp?.()
      if (historyText !== undefined) {
        setInput(historyText)
      }
      return
    }

    // 下箭头 — 浏览历史
    if (event.name === 'down') {
      const historyText = props.onArrowDown?.()
      if (historyText !== undefined) {
        setInput(historyText)
      }
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
        const newValue = current.slice(0, pos - 1) + current.slice(pos)
        setValue(newValue)
        setCursorPos(pos - 1)
        props.onChange?.(newValue)
      }
      return
    }

    // Delete 删除光标后的字符
    if (event.name === 'delete') {
      const pos = cursorPos()
      const current = value()
      if (pos < current.length) {
        const newValue = current.slice(0, pos) + current.slice(pos + 1)
        setValue(newValue)
        props.onChange?.(newValue)
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
      const newValue = current.slice(0, pos) + event.sequence + current.slice(pos)
      setValue(newValue)
      setCursorPos(pos + 1)
      props.onChange?.(newValue)
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
