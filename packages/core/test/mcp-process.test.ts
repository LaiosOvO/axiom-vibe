import { beforeEach, describe, expect, it } from 'bun:test'
import { McpProcess } from '../src/mcp/process'

describe('McpProcess', () => {
  it('createRequest 返回正确的 JSON-RPC 格式', () => {
    const msg = McpProcess.createRequest('test/method', { key: 'value' }, 42)
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(42)
    expect(msg.method).toBe('test/method')
    expect(msg.params).toEqual({ key: 'value' })
  })

  it('createRequest 默认 id 为 1', () => {
    const msg = McpProcess.createRequest('test/method')
    expect(msg.id).toBe(1)
  })

  it('createResponse 返回正确的响应', () => {
    const msg = McpProcess.createResponse(42, { result: 'success' })
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(42)
    expect(msg.result).toEqual({ result: 'success' })
    expect(msg.method).toBeUndefined()
    expect(msg.error).toBeUndefined()
  })

  it('createError 返回含 error 字段的消息', () => {
    const msg = McpProcess.createError(42, -32600, 'Invalid Request')
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(42)
    expect(msg.error).toBeDefined()
    expect(msg.error?.code).toBe(-32600)
    expect(msg.error?.message).toBe('Invalid Request')
    expect(msg.result).toBeUndefined()
  })

  it('parseMessage 解析合法 JSON', () => {
    const raw = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'test',
      params: { key: 'value' },
    })
    const msg = McpProcess.parseMessage(raw)
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(1)
    expect(msg.method).toBe('test')
    expect(msg.params).toEqual({ key: 'value' })
  })

  it('parseMessage 对非法 JSON 抛出错误', () => {
    expect(() => {
      McpProcess.parseMessage('invalid json {')
    }).toThrow()
  })

  it('parseMessage 对不符合 schema 的数据抛出错误', () => {
    const raw = JSON.stringify({
      jsonrpc: '1.0',
      id: 1,
    })
    expect(() => {
      McpProcess.parseMessage(raw)
    }).toThrow()
  })

  it('encodeMessage 包含 Content-Length header', () => {
    const msg = McpProcess.createRequest('test', { key: 'value' })
    const encoded = McpProcess.encodeMessage(msg)
    expect(encoded).toContain('Content-Length:')
    expect(encoded).toContain('\r\n\r\n')
    const parts = encoded.split('\r\n\r\n')
    const header = parts[0]
    const body = parts[1]
    expect(header).toMatch(/^Content-Length: \d+$/)
    const json = JSON.parse(body ?? '')
    expect(json.jsonrpc).toBe('2.0')
  })

  it('encodeMessage 正确计算字节长度', () => {
    const msg = McpProcess.createRequest('test')
    const encoded = McpProcess.encodeMessage(msg)
    const parts = encoded.split('\r\n\r\n')
    const header = parts[0]
    const body = parts[1]
    const lengthMatch = header?.match(/Content-Length: (\d+)/)
    const declaredLength = Number.parseInt(lengthMatch?.[1] ?? '0', 10)
    const actualLength = Buffer.byteLength(body ?? '', 'utf-8')
    expect(declaredLength).toBe(actualLength)
  })

  it('createInitRequest 含正确的 method 和 clientInfo', () => {
    const msg = McpProcess.createInitRequest('MyClient', '1.0.0')
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(1)
    expect(msg.method).toBe('initialize')
    expect(msg.params).toBeDefined()
    const params = msg.params as Record<string, unknown>
    expect(params.protocolVersion).toBe('2024-11-05')
    expect(params.capabilities).toEqual({})
    const clientInfo = params.clientInfo as Record<string, unknown>
    expect(clientInfo.name).toBe('MyClient')
    expect(clientInfo.version).toBe('1.0.0')
  })

  it('createToolsListRequest 含正确的 method', () => {
    const msg = McpProcess.createToolsListRequest()
    expect(msg.jsonrpc).toBe('2.0')
    expect(msg.id).toBe(1)
    expect(msg.method).toBe('tools/list')
    expect(msg.params).toEqual({})
  })

  it('Message schema 验证 id 可以是字符串或数字', () => {
    const msgWithStringId = McpProcess.createResponse('string-id', { result: 'ok' })
    expect(msgWithStringId.id).toBe('string-id')

    const msgWithNumberId = McpProcess.createResponse(123, { result: 'ok' })
    expect(msgWithNumberId.id).toBe(123)
  })

  it('encodeMessage 和 parseMessage 往返一致', () => {
    const original = McpProcess.createRequest('test/method', { data: 'test' }, 99)
    const encoded = McpProcess.encodeMessage(original)
    const [, body] = encoded.split('\r\n\r\n')
    const parsed = McpProcess.parseMessage(body!)
    expect(parsed.jsonrpc).toBe(original.jsonrpc)
    expect(parsed.id).toBe(original.id)
    expect(parsed.method).toBe(original.method)
    expect(parsed.params).toEqual(original.params)
  })
})
