import { describe, expect, test } from 'bun:test'
import { DesktopApp } from '../src/index'

describe('DesktopApp.Config', () => {
  test('getDefaultConfig 返回默认配置', () => {
    const config = DesktopApp.getDefaultConfig()
    expect(config.title).toBe('Axiom')
    expect(config.width).toBe(1200)
    expect(config.height).toBe(800)
    expect(config.serverPort).toBe(4096)
    expect(config.theme).toBe('auto')
  })

  test('mergeConfig 覆盖指定字段', () => {
    const base = DesktopApp.getDefaultConfig()
    const merged = DesktopApp.mergeConfig(base, { title: 'Custom App' })
    expect(merged.title).toBe('Custom App')
    expect(merged.width).toBe(1200)
    expect(merged.height).toBe(800)
  })

  test('Config.parse 验证有效配置', () => {
    const config = DesktopApp.Config.parse({
      title: 'Test',
      width: 800,
      height: 600,
      serverPort: 3000,
      theme: 'dark',
    })
    expect(config.title).toBe('Test')
    expect(config.theme).toBe('dark')
  })

  test('Config.parse 拒绝无效 theme', () => {
    expect(() => {
      DesktopApp.Config.parse({ theme: 'invalid' })
    }).toThrow()
  })

  test('generateTauriConfig 生成正确格式', () => {
    const appConfig = DesktopApp.getDefaultConfig()
    const tauriConfig = DesktopApp.generateTauriConfig(appConfig) as {
      window: { title: string; width: number; height: number }
      server: { port: number }
      theme: string
    }
    expect(tauriConfig).toHaveProperty('window')
    expect(tauriConfig.window).toHaveProperty('title', 'Axiom')
    expect(tauriConfig.window).toHaveProperty('width', 1200)
    expect(tauriConfig.window).toHaveProperty('height', 800)
  })
})

describe('DesktopApp.AppState', () => {
  test('getInitialState 返回正确初始状态', () => {
    const state = DesktopApp.getInitialState()
    expect(state.serverState).toBe('stopped')
    expect(state.serverPort).toBe(4096)
    expect(state.version).toBe('0.1.0')
    expect(state.startedAt).toBeUndefined()
    expect(state.windowState.isMaximized).toBe(false)
    expect(state.windowState.isFullscreen).toBe(false)
  })

  test('getInitialState 接受自定义配置', () => {
    const state = DesktopApp.getInitialState({ title: 'Custom', serverPort: 5000 })
    expect(state.config.title).toBe('Custom')
    expect(state.serverPort).toBe(5000)
  })

  test('startServer 更新状态为 running', () => {
    const initial = DesktopApp.getInitialState()
    const started = DesktopApp.startServer(initial)
    expect(started.serverState).toBe('running')
    expect(started.startedAt).toBeTypeOf('number')
    expect(started.startedAt).toBeGreaterThan(0)
  })

  test('startServer 保留其他状态', () => {
    const initial = DesktopApp.getInitialState({ title: 'Test' })
    const started = DesktopApp.startServer(initial)
    expect(started.config.title).toBe('Test')
    expect(started.serverPort).toBe(4096)
  })

  test('stopServer 更新状态为 stopped', () => {
    const initial = DesktopApp.getInitialState()
    const started = DesktopApp.startServer(initial)
    const stopped = DesktopApp.stopServer(started)
    expect(stopped.serverState).toBe('stopped')
    expect(stopped.startedAt).toBeUndefined()
  })

  test('stopServer 清除 startedAt', () => {
    const initial = DesktopApp.getInitialState()
    const started = DesktopApp.startServer(initial)
    expect(started.startedAt).toBeDefined()
    const stopped = DesktopApp.stopServer(started)
    expect(stopped.startedAt).toBeUndefined()
  })

  test('updateWindowState 正确合并窗口状态', () => {
    const initial = DesktopApp.getInitialState()
    const updated = DesktopApp.updateWindowState(initial, { isMaximized: true })
    expect(updated.windowState.isMaximized).toBe(true)
    expect(updated.windowState.isFullscreen).toBe(false)
  })

  test('updateWindowState 更新多个字段', () => {
    const initial = DesktopApp.getInitialState()
    const updated = DesktopApp.updateWindowState(initial, {
      isMaximized: true,
      isFullscreen: true,
      position: { x: 100, y: 200 },
    })
    expect(updated.windowState.isMaximized).toBe(true)
    expect(updated.windowState.isFullscreen).toBe(true)
    expect(updated.windowState.position).toEqual({ x: 100, y: 200 })
  })

  test('generateFullTauriConfig 包含必要字段', () => {
    const state = DesktopApp.getInitialState()
    const config = DesktopApp.generateFullTauriConfig(state) as {
      productName: string
      version: string
      identifier: string
      build: { distDir: string; devPath: string }
      app: { windows: unknown[]; security: { csp: string } }
      bundle: { active: boolean; targets: string[]; icon: string[] }
    }
    expect(config.productName).toBe('Axiom')
    expect(config.version).toBe('0.1.0')
    expect(config.identifier).toBe('ai.axiom.desktop')
    expect(config.build.devPath).toBe('http://localhost:4096')
  })

  test('generateFullTauriConfig 包含窗口配置', () => {
    const state = DesktopApp.getInitialState()
    const updated = DesktopApp.updateWindowState(state, { isFullscreen: true })
    const config = DesktopApp.generateFullTauriConfig(updated) as {
      app: { windows: Array<{ fullscreen: boolean }> }
    }
    expect(config.app.windows.length).toBeGreaterThan(0)
    expect(config.app.windows[0]?.fullscreen).toBe(true)
  })

  test('generateFullTauriConfig 包含打包配置', () => {
    const state = DesktopApp.getInitialState()
    const config = DesktopApp.generateFullTauriConfig(state) as {
      bundle: { active: boolean; targets: string[]; icon: string[] }
    }
    expect(config.bundle.active).toBe(true)
    expect(config.bundle.targets).toContain('deb')
    expect(config.bundle.targets).toContain('dmg')
    expect(config.bundle.icon.length).toBeGreaterThan(0)
  })

  test('getPlatformBuildArgs 返回有效的 target', () => {
    const args = DesktopApp.getPlatformBuildArgs()
    expect(args.target).toMatch(/^(windows|macos|linux)$/)
  })

  test('getPlatformBuildArgs 返回有效的 arch', () => {
    const args = DesktopApp.getPlatformBuildArgs()
    expect(args.arch).toMatch(/^(x86_64|aarch64)$/)
  })
})
