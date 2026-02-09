import { describe, expect, test } from 'bun:test'
import { LspProtocol } from '../src/lsp/protocol'

describe('LspProtocol', () => {
  test('createInitRequest 含正确的 method 和 rootUri', () => {
    const msg = LspProtocol.createInitRequest('file:///project')
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(1)
    expect(msg.method).toBe('initialize')
    const params = msg.params as Record<string, unknown>
    expect(params.rootUri).toBe('file:///project')
    expect(params.processId).toBe(process.pid)
  })

  test('createInitRequest 含 textDocument.diagnostic capability', () => {
    const msg = LspProtocol.createInitRequest('file:///project')
    const params = msg.params as Record<string, unknown>
    const caps = params.capabilities as Record<string, unknown>
    const textDoc = caps.textDocument as Record<string, unknown>
    expect(textDoc.diagnostic).toEqual({})
  })

  test('createDidOpenNotification 无 id（是通知不是请求）', () => {
    const msg = LspProtocol.createDidOpenNotification(
      'file:///test.ts',
      'typescript',
      1,
      'const x = 1',
    )
    expect(msg.id).toBeUndefined()
    expect(msg.method).toBe('textDocument/didOpen')
    const params = msg.params as Record<string, unknown>
    const textDoc = params.textDocument as Record<string, unknown>
    expect(textDoc.uri).toBe('file:///test.ts')
    expect(textDoc.languageId).toBe('typescript')
    expect(textDoc.version).toBe(1)
    expect(textDoc.text).toBe('const x = 1')
  })

  test('createDidChangeNotification 含 contentChanges', () => {
    const msg = LspProtocol.createDidChangeNotification('file:///test.ts', 2, 'const y = 2')
    expect(msg.id).toBeUndefined()
    expect(msg.method).toBe('textDocument/didChange')
    const params = msg.params as Record<string, unknown>
    const changes = params.contentChanges as Array<Record<string, unknown>>
    expect(changes).toHaveLength(1)
    expect(changes[0]!.text).toBe('const y = 2')
  })

  test('createDiagnosticRequest 含 textDocument.uri', () => {
    const msg = LspProtocol.createDiagnosticRequest('file:///test.ts')
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(2)
    expect(msg.method).toBe('textDocument/diagnostic')
    const params = msg.params as Record<string, unknown>
    const textDoc = params.textDocument as Record<string, unknown>
    expect(textDoc.uri).toBe('file:///test.ts')
  })

  test('parseDiagnostics 正确映射 severity', () => {
    const diagnostics = [
      {
        range: { start: { line: 10, character: 5 } },
        severity: 1,
        message: 'Type error',
        source: 'ts',
      },
      {
        range: { start: { line: 20, character: 0 } },
        severity: 2,
        message: 'Unused variable',
      },
      {
        range: { start: { line: 30, character: 3 } },
        severity: 4,
        message: 'Hint message',
      },
    ]
    const result = LspProtocol.parseDiagnostics('file:///test.ts', diagnostics)
    expect(result).toHaveLength(3)
    expect(result[0]!.severity).toBe('error')
    expect(result[0]!.line).toBe(10)
    expect(result[0]!.character).toBe(5)
    expect(result[0]!.source).toBe('ts')
    expect(result[1]!.severity).toBe('warning')
    expect(result[2]!.severity).toBe('hint')
  })

  test('parseDiagnostics 处理空数组返回空', () => {
    const result = LspProtocol.parseDiagnostics('file:///test.ts', [])
    expect(result).toEqual([])
  })

  test('encodeMessage + parseMessage 往返一致', () => {
    const original = LspProtocol.createInitRequest('file:///project')
    const encoded = LspProtocol.encodeMessage(original)
    expect(encoded).toContain('Content-Length:')
    expect(encoded).toContain('\r\n\r\n')
    const [, body] = encoded.split('\r\n\r\n')
    const parsed = LspProtocol.parseMessage(body!)
    expect(parsed.jsonrpc).toBe(original.jsonrpc)
    expect(parsed.id).toBe(original.id)
    expect(parsed.method).toBe(original.method)
  })
})
