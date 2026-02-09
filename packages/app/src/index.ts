export namespace MessageRenderer {
  export function render(message: { role: string; content: string }): string {
    const rolePrefix = getRolePrefix(message.role)
    return `${rolePrefix}\n${message.content}`
  }

  export function renderConversation(messages: { role: string; content: string }[]): string {
    return messages.map((msg) => render(msg)).join('\n\n')
  }

  export function renderCodeBlock(code: string, language?: string): string {
    const lang = language || 'text'
    const lines = code.split('\n')
    const maxLength = Math.max(...lines.map((l) => l.length), lang.length + 4)
    const border = '─'.repeat(maxLength + 2)

    const header = `┌─ ${lang} ${border.slice(lang.length + 4)}`
    const footer = `└${border}`

    const body = lines.map((line) => `│ ${line}`).join('\n')

    return `${header}\n${body}\n${footer}`
  }

  export function renderSystemInfo(info: {
    version: string
    model: string
    sessionId: string
  }): string {
    const lines = [
      '⚙️ System Info',
      `Version: ${info.version}`,
      `Model: ${info.model}`,
      `Session ID: ${info.sessionId}`,
    ]
    return lines.join('\n')
  }

  function getRolePrefix(role: string): string {
    switch (role) {
      case 'user':
        return '👤 You'
      case 'assistant':
        return '🤖 Assistant'
      case 'system':
        return '⚙️ System'
      case 'tool':
        return '🔧 Tool'
      default:
        return `${role}`
    }
  }
}
