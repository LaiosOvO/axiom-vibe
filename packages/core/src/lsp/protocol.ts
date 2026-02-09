// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace LspProtocol {
  // LSP 消息基础格式（与 JSON-RPC 2.0 兼容）
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

  // LSP 诊断严重程度
  export const DiagnosticSeverity = {
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4,
  } as const

  export interface DiagnosticInfo {
    file: string
    line: number
    character: number
    severity: 'error' | 'warning' | 'info' | 'hint'
    message: string
    source?: string
  }

  // 构建 initialize 请求
  export function createInitRequest(
    rootUri: string,
    capabilities?: Record<string, unknown>,
  ): Message {
    return {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri,
        capabilities: {
          textDocument: {
            diagnostic: {},
          },
          ...capabilities,
        },
      },
    }
  }

  // 构建 textDocument/didOpen 通知
  export function createDidOpenNotification(
    uri: string,
    languageId: string,
    version: number,
    text: string,
  ): Message {
    return {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId,
          version,
          text,
        },
      },
    }
  }

  // 构建 textDocument/didChange 通知
  export function createDidChangeNotification(uri: string, version: number, text: string): Message {
    return {
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri,
          version,
        },
        contentChanges: [
          {
            text,
          },
        ],
      },
    }
  }

  // 构建 textDocument/diagnostic 请求
  export function createDiagnosticRequest(uri: string): Message {
    return {
      jsonrpc: '2.0',
      id: 2,
      method: 'textDocument/diagnostic',
      params: {
        textDocument: {
          uri,
        },
      },
    }
  }

  // 解析诊断响应，转为 DiagnosticInfo 格式
  export function parseDiagnostics(uri: string, diagnostics: unknown[]): DiagnosticInfo[] {
    if (!Array.isArray(diagnostics)) {
      return []
    }

    const result: DiagnosticInfo[] = []

    for (const diag of diagnostics) {
      if (typeof diag !== 'object' || diag === null) {
        continue
      }

      const d = diag as Record<string, unknown>
      const severity = d.severity as number | undefined
      const severityMap: Record<number, 'error' | 'warning' | 'info' | 'hint'> = {
        1: 'error',
        2: 'warning',
        3: 'info',
        4: 'hint',
      }

      const range = d.range as Record<string, unknown> | undefined
      const start = range?.start as Record<string, unknown> | undefined

      const info: DiagnosticInfo = {
        file: uri,
        line: (start?.line as number) ?? 0,
        character: (start?.character as number) ?? 0,
        severity: severityMap[(severity as number) ?? 3] ?? 'info',
        message: (d.message as string) ?? '',
      }

      if (typeof d.source === 'string') {
        info.source = d.source
      }

      result.push(info)
    }

    return result
  }

  // 编码 LSP 消息为带 Content-Length 的字符串
  export function encodeMessage(msg: Message): string {
    const json = JSON.stringify(msg)
    const length = Buffer.byteLength(json, 'utf-8')
    return `Content-Length: ${length}\r\n\r\n${json}`
  }

  // 解析 LSP 消息
  export function parseMessage(raw: string): Message {
    const parsed = JSON.parse(raw)
    return Message.parse(parsed)
  }
}
