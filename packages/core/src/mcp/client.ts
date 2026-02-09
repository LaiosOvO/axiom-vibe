import type { Subprocess } from 'bun'
import { McpProcess } from './process'

/**
 * McpClient 命名空间 - MCP 客户端，启动子进程并通过 JSON-RPC 通信
 */
export namespace McpClient {
  /**
   * MCP 服务器配置
   */
  export type ServerConfig = {
    /** 命令路径（如 'node', 'python', 'bun'） */
    command: string
    /** 命令参数 */
    args?: string[]
    /** 环境变量 */
    env?: Record<string, string>
  }

  /**
   * 工具定义
   */
  export type ToolDefinition = {
    name: string
    description: string
    inputSchema: unknown
  }

  /**
   * MCP 连接对象
   */
  export type McpConnection = {
    /** 发送 JSON-RPC 请求 */
    call(method: string, params?: unknown): Promise<unknown>
    /** 列出可用工具 */
    listTools(): Promise<ToolDefinition[]>
    /** 调用工具 */
    callTool(name: string, args: unknown): Promise<unknown>
    /** 关闭连接 */
    close(): void
  }

  /**
   * 连接到 MCP 服务器
   * 1. 启动子进程
   * 2. 发送 initialize 请求
   * 3. 发送 initialized 通知
   * @param config - 服务器配置
   * @returns MCP 连接对象
   */
  export async function connect(config: ServerConfig): Promise<McpConnection> {
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

          // 处理完整的消息
          while (true) {
            const parsed = parseNextMessage(outputBuffer)
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
                    new Error(`MCP Error ${message.error.code}: ${message.error.message}`),
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
      const request = McpProcess.createRequest(method, params, id)
      const encoded = McpProcess.encodeMessage(request)

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

    // 初始化握手
    try {
      // 1. 发送 initialize 请求
      const initResult = await call('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'axiom',
          version: '0.1.0',
        },
      })

      // 2. 发送 initialized 通知（notification 不需要 id）
      const initializedNotification: McpProcess.Message = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      }
      const encoded = McpProcess.encodeMessage(initializedNotification)
      proc.stdin.write(encoded)
    } catch (error) {
      proc.kill()
      throw new Error(`MCP 初始化失败: ${error instanceof Error ? error.message : String(error)}`)
    }

    // 返回连接对象
    return {
      async call(method: string, params?: unknown): Promise<unknown> {
        return call(method, params)
      },

      async listTools(): Promise<ToolDefinition[]> {
        const result = (await call('tools/list', {})) as { tools: ToolDefinition[] }
        return result.tools ?? []
      },

      async callTool(name: string, args: unknown): Promise<unknown> {
        const result = (await call('tools/call', { name, arguments: args })) as {
          content: Array<{ type: string; text?: string }>
        }
        // 提取文本内容
        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content.find((c) => c.type === 'text')
          return textContent?.text ?? result
        }
        return result
      },

      close(): void {
        proc.kill()
        reader.cancel()
        pendingRequests.clear()
      },
    }
  }

  /**
   * 解析下一个完整的 JSON-RPC 消息
   * MCP 使用换行分隔的 JSON 消息（不是 LSP 的 Content-Length 格式）
   */
  function parseNextMessage(
    buffer: string,
  ): { message: McpProcess.Message; remaining: string } | null {
    const newlineIndex = buffer.indexOf('\n')
    if (newlineIndex === -1) return null

    const line = buffer.slice(0, newlineIndex).trim()
    const remaining = buffer.slice(newlineIndex + 1)

    if (!line) {
      // 空行，跳过
      return parseNextMessage(remaining)
    }

    try {
      const message = McpProcess.parseMessage(line)
      return { message, remaining }
    } catch {
      // 解析失败，跳过这一行
      return parseNextMessage(remaining)
    }
  }
}
