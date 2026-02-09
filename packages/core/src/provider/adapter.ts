import { z } from 'zod'

export namespace AiAdapter {
  export const GenerateOptions = z.object({
    model: z.string(),
    system: z.string().optional(),
    messages: z.array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      }),
    ),
    maxTokens: z.number().optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  export type GenerateOptions = z.infer<typeof GenerateOptions>

  export const GenerateResult = z.object({
    text: z.string(),
    usage: z
      .object({
        promptTokens: z.number(),
        completionTokens: z.number(),
        totalTokens: z.number(),
      })
      .optional(),
    finishReason: z.string().optional(),
  })
  export type GenerateResult = z.infer<typeof GenerateResult>

  export const StreamEvent = z.object({
    type: z.enum(['text-delta', 'finish', 'error']),
    text: z.string().optional(),
    error: z.string().optional(),
  })
  export type StreamEvent = z.infer<typeof StreamEvent>

  /**
   * 创建 provider model string: "providerId:modelName" 格式
   */
  export function createModelId(providerId: string, modelName: string): string {
    return `${providerId}/${modelName}`
  }

  export function parseModelId(modelId: string): {
    providerId: string
    modelName: string
  } {
    const separator = modelId.includes('/') ? '/' : ':'
    const parts = modelId.split(separator)
    const providerId = parts[0] ?? ''
    const modelName = parts.slice(1).join(separator)
    return { providerId, modelName }
  }

  /**
   * 构建 generateText 的参数（不真正调 AI SDK，只做参数构建）
   */
  export function buildGenerateParams(options: GenerateOptions): {
    model: string
    system?: string
    messages: Array<{ role: string; content: string }>
    maxTokens?: number
    temperature?: number
  } {
    return {
      model: options.model,
      system: options.system,
      messages: options.messages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    }
  }

  /**
   * 构建流式请求参数
   */
  export function buildStreamParams(options: GenerateOptions): {
    model: string
    system?: string
    messages: Array<{ role: string; content: string }>
    maxTokens?: number
    temperature?: number
  } {
    return {
      model: options.model,
      system: options.system,
      messages: options.messages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    }
  }

  /**
   * 将 AI SDK 的原始结果标准化为 GenerateResult
   */
  export function normalizeResult(raw: {
    text?: string
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
    finishReason?: string
  }): GenerateResult {
    return {
      text: raw.text ?? '',
      usage: raw.usage
        ? {
            promptTokens: raw.usage.promptTokens ?? 0,
            completionTokens: raw.usage.completionTokens ?? 0,
            totalTokens: raw.usage.totalTokens ?? 0,
          }
        : undefined,
      finishReason: raw.finishReason,
    }
  }

  /**
   * 将 AI SDK 的流 delta 标准化为 StreamEvent
   */
  export function normalizeStreamDelta(delta: {
    type: string
    textDelta?: string
  }): StreamEvent {
    if (delta.type === 'text-delta') {
      return {
        type: 'text-delta' as const,
        text: delta.textDelta ?? '',
      }
    }
    return {
      type: 'finish' as const,
    }
  }
}
