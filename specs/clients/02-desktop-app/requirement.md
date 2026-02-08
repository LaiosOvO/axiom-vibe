# SPEC-C02: Desktop 应用

> 里程碑: M3 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: C01

## 目标

实现 Tauri 桌面应用配置骨架和构建配置。Desktop 应用通过 WebView 加载 TUI 渲染的 HTML。

## 需求

### R1: DesktopApp 命名空间（packages/desktop）

```typescript
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

  export function getDefaultConfig(): Config;
  export function mergeConfig(base: Config, overrides: Partial<Config>): Config;
  export function generateTauriConfig(appConfig: Config): object;
}
```

## 验收场景

### 场景 1: 默认配置
- **当** 调用 `getDefaultConfig()`
- **那么** 返回包含 title='Axiom', width=1200 的配置

### 场景 2: 合并配置
- **当** mergeConfig 覆盖 title
- **那么** 只有 title 变化，其他保持默认

### 场景 3: 生成 Tauri 配置
- **当** generateTauriConfig 传入配置
- **那么** 返回符合 Tauri 配置格式的对象（含 window.title, window.width 等）

### 场景 4: Schema 验证
- **当** Config.parse({ theme: 'invalid' })
- **那么** 抛出验证错误
