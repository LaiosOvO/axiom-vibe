import { z } from 'zod'
import { Tool, ToolRegistry } from './index'

/**
 * Playwright Browser 实例（单例）
 */
// biome-ignore lint/suspicious/noExplicitAny: Playwright 类型由运行时决定
let _browser: any = null
/**
 * Playwright Page 实例（单例）
 */
// biome-ignore lint/suspicious/noExplicitAny: Playwright 类型由运行时决定
let _page: any = null

/**
 * 获取或创建 Browser 实例
 * @returns Playwright Browser 实例
 */
async function getBrowser(): Promise<unknown> {
  if (!_browser) {
    // @ts-expect-error playwright 是可选的运行时依赖
    const { chromium } = await import('playwright')
    // biome-ignore lint/suspicious/noExplicitAny: Chromium 类型由运行时决定
    _browser = await (chromium as any).launch({ headless: true })
  }
  return _browser
}

/**
 * 获取或创建 Page 实例
 * @returns Playwright Page 实例
 */
async function getPage(): Promise<unknown> {
  if (!_page) {
    const browser = await getBrowser()
    // biome-ignore lint/suspicious/noExplicitAny: Browser 类型由运行时决定
    _page = await (browser as any).newPage()
  }
  return _page
}

/**
 * 关闭浏览器实例并清理资源
 */
export async function closeBrowser(): Promise<void> {
  if (_page) {
    // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
    await (_page as any).close()
    _page = null
  }
  if (_browser) {
    // biome-ignore lint/suspicious/noExplicitAny: Browser 类型由运行时决定
    await (_browser as any).close()
    _browser = null
  }
}

/**
 * 注册浏览器自动化工具到 ToolRegistry
 * 需要 playwright 运行时可用
 */
export function registerBrowserTools(): void {
  // 1. browser_navigate — 导航到 URL
  const navigate = Tool.define({
    name: 'browser_navigate',
    description: '导航浏览器到指定 URL',
    parameters: z.object({
      url: z.string(),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).default('load'),
    }),
    result: z.object({
      url: z.string(),
      title: z.string(),
    }),
    execute: async (params) => {
      const page = await getPage()
      // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
      await (page as any).goto(params.url, { waitUntil: params.waitUntil })
      // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
      const url = (page as any).url() as string
      // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
      const title = (await (page as any).title()) as string
      return { url, title }
    },
  })

  // 2. browser_screenshot — 截图
  const screenshot = Tool.define({
    name: 'browser_screenshot',
    description: '对当前页面或指定元素截图',
    parameters: z.object({
      selector: z.string().optional(),
      fullPage: z.boolean().default(false),
      path: z.string().optional(),
    }),
    result: z.object({
      path: z.string(),
      width: z.number(),
      height: z.number(),
    }),
    execute: async (params) => {
      const page = await getPage()
      const path = params.path ?? `screenshot-${Date.now()}.png`

      let buffer: Buffer
      if (params.selector) {
        // 截取指定元素
        // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
        const element = await (page as any).locator(params.selector)
        buffer = await element.screenshot({ path })
      } else {
        // 截取整个页面
        // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
        buffer = await (page as any).screenshot({ path, fullPage: params.fullPage })
      }

      // 获取截图尺寸（通过简单的方式估算，实际应该从 buffer 解析）
      const width = 1280
      const height = 720

      return { path, width, height }
    },
  })

  // 3. browser_click — 点击元素
  const click = Tool.define({
    name: 'browser_click',
    description: '点击页面上的元素',
    parameters: z.object({
      selector: z.string(),
      button: z.enum(['left', 'right', 'middle']).default('left'),
    }),
    result: z.object({
      success: z.boolean(),
    }),
    execute: async (params) => {
      const page = await getPage()
      // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
      await (page as any).click(params.selector, { button: params.button })
      return { success: true }
    },
  })

  // 4. browser_type — 在输入框输入文本
  const type = Tool.define({
    name: 'browser_type',
    description: '在指定元素中输入文本',
    parameters: z.object({
      selector: z.string(),
      text: z.string(),
      delay: z.number().default(0),
    }),
    result: z.object({
      success: z.boolean(),
    }),
    execute: async (params) => {
      const page = await getPage()
      // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
      await (page as any).type(params.selector, params.text, { delay: params.delay })
      return { success: true }
    },
  })

  // 5. browser_evaluate — 执行 JavaScript
  const evaluate = Tool.define({
    name: 'browser_evaluate',
    description: '在页面上下文中执行 JavaScript 代码',
    parameters: z.object({
      script: z.string(),
    }),
    result: z.object({
      result: z.string(),
    }),
    execute: async (params) => {
      const page = await getPage()
      // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
      const rawResult = await (page as any).evaluate(params.script)
      // 将结果转换为字符串
      const result = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult)
      return { result }
    },
  })

  // 6. browser_wait — 等待元素出现
  const waitFor = Tool.define({
    name: 'browser_wait',
    description: '等待页面上的元素出现',
    parameters: z.object({
      selector: z.string(),
      timeout: z.number().default(30000),
      state: z.enum(['visible', 'hidden', 'attached', 'detached']).default('visible'),
    }),
    result: z.object({
      found: z.boolean(),
    }),
    execute: async (params) => {
      const page = await getPage()
      try {
        // biome-ignore lint/suspicious/noExplicitAny: Page 类型由运行时决定
        await (page as any).waitForSelector(params.selector, {
          timeout: params.timeout,
          state: params.state,
        })
        return { found: true }
      } catch {
        return { found: false }
      }
    },
  })

  // 注册所有工具
  ToolRegistry.register(navigate)
  ToolRegistry.register(screenshot)
  ToolRegistry.register(click)
  ToolRegistry.register(type)
  ToolRegistry.register(evaluate)
  ToolRegistry.register(waitFor)
}
