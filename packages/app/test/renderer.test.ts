import { describe, test, expect } from 'bun:test'
import { MessageRenderer } from '../src/index'

describe('MessageRenderer', () => {
  test('render user message with prefix', () => {
    const message = { role: 'user', content: 'Hello' }
    const result = MessageRenderer.render(message)
    expect(result).toContain('👤 You')
    expect(result).toContain('Hello')
  })

  test('render assistant message with prefix', () => {
    const message = { role: 'assistant', content: 'Hi there' }
    const result = MessageRenderer.render(message)
    expect(result).toContain('🤖 Assistant')
    expect(result).toContain('Hi there')
  })

  test('render system message with prefix', () => {
    const message = { role: 'system', content: 'System message' }
    const result = MessageRenderer.render(message)
    expect(result).toContain('⚙️ System')
    expect(result).toContain('System message')
  })

  test('render tool message with prefix', () => {
    const message = { role: 'tool', content: 'Tool output' }
    const result = MessageRenderer.render(message)
    expect(result).toContain('🔧 Tool')
    expect(result).toContain('Tool output')
  })

  test('renderConversation joins multiple messages', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]
    const result = MessageRenderer.renderConversation(messages)
    expect(result).toContain('👤 You')
    expect(result).toContain('Hello')
    expect(result).toContain('🤖 Assistant')
    expect(result).toContain('Hi')
  })

  test('renderCodeBlock wraps code with borders', () => {
    const code = 'console.log("hello")'
    const result = MessageRenderer.renderCodeBlock(code, 'javascript')
    expect(result).toContain('┌─ javascript')
    expect(result).toContain('│ console.log("hello")')
    expect(result).toContain('└')
  })

  test('renderCodeBlock handles multiline code', () => {
    const code = 'function test() {\n  return 42\n}'
    const result = MessageRenderer.renderCodeBlock(code, 'typescript')
    expect(result).toContain('┌─ typescript')
    expect(result).toContain('│ function test() {')
    expect(result).toContain('│   return 42')
    expect(result).toContain('│ }')
  })

  test('renderSystemInfo includes all fields', () => {
    const info = {
      version: '1.0.0',
      model: 'gpt-4',
      sessionId: 'sess-123',
    }
    const result = MessageRenderer.renderSystemInfo(info)
    expect(result).toContain('⚙️ System Info')
    expect(result).toContain('Version: 1.0.0')
    expect(result).toContain('Model: gpt-4')
    expect(result).toContain('Session ID: sess-123')
  })
})
