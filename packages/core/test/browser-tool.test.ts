import { beforeEach, describe, expect, test } from 'bun:test'
import { ToolRegistry } from '../src/tool'
import { registerBrowserTools } from '../src/tool/browser'

describe('Browser Tools', () => {
  beforeEach(() => {
    ToolRegistry.reset()
    registerBrowserTools()
  })

  describe('browser_navigate', () => {
    test('注册成功', () => {
      expect(ToolRegistry.has('browser_navigate')).toBe(true)
    })

    test('工具定义正确', () => {
      const navigate = ToolRegistry.get('browser_navigate')
      expect(navigate).toBeDefined()
      expect(navigate?.name).toBe('browser_navigate')
      expect(navigate?.description).toBe('导航浏览器到指定 URL')
      expect(navigate?.parameters).toBeDefined()
      expect(navigate?.result).toBeDefined()
    })

    test('参数验证', () => {
      const navigate = ToolRegistry.get('browser_navigate')
      const schema = navigate?.parameters

      const validParams = { url: 'https://example.com', waitUntil: 'load' as const }
      expect(() => schema?.parse(validParams)).not.toThrow()

      const withDefaults = { url: 'https://example.com' }
      const parsed = schema?.parse(withDefaults)
      // biome-ignore lint/suspicious/noExplicitAny: 测试中的类型断言
      expect((parsed as any).waitUntil).toBe('load')
    })
  })

  describe('browser_screenshot', () => {
    test('注册成功', () => {
      expect(ToolRegistry.has('browser_screenshot')).toBe(true)
    })

    test('工具定义正确', () => {
      const screenshot = ToolRegistry.get('browser_screenshot')
      expect(screenshot).toBeDefined()
      expect(screenshot?.name).toBe('browser_screenshot')
      expect(screenshot?.description).toBe('对当前页面或指定元素截图')
    })

    test('参数验证', () => {
      const screenshot = ToolRegistry.get('browser_screenshot')
      const schema = screenshot?.parameters

      const validParams = {
        selector: '#header',
        fullPage: true,
        path: '/tmp/screenshot.png',
      }
      expect(() => schema?.parse(validParams)).not.toThrow()

      const minimal = {}
      const parsed = schema?.parse(minimal)
      // biome-ignore lint/suspicious/noExplicitAny: 测试中的类型断言
      expect((parsed as any).fullPage).toBe(false)
    })
  })

  describe('browser_click', () => {
    test('注册成功', () => {
      expect(ToolRegistry.has('browser_click')).toBe(true)
    })

    test('工具定义正确', () => {
      const click = ToolRegistry.get('browser_click')
      expect(click).toBeDefined()
      expect(click?.name).toBe('browser_click')
      expect(click?.description).toBe('点击页面上的元素')
    })

    test('参数验证', () => {
      const click = ToolRegistry.get('browser_click')
      const schema = click?.parameters

      const validParams = { selector: 'button.submit', button: 'left' as const }
      expect(() => schema?.parse(validParams)).not.toThrow()

      const withDefaults = { selector: 'button' }
      const parsed = schema?.parse(withDefaults)
      // biome-ignore lint/suspicious/noExplicitAny: 测试中的类型断言
      expect((parsed as any).button).toBe('left')
    })
  })

  describe('browser_type', () => {
    test('注册成功', () => {
      expect(ToolRegistry.has('browser_type')).toBe(true)
    })

    test('工具定义正确', () => {
      const type = ToolRegistry.get('browser_type')
      expect(type).toBeDefined()
      expect(type?.name).toBe('browser_type')
      expect(type?.description).toBe('在指定元素中输入文本')
    })

    test('参数验证', () => {
      const type = ToolRegistry.get('browser_type')
      const schema = type?.parameters

      const validParams = { selector: 'input#username', text: 'john_doe', delay: 50 }
      expect(() => schema?.parse(validParams)).not.toThrow()

      const withDefaults = { selector: 'input', text: 'test' }
      const parsed = schema?.parse(withDefaults)
      // biome-ignore lint/suspicious/noExplicitAny: 测试中的类型断言
      expect((parsed as any).delay).toBe(0)
    })
  })

  describe('browser_evaluate', () => {
    test('注册成功', () => {
      expect(ToolRegistry.has('browser_evaluate')).toBe(true)
    })

    test('工具定义正确', () => {
      const evaluate = ToolRegistry.get('browser_evaluate')
      expect(evaluate).toBeDefined()
      expect(evaluate?.name).toBe('browser_evaluate')
      expect(evaluate?.description).toBe('在页面上下文中执行 JavaScript 代码')
    })

    test('参数验证', () => {
      const evaluate = ToolRegistry.get('browser_evaluate')
      const schema = evaluate?.parameters

      const validParams = { script: 'document.title' }
      expect(() => schema?.parse(validParams)).not.toThrow()

      expect(() => schema?.parse({})).toThrow()
    })
  })

  describe('browser_wait', () => {
    test('注册成功', () => {
      expect(ToolRegistry.has('browser_wait')).toBe(true)
    })

    test('工具定义正确', () => {
      const waitFor = ToolRegistry.get('browser_wait')
      expect(waitFor).toBeDefined()
      expect(waitFor?.name).toBe('browser_wait')
      expect(waitFor?.description).toBe('等待页面上的元素出现')
    })

    test('参数验证', () => {
      const waitFor = ToolRegistry.get('browser_wait')
      const schema = waitFor?.parameters

      const validParams = {
        selector: '.loading',
        timeout: 5000,
        state: 'visible' as const,
      }
      expect(() => schema?.parse(validParams)).not.toThrow()

      const withDefaults = { selector: '.element' }
      const parsed = schema?.parse(withDefaults)
      // biome-ignore lint/suspicious/noExplicitAny: 测试中的类型断言
      expect((parsed as any).timeout).toBe(30000)
      // biome-ignore lint/suspicious/noExplicitAny: 测试中的类型断言
      expect((parsed as any).state).toBe('visible')
    })
  })

  describe('所有浏览器工具', () => {
    test('注册了 6 个浏览器工具', () => {
      const tools = ToolRegistry.list()
      const browserTools = tools.filter((t) => t.name.startsWith('browser_'))

      expect(browserTools.length).toBe(6)

      const names = browserTools.map((t) => t.name).sort()
      expect(names).toEqual([
        'browser_click',
        'browser_evaluate',
        'browser_navigate',
        'browser_screenshot',
        'browser_type',
        'browser_wait',
      ])
    })
  })
})
