import { beforeEach, describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { Tool, ToolRegistry } from '../src/tool'

describe('Tool', () => {
  test('define 创建工具定义', () => {
    const echo = Tool.define({
      name: 'echo',
      description: '回显输入内容',
      parameters: z.object({ message: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.message }),
    })

    expect(echo.name).toBe('echo')
    expect(echo.description).toBe('回显输入内容')
    expect(echo.parameters).toBeDefined()
    expect(echo.result).toBeDefined()
    expect(echo.execute).toBeDefined()
  })

  test('execute 参数验证失败时抛出错误', async () => {
    const echo = Tool.define({
      name: 'echo',
      description: '回显输入内容',
      parameters: z.object({ message: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.message }),
    })

    await expect(echo.execute({ message: 123 })).rejects.toThrow()
  })

  test('execute 参数验证成功时正常执行', async () => {
    const echo = Tool.define({
      name: 'echo',
      description: '回显输入内容',
      parameters: z.object({ message: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.message }),
    })

    const result = await echo.execute({ message: 'hello' })
    expect(result.output).toBe('hello')
  })
})

describe('ToolRegistry', () => {
  beforeEach(() => {
    ToolRegistry.reset()
  })

  test('register 和 get 工具', () => {
    const echo = Tool.define({
      name: 'echo',
      description: '回显输入内容',
      parameters: z.object({ message: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.message }),
    })

    ToolRegistry.register(echo)
    const retrieved = ToolRegistry.get('echo')

    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('echo')
  })

  test('list 返回所有已注册工具', () => {
    const echo = Tool.define({
      name: 'echo',
      description: '回显输入内容',
      parameters: z.object({ message: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.message }),
    })

    const upper = Tool.define({
      name: 'upper',
      description: '转大写',
      parameters: z.object({ text: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.text.toUpperCase() }),
    })

    ToolRegistry.register(echo)
    ToolRegistry.register(upper)

    const tools = ToolRegistry.list()
    expect(tools.length).toBe(10)
    const names = tools.map((t) => t.name).sort()
    expect(names).toContain('echo')
    expect(names).toContain('upper')
    expect(names).toContain('read')
    expect(names).toContain('write')
    expect(names).toContain('bash')
    expect(names).toContain('glob')
    expect(names).toContain('grep')
    expect(names).toContain('edit')
    expect(names).toContain('ls')
    expect(names).toContain('webfetch')
  })

  test('has 检查工具是否存在', () => {
    const echo = Tool.define({
      name: 'echo',
      description: '回显输入内容',
      parameters: z.object({ message: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.message }),
    })

    ToolRegistry.register(echo)

    expect(ToolRegistry.has('echo')).toBe(true)
    expect(ToolRegistry.has('nonexistent')).toBe(false)
  })

  test('resolve 批量获取工具', () => {
    const echo = Tool.define({
      name: 'echo',
      description: '回显输入内容',
      parameters: z.object({ message: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.message }),
    })

    const upper = Tool.define({
      name: 'upper',
      description: '转大写',
      parameters: z.object({ text: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async (params) => ({ output: params.text.toUpperCase() }),
    })

    ToolRegistry.register(echo)
    ToolRegistry.register(upper)

    const resolved = ToolRegistry.resolve(['echo', 'upper', 'nonexistent'])

    expect(resolved.length).toBe(2)
    expect(resolved.map((t) => t.name).sort()).toEqual(['echo', 'upper'])
  })

  test('预注册的骨架工具存在', () => {
    expect(ToolRegistry.has('read')).toBe(true)
    expect(ToolRegistry.has('write')).toBe(true)
    expect(ToolRegistry.has('bash')).toBe(true)
  })

  test('预注册的新工具存在', () => {
    expect(ToolRegistry.has('glob')).toBe(true)
    expect(ToolRegistry.has('grep')).toBe(true)
    expect(ToolRegistry.has('edit')).toBe(true)
    expect(ToolRegistry.has('ls')).toBe(true)
    expect(ToolRegistry.has('webfetch')).toBe(true)
  })
})
