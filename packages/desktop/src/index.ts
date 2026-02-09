// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace DesktopApp {
  export const Config = z.object({
    title: z.string().default('Axiom'),
    width: z.number().default(1200),
    height: z.number().default(800),
    serverPort: z.number().default(4096),
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  })

  export type Config = z.infer<typeof Config>

  export const WindowState = z.object({
    isMaximized: z.boolean().default(false),
    isFullscreen: z.boolean().default(false),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    size: z.object({ width: z.number(), height: z.number() }).optional(),
  })

  export type WindowState = z.infer<typeof WindowState>

  export function getDefaultConfig(): Config {
    return Config.parse({})
  }

  export function mergeConfig(base: Config, overrides: Partial<Config>): Config {
    return Config.parse({ ...base, ...overrides })
  }

  export function generateTauriConfig(appConfig: Config): object {
    return {
      window: {
        title: appConfig.title,
        width: appConfig.width,
        height: appConfig.height,
      },
      server: {
        port: appConfig.serverPort,
      },
      theme: appConfig.theme,
    }
  }

  /** 服务器管理状态 */
  export type ServerState = 'stopped' | 'starting' | 'running' | 'error'

  /** 应用状态 */
  export interface AppState {
    serverState: ServerState
    serverPort: number
    windowState: WindowState
    config: Config
    version: string
    startedAt?: number
  }

  /** 获取初始应用状态 */
  export function getInitialState(config?: Partial<Config>): AppState {
    const mergedConfig = Config.parse(config || {})
    return {
      serverState: 'stopped',
      serverPort: mergedConfig.serverPort,
      windowState: WindowState.parse({}),
      config: mergedConfig,
      version: '0.1.0',
    }
  }

  /** 模拟启动服务器（返回新状态） */
  export function startServer(state: AppState): AppState {
    return {
      ...state,
      serverState: 'running',
      startedAt: Date.now(),
    }
  }

  /** 模拟停止服务器 */
  export function stopServer(state: AppState): AppState {
    return {
      ...state,
      serverState: 'stopped',
      startedAt: undefined,
    }
  }

  /** 更新窗口状态 */
  export function updateWindowState(state: AppState, windowState: Partial<WindowState>): AppState {
    return {
      ...state,
      windowState: WindowState.parse({ ...state.windowState, ...windowState }),
    }
  }

  /** 生成 Tauri 完整配置 */
  export function generateFullTauriConfig(state: AppState): object {
    return {
      productName: state.config.title,
      version: state.version,
      identifier: 'ai.axiom.desktop',
      build: {
        distDir: '../app/dist',
        devPath: `http://localhost:${state.serverPort}`,
      },
      app: {
        windows: [
          {
            title: state.config.title,
            width: state.config.width,
            height: state.config.height,
            resizable: true,
            fullscreen: state.windowState.isFullscreen,
          },
        ],
        security: {
          csp: "default-src 'self'; script-src 'self'",
        },
      },
      bundle: {
        active: true,
        targets: ['deb', 'appimage', 'msi', 'dmg'],
        icon: ['icons/32x32.png', 'icons/128x128.png', 'icons/icon.icns', 'icons/icon.ico'],
      },
    }
  }

  /** 获取平台特定构建参数 */
  export function getPlatformBuildArgs(): { target: string; arch: string } {
    const platform = process.platform
    const arch = process.arch
    return {
      target: platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux',
      arch: arch === 'arm64' ? 'aarch64' : 'x86_64',
    }
  }
}
