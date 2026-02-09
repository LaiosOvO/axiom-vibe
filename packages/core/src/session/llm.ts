import { generateText, jsonSchema, streamText, tool } from 'ai'
import type { CoreMessage, LanguageModel } from 'ai'

/**
 * LLM 命名空间 - 封装 Vercel AI SDK 的流式调用
 */
export namespace LLM {
  /**
   * 流式输入配置
   */
  export type StreamInput = {
    /** AI SDK 的语言模型实例 */
    model: LanguageModel
    /** 系统提示词数组 */
    system?: string[]
    /** 消息历史 */
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    /** 工具定义（可选） */
    tools?: Record<
      string,
      {
        description: string
        parameters: unknown
        execute: (args: unknown) => Promise<unknown>
      }
    >
    /** 最大生成 token 数 */
    maxOutputTokens?: number
    /** 温度参数 (0-2) */
    temperature?: number
    /** 中止信号 */
    abortSignal?: AbortSignal
  }

  /**
   * 流式事件类型
   */
  export type StreamEvent =
    | { type: 'text-delta'; text: string }
    | { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
    | { type: 'tool-result'; toolCallId: string; output: unknown }
    | {
        type: 'finish'
        usage: { inputTokens: number; outputTokens: number; totalTokens: number }
      }
    | { type: 'error'; error: unknown }

  /**
   * 生成结果
   */
  export type GenerateResult = {
    text: string
    usage: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
    }
    finishReason: string
  }

  /**
   * 流式调用 LLM，返回事件流
   */
  export async function* stream(input: StreamInput): AsyncGenerator<StreamEvent> {
    try {
      // 转换消息格式: Session.Message -> CoreMessage
      const coreMessages: CoreMessage[] = input.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // 转换工具格式: ToolRegistry -> AI SDK tools
      const coreTools: Record<string, ReturnType<typeof tool>> = {}
      if (input.tools) {
        for (const [name, toolDef] of Object.entries(input.tools)) {
          // @ts-expect-error - tool 函数的类型推断无法处理 unknown 类型的 parameters
          coreTools[name] = tool({
            description: toolDef.description,
            parameters: jsonSchema(toolDef.parameters),
            // @ts-expect-error - execute 函数的签名与 AI SDK 的要求不完全匹配
            execute: toolDef.execute,
          })
        }
      }

      // 调用 streamText
      const result = streamText({
        model: input.model,
        system: input.system?.join('\n\n'),
        messages: coreMessages,
        tools: Object.keys(coreTools).length > 0 ? coreTools : undefined,
        maxOutputTokens: input.maxOutputTokens,
        temperature: input.temperature,
        abortSignal: input.abortSignal,
      })

      // 遍历 fullStream 并转换为 StreamEvent
      for await (const chunk of result.fullStream) {
        switch (chunk.type) {
          case 'text-delta':
            yield {
              type: 'text-delta',
              text: chunk.text,
            }
            break

          case 'tool-call':
            yield {
              type: 'tool-call',
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              input: chunk.input,
            }
            break

          case 'tool-result':
            yield {
              type: 'tool-result',
              toolCallId: chunk.toolCallId,
              output: chunk.output,
            }
            break

          case 'finish':
            yield {
              type: 'finish',
              usage: {
                inputTokens: chunk.totalUsage.inputTokens ?? 0,
                outputTokens: chunk.totalUsage.outputTokens ?? 0,
                totalTokens: chunk.totalUsage.totalTokens ?? 0,
              },
            }
            break

          case 'error':
            yield {
              type: 'error',
              error: chunk.error,
            }
            break
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error,
      }
    }
  }

  /**
   * 非流式调用 LLM，直接返回完整结果
   */
  export async function generate(input: Omit<StreamInput, 'abortSignal'>): Promise<GenerateResult> {
    // 转换消息格式
    const coreMessages: CoreMessage[] = input.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    // 转换工具格式
    const coreTools: Record<string, ReturnType<typeof tool>> = {}
    if (input.tools) {
      for (const [name, toolDef] of Object.entries(input.tools)) {
        // @ts-expect-error - tool 函数的类型推断无法处理 unknown 类型的 parameters
        coreTools[name] = tool({
          description: toolDef.description,
          parameters: jsonSchema(toolDef.parameters),
          // @ts-expect-error - execute 函数的签名与 AI SDK 的要求不完全匹配
          execute: toolDef.execute,
        })
      }
    }

    // 调用 generateText
    const result = await generateText({
      model: input.model,
      system: input.system?.join('\n\n'),
      messages: coreMessages,
      tools: Object.keys(coreTools).length > 0 ? coreTools : undefined,
      maxOutputTokens: input.maxOutputTokens,
      temperature: input.temperature,
    })

    return {
      text: result.text,
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
      },
      finishReason: result.finishReason,
    }
  }
}
