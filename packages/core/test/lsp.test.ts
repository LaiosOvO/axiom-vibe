import { beforeEach, describe, expect, it } from 'bun:test'
import { LspDiagnostic, LspServer } from '../src/lsp'

describe('LspServer', () => {
  beforeEach(() => {
    LspServer.reset()
  })

  it('获取内置 typescript 服务器', () => {
    const ts = LspServer.get('typescript')
    expect(ts).toBeDefined()
    expect(ts?.language).toBe('typescript')
    expect(ts?.status).toBe('stopped')
    expect(ts?.config.command).toEqual(['typescript-language-server', '--stdio'])
    expect(ts?.config.extensions).toContain('.ts')
    expect(ts?.config.extensions).toContain('.tsx')
  })

  it('列出所有 LSP 服务器至少 5 个内置', () => {
    const servers = LspServer.list()
    expect(servers.length).toBeGreaterThanOrEqual(5)
    const languages = servers.map((s) => s.language)
    expect(languages).toContain('typescript')
    expect(languages).toContain('python')
    expect(languages).toContain('go')
    expect(languages).toContain('rust')
    expect(languages).toContain('json')
  })

  it('通过文件扩展名查找 LSP 服务器', () => {
    const ts = LspServer.getByExtension('.ts')
    expect(ts).toBeDefined()
    expect(ts?.language).toBe('typescript')

    const py = LspServer.getByExtension('.py')
    expect(py).toBeDefined()
    expect(py?.language).toBe('python')

    const go = LspServer.getByExtension('.go')
    expect(go).toBeDefined()
    expect(go?.language).toBe('go')
  })

  it('注册自定义 LSP 服务器', () => {
    const javaConfig = {
      language: 'java',
      command: ['java-language-server'],
      extensions: ['.java'],
    }
    LspServer.register(javaConfig)

    const java = LspServer.get('java')
    expect(java).toBeDefined()
    expect(java?.language).toBe('java')
    expect(java?.status).toBe('stopped')
    expect(java?.config.extensions).toContain('.java')
  })

  it('更新 LSP 服务器状态', () => {
    LspServer.updateStatus('typescript', 'running')
    let ts = LspServer.get('typescript')
    expect(ts?.status).toBe('running')

    LspServer.updateStatus('typescript', 'error', 'Connection failed')
    ts = LspServer.get('typescript')
    expect(ts?.status).toBe('error')
    expect(ts?.error).toBe('Connection failed')

    LspServer.updateStatus('typescript', 'stopped')
    ts = LspServer.get('typescript')
    expect(ts?.status).toBe('stopped')
    expect(ts?.error).toBeUndefined()
  })

  it('删除 LSP 服务器', () => {
    let ts = LspServer.get('typescript')
    expect(ts).toBeDefined()

    LspServer.remove('typescript')
    ts = LspServer.get('typescript')
    expect(ts).toBeUndefined()

    const servers = LspServer.list()
    expect(servers.map((s) => s.language)).not.toContain('typescript')
  })

  it('诊断信息 Schema 验证', () => {
    const validDiagnostic = {
      file: '/path/to/file.ts',
      line: 10,
      character: 5,
      severity: 'error' as const,
      message: 'Type error',
      source: 'typescript',
    }
    const parsed = LspDiagnostic.Info.parse(validDiagnostic)
    expect(parsed.file).toBe('/path/to/file.ts')
    expect(parsed.severity).toBe('error')

    const minimalDiagnostic = {
      file: '/path/to/file.ts',
      line: 1,
      character: 0,
      severity: 'warning' as const,
      message: 'Warning message',
    }
    const parsed2 = LspDiagnostic.Info.parse(minimalDiagnostic)
    expect(parsed2.source).toBeUndefined()
  })
})
