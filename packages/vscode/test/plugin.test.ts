import { describe, expect, test } from 'bun:test'
import { VscodePlugin } from '../src/index'

describe('VscodePlugin.Config', () => {
  test('getDefaultConfig 返回默认配置', () => {
    const config = VscodePlugin.getDefaultConfig()
    expect(config.serverPort).toBe(4096)
    expect(config.autoStart).toBe(true)
    expect(config.panelTitle).toBe('Axiom AI')
    expect(config.showInStatusBar).toBe(true)
  })

  test('Config.parse 验证有效配置', () => {
    const config = VscodePlugin.Config.parse({
      serverPort: 5000,
      autoStart: false,
      panelTitle: 'Test',
      showInStatusBar: false,
    })
    expect(config.serverPort).toBe(5000)
    expect(config.autoStart).toBe(false)
  })
})

describe('VscodePlugin.Command', () => {
  test('getCommands 返回命令列表', () => {
    const commands = VscodePlugin.getCommands()
    expect(commands.length).toBeGreaterThan(0)
    expect(commands.every((cmd) => cmd.id && cmd.title)).toBe(true)
  })

  test('getCommands 包含 axiom.open 命令', () => {
    const commands = VscodePlugin.getCommands()
    const openCmd = commands.find((cmd) => cmd.id === 'axiom.open')
    expect(openCmd).toBeDefined()
    expect(openCmd?.title).toBe('打开 Axiom 面板')
  })

  test('generateContributes 生成命令配置', () => {
    const commands = VscodePlugin.getCommands()
    const config = VscodePlugin.getDefaultConfig()
    const contributes = VscodePlugin.generateContributes(commands, config) as {
      commands: Array<{ command: string; title: string }>
    }
    expect(contributes.commands.length).toBe(commands.length)
  })
})

describe('VscodePlugin.ExtensionState', () => {
  test('getInitialState 返回正确初始状态', () => {
    const state = VscodePlugin.getInitialState()
    expect(state.panelState).toBe('hidden')
    expect(state.serverConnected).toBe(false)
    expect(state.serverUrl).toBe('http://127.0.0.1:4096')
    expect(state.currentSessionId).toBeUndefined()
  })

  test('getInitialState 接受自定义配置', () => {
    const state = VscodePlugin.getInitialState({ serverPort: 5000 })
    expect(state.serverUrl).toBe('http://127.0.0.1:5000')
    expect(state.config.serverPort).toBe(5000)
  })

  test('handleCommand axiom.open 切换面板', () => {
    const initial = VscodePlugin.getInitialState()
    const opened = VscodePlugin.handleCommand(initial, 'axiom.open')
    expect(opened.panelState).toBe('visible')
  })

  test('handleCommand axiom.togglePanel 隐藏已显示面板', () => {
    const initial = VscodePlugin.getInitialState()
    const opened = VscodePlugin.handleCommand(initial, 'axiom.togglePanel')
    expect(opened.panelState).toBe('visible')
    const closed = VscodePlugin.handleCommand(opened, 'axiom.togglePanel')
    expect(closed.panelState).toBe('hidden')
  })

  test('handleCommand axiom.newSession 清除 sessionId', () => {
    const initial = VscodePlugin.getInitialState()
    const withSession = { ...initial, currentSessionId: 'old-session' }
    const newSession = VscodePlugin.handleCommand(withSession, 'axiom.newSession')
    expect(newSession.currentSessionId).toBeUndefined()
    expect(newSession.panelState).toBe('visible')
  })

  test('handleCommand 未知命令返回原状态', () => {
    const initial = VscodePlugin.getInitialState()
    const unchanged = VscodePlugin.handleCommand(initial, 'unknown.command')
    expect(unchanged).toEqual(initial)
  })
})

describe('VscodePlugin.PackageJson', () => {
  test('generatePackageJsonContributes 包含 commands', () => {
    const config = VscodePlugin.getDefaultConfig()
    const contributes = VscodePlugin.generatePackageJsonContributes(config) as {
      commands: Array<{ command: string; title: string; category: string }>
    }
    expect(contributes.commands.length).toBeGreaterThan(0)
    expect(contributes.commands[0]).toHaveProperty('command')
    expect(contributes.commands[0]).toHaveProperty('title')
  })

  test('generatePackageJsonContributes 包含 keybindings', () => {
    const config = VscodePlugin.getDefaultConfig()
    const contributes = VscodePlugin.generatePackageJsonContributes(config) as {
      keybindings: Array<{ command: string; key: string }>
    }
    expect(contributes.keybindings.length).toBeGreaterThan(0)
    expect(contributes.keybindings[0]).toHaveProperty('key')
  })

  test('generatePackageJsonContributes 包含 views', () => {
    const config = VscodePlugin.getDefaultConfig()
    const contributes = VscodePlugin.generatePackageJsonContributes(config) as {
      viewsContainers: { activitybar: Array<{ id: string }> }
      views: { 'axiom-sidebar': Array<{ id: string }> }
    }
    expect(contributes.viewsContainers).toBeDefined()
    expect(contributes.views).toBeDefined()
    expect(contributes.views['axiom-sidebar'].length).toBeGreaterThan(0)
  })

  test('generatePackageJsonContributes 包含 configuration', () => {
    const config = VscodePlugin.getDefaultConfig()
    const contributes = VscodePlugin.generatePackageJsonContributes(config) as {
      configuration: {
        properties: {
          'axiom.serverPort': { type: string; default: number }
          'axiom.autoStart': { type: string; default: boolean }
        }
      }
    }
    expect(contributes.configuration).toBeDefined()
    expect(contributes.configuration.properties['axiom.serverPort']).toBeDefined()
    expect(contributes.configuration.properties['axiom.autoStart']).toBeDefined()
  })
})

describe('VscodePlugin.WebView', () => {
  test('generateWebViewHtml 返回有效 HTML', () => {
    const state = VscodePlugin.getInitialState()
    const html = VscodePlugin.generateWebViewHtml(state)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('</html>')
  })

  test('generateWebViewHtml 包含标题', () => {
    const state = VscodePlugin.getInitialState({ panelTitle: 'Test Title' })
    const html = VscodePlugin.generateWebViewHtml(state)
    expect(html).toContain('<title>Test Title</title>')
  })

  test('generateWebViewHtml 未连接时显示未连接状态', () => {
    const state = VscodePlugin.getInitialState()
    const html = VscodePlugin.generateWebViewHtml(state)
    expect(html).toContain('未连接')
    expect(html).toContain('disabled')
  })

  test('generateWebViewHtml 已连接时显示已连接状态', () => {
    const state = VscodePlugin.getInitialState()
    const connected = { ...state, serverConnected: true }
    const html = VscodePlugin.generateWebViewHtml(connected)
    expect(html).toContain('已连接到 Axiom 服务器')
    expect(html).not.toContain('disabled')
  })

  test('generateWebViewHtml 包含输入区域', () => {
    const state = VscodePlugin.getInitialState()
    const html = VscodePlugin.generateWebViewHtml(state)
    expect(html).toContain('id="input-area"')
    expect(html).toContain('<input')
    expect(html).toContain('<button')
  })

  test('generateWebViewHtml 包含消息区域', () => {
    const state = VscodePlugin.getInitialState()
    const html = VscodePlugin.generateWebViewHtml(state)
    expect(html).toContain('id="messages"')
    expect(html).toContain('id="chat"')
  })
})
