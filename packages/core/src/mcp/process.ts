import { z } from 'zod'

export namespace McpProcess {
  export const Message = z.object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]).optional(),
    method: z.string().optional(),
    params: z.unknown().optional(),
    result: z.unknown().optional(),
    error: z
      .object({
        code: z.number(),
        message: z.string(),
        data: z.unknown().optional(),
      })
      .optional(),
  })
  export type Message = z.infer<typeof Message>

  // 构建 JSON-RPC 请求
  export function createRequest(method: string, params?: unknown, id?: number): Message {
    return {
      jsonrpc: '2.0',
      id: id ?? 1,
      method,
      params,
    }
  }

  // 构建 JSON-RPC 响应
  export function createResponse(id: number | string, result: unknown): Message {
    return {
      jsonrpc: '2.0',
      id,
      result,
    }
  }

  // 构建 JSON-RPC 错误响应
  export function createError(id: number | string, code: number, message: string): Message {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    }
  }

  // 解析 JSON-RPC 消息（从 Content-Length 分隔的流中）
  export function parseMessage(raw: string): Message {
    const parsed = JSON.parse(raw)
    return Message.parse(parsed)
  }

  // 编码 JSON-RPC 消息为带 Content-Length 的字符串
  export function encodeMessage(msg: Message): string {
    const json = JSON.stringify(msg)
    const len = Buffer.byteLength(json, 'utf-8')
    return `Content-Length: ${len}\r\n\r\n${json}`
  }

  // 创建 initialize 请求
  export function createInitRequest(clientName: string, clientVersion: string): Message {
    return {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: clientName,
          version: clientVersion,
        },
      },
    }
  }

  // 创建 tools/list 请求
  export function createToolsListRequest(): Message {
    return {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }
  }
}
