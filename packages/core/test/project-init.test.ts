import { describe, expect, test } from 'bun:test'
import { VERSION } from '../src/index'

const ROOT = `${import.meta.dir}/../../..`

describe('SPEC-00: 项目初始化', () => {
  test('VERSION 导出为 0.1.0', () => {
    expect(VERSION).toBe('0.1.0')
  })

  test('axiom --version 输出版本号', async () => {
    const proc = Bun.spawn(['bun', 'run', 'packages/core/src/index.ts', '--', '--version'], {
      cwd: ROOT,
      stdout: 'pipe',
    })
    const output = await new Response(proc.stdout).text()
    expect(output.trim()).toBe('0.1.0')
  })

  test('axiom --help 包含 run 和 serve 子命令', async () => {
    const proc = Bun.spawn(['bun', 'run', 'packages/core/src/index.ts', '--', '--help'], {
      cwd: ROOT,
      stdout: 'pipe',
    })
    const output = await new Response(proc.stdout).text()
    expect(output).toContain('run')
    expect(output).toContain('serve')
  })

  test('turbo typecheck 通过', async () => {
    const proc = Bun.spawn(['bunx', 'turbo', 'typecheck'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const exitCode = await proc.exited
    expect(exitCode).toBe(0)
  })

  test('biome lint 通过', async () => {
    const proc = Bun.spawn(['bunx', 'biome', 'lint', '.'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const exitCode = await proc.exited
    expect(exitCode).toBe(0)
  })
})
