import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ToolRegistry } from '../src/tool'
import { cleanupTempDir, createTempDir, createTestFile } from './preload'

describe('新增工具集成测试', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir()
    ToolRegistry.reset()
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  describe('glob 工具', () => {
    it('搜索匹配模式的文件', async () => {
      await createTestFile(tempDir, 'test1.ts', 'content1')
      await createTestFile(tempDir, 'test2.ts', 'content2')
      await createTestFile(tempDir, 'test.js', 'content3')

      const glob = ToolRegistry.get('glob')
      expect(glob).toBeDefined()

      const result = (await glob?.execute({ pattern: '*.ts', cwd: tempDir })) as {
        files: string[]
      }

      expect(result.files).toBeDefined()
      expect(result.files.length).toBe(2)
      expect(result.files).toContain('test1.ts')
      expect(result.files).toContain('test2.ts')
    })

    it('支持嵌套目录搜索', async () => {
      const subDir = join(tempDir, 'src')
      await mkdir(subDir, { recursive: true })
      await createTestFile(tempDir, 'root.ts', 'root')
      await createTestFile(subDir, 'nested.ts', 'nested')

      const glob = ToolRegistry.get('glob')
      const result = (await glob?.execute({ pattern: '**/*.ts', cwd: tempDir })) as {
        files: string[]
      }

      expect(result.files.length).toBeGreaterThanOrEqual(2)
    })

    it('未找到匹配文件返回空数组', async () => {
      const glob = ToolRegistry.get('glob')
      const result = (await glob?.execute({ pattern: '*.nonexistent', cwd: tempDir })) as {
        files: string[]
      }

      expect(result.files).toEqual([])
    })
  })

  describe('grep 工具', () => {
    it('搜索文件内容', async () => {
      await createTestFile(tempDir, 'file1.txt', 'Hello World\nGoodbye World')
      await createTestFile(tempDir, 'file2.txt', 'Hello Bun\nTest')

      const grep = ToolRegistry.get('grep')
      const result = (await grep?.execute({ pattern: 'Hello', path: tempDir })) as {
        matches: Array<{ file: string; line: number; content: string }>
      }

      expect(result.matches).toBeDefined()
      expect(result.matches.length).toBe(2)

      const match1 = result.matches.find((m) => m.content === 'Hello World')
      expect(match1).toBeDefined()
      expect(match1?.line).toBe(1)

      const match2 = result.matches.find((m) => m.content === 'Hello Bun')
      expect(match2).toBeDefined()
      expect(match2?.line).toBe(1)
    })

    it('支持正则表达式', async () => {
      await createTestFile(tempDir, 'test.txt', 'test123\ntest456\nabc789')

      const grep = ToolRegistry.get('grep')
      const result = (await grep?.execute({ pattern: 'test\\d+', path: tempDir })) as {
        matches: Array<{ file: string; line: number; content: string }>
      }

      expect(result.matches.length).toBe(2)
    })

    it('支持 include 过滤文件类型', async () => {
      await createTestFile(tempDir, 'file.ts', 'TypeScript')
      await createTestFile(tempDir, 'file.js', 'TypeScript')

      const grep = ToolRegistry.get('grep')
      const result = (await grep?.execute({
        pattern: 'TypeScript',
        path: tempDir,
        include: 'ts',
      })) as {
        matches: Array<{ file: string; line: number; content: string }>
      }

      expect(result.matches.length).toBe(1)
      const match = result.matches[0]
      expect(match?.file).toContain('.ts')
    })

    it('未找到匹配内容返回空数组', async () => {
      await createTestFile(tempDir, 'test.txt', 'content')

      const grep = ToolRegistry.get('grep')
      const result = (await grep?.execute({ pattern: 'nonexistent', path: tempDir })) as {
        matches: Array<{ file: string; line: number; content: string }>
      }

      expect(result.matches).toEqual([])
    })
  })

  describe('edit 工具', () => {
    it('精确替换文件内容', async () => {
      const filepath = await createTestFile(tempDir, 'test.txt', 'Hello World')

      const edit = ToolRegistry.get('edit')
      const result = (await edit?.execute({
        path: filepath,
        oldText: 'World',
        newText: 'Bun',
      })) as { success: boolean }

      expect(result.success).toBe(true)

      const updatedContent = await Bun.file(filepath).text()
      expect(updatedContent).toBe('Hello Bun')
    })

    it('替换多行文本', async () => {
      const filepath = await createTestFile(tempDir, 'test.txt', 'Line 1\nLine 2\nLine 3')

      const edit = ToolRegistry.get('edit')
      await edit?.execute({
        path: filepath,
        oldText: 'Line 2',
        newText: 'Modified Line',
      })

      const updatedContent = await Bun.file(filepath).text()
      expect(updatedContent).toBe('Line 1\nModified Line\nLine 3')
    })

    it('oldText 不存在时抛出错误', async () => {
      const filepath = await createTestFile(tempDir, 'test.txt', 'content')

      const edit = ToolRegistry.get('edit')

      try {
        await edit?.execute({
          path: filepath,
          oldText: 'nonexistent',
          newText: 'new',
        })
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toContain('未在文件中找到')
      }
    })
  })

  describe('ls 工具', () => {
    it('列出目录内容', async () => {
      await createTestFile(tempDir, 'file1.txt', 'content')
      await createTestFile(tempDir, 'file2.txt', 'content')
      const subDir = join(tempDir, 'subdir')
      await mkdir(subDir, { recursive: true })

      const ls = ToolRegistry.get('ls')
      const result = (await ls?.execute({ path: tempDir })) as {
        entries: Array<{ name: string; type: 'file' | 'directory' }>
      }

      expect(result.entries).toBeDefined()
      expect(result.entries.length).toBe(3)

      const file1 = result.entries.find((e) => e.name === 'file1.txt')
      expect(file1?.type).toBe('file')

      const dir = result.entries.find((e) => e.name === 'subdir')
      expect(dir?.type).toBe('directory')
    })

    it('空目录返回空数组', async () => {
      const emptyDir = join(tempDir, 'empty')
      await mkdir(emptyDir, { recursive: true })

      const ls = ToolRegistry.get('ls')
      const result = (await ls?.execute({ path: emptyDir })) as {
        entries: Array<{ name: string; type: 'file' | 'directory' }>
      }

      expect(result.entries).toEqual([])
    })

    it('正确区分文件和目录', async () => {
      await createTestFile(tempDir, 'file.txt', 'content')
      const subDir = join(tempDir, 'dir')
      await mkdir(subDir, { recursive: true })

      const ls = ToolRegistry.get('ls')
      const result = (await ls?.execute({ path: tempDir })) as {
        entries: Array<{ name: string; type: 'file' | 'directory' }>
      }

      const fileEntry = result.entries.find((e) => e.name === 'file.txt')
      expect(fileEntry?.type).toBe('file')

      const dirEntry = result.entries.find((e) => e.name === 'dir')
      expect(dirEntry?.type).toBe('directory')
    })
  })

  describe('webfetch 工具', () => {
    it('抓取网页内容', async () => {
      const webfetch = ToolRegistry.get('webfetch')
      const result = (await webfetch?.execute({
        url: 'https://httpbin.org/html',
      })) as { content: string; status: number }

      expect(result.content).toBeDefined()
      expect(result.status).toBe(200)
      expect(typeof result.content).toBe('string')
      expect(result.content.length).toBeGreaterThan(0)
    })

    it('返回状态码', async () => {
      const webfetch = ToolRegistry.get('webfetch')
      const result = (await webfetch?.execute({
        url: 'https://httpbin.org/status/404',
      })) as { content: string; status: number }

      expect(result.status).toBe(404)
    })

    it('处理 JSON 响应', async () => {
      const webfetch = ToolRegistry.get('webfetch')
      const result = (await webfetch?.execute({
        url: 'https://httpbin.org/json',
      })) as { content: string; status: number }

      expect(result.content).toBeDefined()
      expect(result.status).toBe(200)

      const json = JSON.parse(result.content)
      expect(json).toBeDefined()
    })
  })
})
