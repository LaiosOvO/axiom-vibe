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
}
