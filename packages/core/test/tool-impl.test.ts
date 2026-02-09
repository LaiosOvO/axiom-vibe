import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ToolRegistry } from '../src/tool'

describe('Tool Implementation', () => {
  let tempDir: string

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tool-test-'))
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('read 工具', () => {
    test('能读取存在的文件', async () => {
      const testFile = join(tempDir, 'test.txt')
      const content = 'Hello, World!'
      await Bun.write(testFile, content)

      const read = ToolRegistry.get('read')
      expect(read).toBeDefined()

      const result = (await read!.execute({ path: testFile })) as { content: string }
      expect(result.content).toBe(content)
    })

    test('读取不存在的文件时抛出错误', async () => {
      const nonexistentFile = join(tempDir, 'nonexistent.txt')

      const read = ToolRegistry.get('read')
      expect(read).toBeDefined()

      await expect(read!.execute({ path: nonexistentFile })).rejects.toThrow()
    })
  })

  describe('write 工具', () => {
    test('能创建新文件', async () => {
      const testFile = join(tempDir, 'new-file.txt')
      const content = 'New content'

      const write = ToolRegistry.get('write')
      expect(write).toBeDefined()

      const result = (await write!.execute({ path: testFile, content })) as { success: boolean }
      expect(result.success).toBe(true)

      const fileContent = await Bun.file(testFile).text()
      expect(fileContent).toBe(content)
    })

    test('能覆盖已有文件', async () => {
      const testFile = join(tempDir, 'overwrite.txt')
      const originalContent = 'Original'
      const newContent = 'Overwritten'

      await Bun.write(testFile, originalContent)

      const write = ToolRegistry.get('write')
      expect(write).toBeDefined()

      const result = (await write!.execute({ path: testFile, content: newContent })) as {
        success: boolean
      }
      expect(result.success).toBe(true)

      const fileContent = await Bun.file(testFile).text()
      expect(fileContent).toBe(newContent)
    })
  })

  describe('bash 工具', () => {
    test('能执行简单命令（echo hello）', async () => {
      const bash = ToolRegistry.get('bash')
      expect(bash).toBeDefined()

      const result = (await bash!.execute({ command: 'echo hello' })) as {
        stdout: string
        stderr: string
        exitCode: number
      }
      expect(result.stdout.trim()).toBe('hello')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    test('返回正确的 exitCode', async () => {
      const bash = ToolRegistry.get('bash')
      expect(bash).toBeDefined()

      const result = (await bash!.execute({ command: 'exit 42' })) as { exitCode: number }
      expect(result.exitCode).toBe(42)
    })

    test('捕获 stderr', async () => {
      const bash = ToolRegistry.get('bash')
      expect(bash).toBeDefined()

      const result = (await bash!.execute({ command: 'echo error >&2' })) as {
        stdout: string
        stderr: string
        exitCode: number
      }
      expect(result.stderr.trim()).toBe('error')
      expect(result.stdout).toBe('')
      expect(result.exitCode).toBe(0)
    })

    test('执行失败的命令返回非零 exitCode', async () => {
      const bash = ToolRegistry.get('bash')
      expect(bash).toBeDefined()

      const result = (await bash!.execute({ command: 'false' })) as { exitCode: number }
      expect(result.exitCode).not.toBe(0)
    })
  })
})
