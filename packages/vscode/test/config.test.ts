import { describe, expect, test } from 'bun:test'
import { VscodePlugin } from '../src/index'

describe('VscodePlugin', () => {
  describe('getCommands', () => {
    test('返回至少 4 个命令', () => {
      const commands = VscodePlugin.getCommands()
      expect(commands.length).toBeGreaterThanOrEqual(4)
    })

    test('命令包含正确的 id 和 title', () => {
      const commands = VscodePlugin.getCommands()
      const commandIds = commands.map((cmd) => cmd.id)
      expect(commandIds).toContain('axiom.open')
      expect(commandIds).toContain('axiom.newSession')
      expect(commandIds).toContain('axiom.sendMessage')
      expect(commandIds).toContain('axiom.togglePanel')
    })

    test('命令包含 keybinding', () => {
      const commands = VscodePlugin.getCommands()
      const commandWithKeybinding = commands.filter((cmd) => cmd.keybinding)
      expect(commandWithKeybinding.length).toBeGreaterThan(0)
    })
  })

  describe('generateContributes', () => {
    test('返回含 commands 和 keybindings 的对象', () => {
      const commands = VscodePlugin.getCommands()
      const config = VscodePlugin.getDefaultConfig()
      const contributes = VscodePlugin.generateContributes(commands, config)

      expect(contributes).toHaveProperty('commands')
      expect(contributes).toHaveProperty('keybindings')
    })

    test('commands 数组包含所有命令', () => {
      const commands = VscodePlugin.getCommands()
      const config = VscodePlugin.getDefaultConfig()
      const contributes = VscodePlugin.generateContributes(commands, config)

      const contributesObj = contributes as {
        commands: Array<{ command: string; title: string; category: string }>
      }
      expect(contributesObj.commands.length).toBe(commands.length)
      expect(contributesObj.commands[0]).toHaveProperty('command')
      expect(contributesObj.commands[0]).toHaveProperty('title')
      expect(contributesObj.commands[0]).toHaveProperty('category')
    })

    test('keybindings 只包含有 keybinding 的命令', () => {
      const commands = VscodePlugin.getCommands()
      const config = VscodePlugin.getDefaultConfig()
      const contributes = VscodePlugin.generateContributes(commands, config)

      const contributesObj = contributes as {
        keybindings: Array<{ command: string; key: string }>
      }
      const commandsWithKeybinding = commands.filter((cmd) => cmd.keybinding)
      expect(contributesObj.keybindings.length).toBe(commandsWithKeybinding.length)
    })
  })

  describe('getDefaultConfig', () => {
    test('autoStart 为 true', () => {
      const config = VscodePlugin.getDefaultConfig()
      expect(config.autoStart).toBe(true)
    })

    test('panelTitle 为 Axiom AI', () => {
      const config = VscodePlugin.getDefaultConfig()
      expect(config.panelTitle).toBe('Axiom AI')
    })

    test('serverPort 为 4096', () => {
      const config = VscodePlugin.getDefaultConfig()
      expect(config.serverPort).toBe(4096)
    })

    test('showInStatusBar 为 true', () => {
      const config = VscodePlugin.getDefaultConfig()
      expect(config.showInStatusBar).toBe(true)
    })
  })

  describe('Config schema', () => {
    test('可以解析有效的配置对象', () => {
      const validConfig = {
        serverPort: 5000,
        autoStart: false,
        panelTitle: 'Custom Title',
        showInStatusBar: false,
      }
      const result = VscodePlugin.Config.parse(validConfig)
      expect(result.serverPort).toBe(5000)
      expect(result.autoStart).toBe(false)
      expect(result.panelTitle).toBe('Custom Title')
      expect(result.showInStatusBar).toBe(false)
    })
  })

  describe('Command schema', () => {
    test('可以解析有效的命令对象', () => {
      const validCommand = {
        id: 'test.command',
        title: 'Test Command',
        category: 'Test',
        keybinding: 'Ctrl+T',
      }
      const result = VscodePlugin.Command.parse(validCommand)
      expect(result.id).toBe('test.command')
      expect(result.title).toBe('Test Command')
      expect(result.category).toBe('Test')
      expect(result.keybinding).toBe('Ctrl+T')
    })

    test('category 有默认值 Axiom', () => {
      const commandWithoutCategory = {
        id: 'test.command',
        title: 'Test Command',
      }
      const result = VscodePlugin.Command.parse(commandWithoutCategory)
      expect(result.category).toBe('Axiom')
    })
  })
})
