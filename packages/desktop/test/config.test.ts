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
