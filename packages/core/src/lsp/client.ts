import type { Subprocess } from 'bun'

/**
 * LspClient 命名空间 - LSP 客户端，启动子进程并通过 JSON-RPC 通信
 * LSP 使用 Content-Length header 格式，与 MCP 的换行分隔不同
 */
export namespace LspClient {
  /**
   * LSP 服务器配置
   */
  export type ServerConfig = {
    /** 命令路径（如 'typescript-language-server', 'rust-analyzer'） */
    command: string
    /** 命令参数 */
    args?: string[]
    /** 环境变量 */
    env?: Record<string, string>
  }

  /**
   * LSP 消息
   */
  export type LspMessage = {
    jsonrpc: '2.0'
    id?: number | string
    method?: string
    params?: unknown
    result?: unknown
    error?: {
      code: number
      message: string
      data?: unknown
    }
  }

  /**
   * LSP 连接对象
   */
  export type LspConnection = {
    /** 发送 JSON-RPC 请求 */
    call(method: string, params?: unknown): Promise<unknown>
    /** 初始化 LSP 服务器 */
    initialize(rootUri: string): Promise<unknown>
    /** 关闭连接 */
    close(): void
  }

  /**
   * 连接到 LSP 服务器
   * 1. 启动子进程
   * 2. 等待初始化
   * @param config - 服务器配置
   * @returns LSP 连接对象
   */
  export async function connect(config: ServerConfig): Promise<LspConnection> {
    // 启动子进程
    const proc = Bun.spawn([config.command, ...(config.args ?? [])], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        ...config.env,
      },
    })

    // 消息 ID 计数器
    let messageId = 0

    // 等待响应的 Promise 映射
    const pendingRequests = new Map<
      number,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >()

    // 输出缓冲区
    let outputBuffer = ''

    // 读取输出流
    const reader = proc.stdout.getReader()
    const processOutput = async () => {
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          outputBuffer += decoder.decode(value, { stream: true })

          // 处理完整的消息（LSP 使用 Content-Length header）
          while (true) {
            const parsed = parseNextLspMessage(outputBuffer)
            if (!parsed) break

            const { message, remaining } = parsed
            outputBuffer = remaining

            // 处理响应
            if (message.id !== undefined && (message.result !== undefined || message.error)) {
              const pending = pendingRequests.get(Number(message.id))
              if (pending) {
                pendingRequests.delete(Number(message.id))
                if (message.error) {
                  pending.reject(
                    new Error(`LSP Error ${message.error.code}: ${message.error.message}`),
                  )
                } else {
                  pending.resolve(message.result)
                }
              }
            }
          }
        }
      } catch (error) {
        // 关闭时拒绝所有等待的请求
        for (const pending of pendingRequests.values()) {
          pending.reject(new Error('Connection closed'))
        }
        pendingRequests.clear()
      }
    }

    // 启动输出处理（不等待）
    processOutput()

    // 发送请求的辅助函数
    const call = async (method: string, params?: unknown): Promise<unknown> => {
      const id = ++messageId
      const request: LspMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      }

      // 编码为 LSP 格式（Content-Length header）
      const encoded = encodeLspMessage(request)

      // 注册等待响应的 Promise
      const promise = new Promise<unknown>((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject })
      })

      // 发送请求
      proc.stdin.write(encoded)

      // 等待响应（超时 30 秒）
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000)),
      ])
    }

    // 返回连接对象
    return {
      async call(method: string, params?: unknown): Promise<unknown> {
        return call(method, params)
      },

      async initialize(rootUri: string): Promise<unknown> {
        const result = await call('initialize', {
          processId: process.pid,
          rootUri,
          capabilities: {},
          clientInfo: {
            name: 'axiom',
            version: '0.1.0',
          },
        })

        // 发送 initialized 通知
        const initializedNotification: LspMessage = {
          jsonrpc: '2.0',
          method: 'initialized',
          params: {},
        }
        const encoded = encodeLspMessage(initializedNotification)
        proc.stdin.write(encoded)

        return result
      },

      close(): void {
        // 发送 shutdown 请求
        call('shutdown', {}).catch(() => {})
        // 发送 exit 通知
        const exitNotification: LspMessage = {
          jsonrpc: '2.0',
          method: 'exit',
          params: {},
        }
        const encoded = encodeLspMessage(exitNotification)
        proc.stdin.write(encoded)

        proc.kill()
        reader.cancel()
        pendingRequests.clear()
      },
    }
  }

  /**
   * 编码 LSP 消息为带 Content-Length 的字符串
   */
  function encodeLspMessage(msg: LspMessage): string {
    const json = JSON.stringify(msg)
    const len = Buffer.byteLength(json, 'utf-8')
    return `Content-Length: ${len}\r\n\r\n${json}`
  }

  /**
   * 解析下一个完整的 LSP 消息
   * LSP 格式: Content-Length: {length}\r\n\r\n{json}
   */
  function parseNextLspMessage(buffer: string): { message: LspMessage; remaining: string } | null {
    // 查找 Content-Length header
    const headerMatch = buffer.match(/^Content-Length: (\d+)\r\n\r\n/)
    if (!headerMatch) return null

    const contentLength = Number.parseInt(headerMatch[1] ?? '0', 10)
    const headerLength = headerMatch[0].length

    // 检查是否有完整的消息体
    if (buffer.length < headerLength + contentLength) return null

    const messageBody = buffer.slice(headerLength, headerLength + contentLength)
    const remaining = buffer.slice(headerLength + contentLength)

    try {
      const message = JSON.parse(messageBody) as LspMessage
      return { message, remaining }
    } catch {
      // 解析失败，跳过这个消息
      return parseNextLspMessage(remaining)
    }
  }
}
