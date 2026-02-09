import type { Provider } from './index'

/**
 * Provider 转换命名空间 — 处理不同 provider 的参数转换
 * 参考 opencode 的 transform.ts 实现
 */
export namespace ProviderTransform {
  export function sdkKey(npm: string): string | undefined {
    switch (npm) {
      case '@ai-sdk/openai':
      case '@ai-sdk/azure':
        return 'openai'
      case '@ai-sdk/anthropic':
        return 'anthropic'
      case '@ai-sdk/google-vertex':
      case '@ai-sdk/google':
        return 'google'
      case '@ai-sdk/gateway':
        return 'gateway'
      case '@openrouter/ai-sdk-provider':
        return 'openrouter'
      default:
        return undefined
    }
  }

  export function temperature(model: Provider.Model): number | undefined {
    const id = model.id.toLowerCase()
    if (id.includes('qwen')) return 0.55
    if (id.includes('claude')) return undefined
    if (id.includes('gemini')) return 1.0
    if (id.includes('glm-4.6') || id.includes('glm-4.7')) return 1.0
    if (id.includes('minimax-m2')) return 1.0
    if (id.includes('kimi-k2')) {
      return id.includes('thinking') ? 1.0 : 0.6
    }
    return undefined
  }

  export function topP(model: Provider.Model): number | undefined {
    const id = model.id.toLowerCase()
    if (id.includes('qwen')) return 1
    if (id.includes('minimax-m2')) return 0.95
    if (id.includes('gemini')) return 0.95
    return undefined
  }

  export function topK(model: Provider.Model): number | undefined {
    const id = model.id.toLowerCase()
    if (id.includes('minimax-m2')) {
      return id.includes('m2.1') ? 40 : 20
    }
    if (id.includes('gemini')) return 64
    return undefined
  }

  const WIDELY_SUPPORTED_EFFORTS = ['low', 'medium', 'high']

  export function variants(model: Provider.Model): Record<string, Record<string, unknown>> {
    if (!model.capabilities.reasoning) return {}

    const id = model.id.toLowerCase()

    if (
      id.includes('deepseek') ||
      id.includes('minimax') ||
      id.includes('glm') ||
      id.includes('mistral')
    ) {
      return {}
    }

    if (id.includes('grok') && id.includes('grok-3-mini')) {
      if (model.api.npm === '@openrouter/ai-sdk-provider') {
        return {
          low: { reasoning: { effort: 'low' } },
          high: { reasoning: { effort: 'high' } },
        }
      }
      return {
        low: { reasoningEffort: 'low' },
        high: { reasoningEffort: 'high' },
      }
    }
    if (id.includes('grok')) return {}

    switch (model.api.npm) {
      case '@openrouter/ai-sdk-provider': {
        if (!model.id.includes('gpt') && !model.id.includes('gemini-3')) return {}
        const efforts = ['none', 'minimal', ...WIDELY_SUPPORTED_EFFORTS, 'xhigh']
        return Object.fromEntries(efforts.map((e) => [e, { reasoning: { effort: e } }]))
      }

      case '@ai-sdk/gateway': {
        const efforts = ['none', 'minimal', ...WIDELY_SUPPORTED_EFFORTS, 'xhigh']
        return Object.fromEntries(efforts.map((e) => [e, { reasoningEffort: e }]))
      }

      case '@ai-sdk/xai':
      case '@ai-sdk/openai-compatible':
        return Object.fromEntries(WIDELY_SUPPORTED_EFFORTS.map((e) => [e, { reasoningEffort: e }]))

      case '@ai-sdk/openai': {
        if (id === 'gpt-5-pro') return {}
        const arr = [...WIDELY_SUPPORTED_EFFORTS]
        if (id.includes('gpt-5-') || id === 'gpt-5') arr.unshift('minimal')
        if (model.release_date >= '2025-11-13') arr.unshift('none')
        if (model.release_date >= '2025-12-04') arr.push('xhigh')
        return Object.fromEntries(
          arr.map((e) => [
            e,
            {
              reasoningEffort: e,
              reasoningSummary: 'auto',
              include: ['reasoning.encrypted_content'],
            },
          ]),
        )
      }

      case '@ai-sdk/anthropic':
        return {
          high: { thinking: { type: 'enabled', budgetTokens: 16000 } },
          max: { thinking: { type: 'enabled', budgetTokens: 31999 } },
        }

      case '@ai-sdk/google-vertex':
      case '@ai-sdk/google': {
        if (id.includes('2.5')) {
          return {
            high: { thinkingConfig: { includeThoughts: true, thinkingBudget: 16000 } },
            max: { thinkingConfig: { includeThoughts: true, thinkingBudget: 24576 } },
          }
        }
        return Object.fromEntries(
          ['low', 'high'].map((e) => [e, { includeThoughts: true, thinkingLevel: e }]),
        )
      }

      case '@ai-sdk/groq': {
        const efforts = ['none', ...WIDELY_SUPPORTED_EFFORTS]
        return Object.fromEntries(
          efforts.map((e) => [e, { includeThoughts: true, thinkingLevel: e }]),
        )
      }

      default:
        return {}
    }
  }

  export function options(input: {
    model: Provider.Model
    sessionID: string
    providerOptions?: Record<string, unknown>
  }): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (input.model.providerID === 'openai' || input.model.api.npm === '@ai-sdk/openai') {
      result.store = false
    }

    if (input.model.api.npm === '@openrouter/ai-sdk-provider') {
      result.usage = { include: true }
      if (input.model.api.id.includes('gemini-3')) {
        result.reasoning = { effort: 'high' }
      }
    }

    if (input.model.providerID === 'openai' || input.providerOptions?.setCacheKey) {
      result.promptCacheKey = input.sessionID
    }

    if (
      input.model.api.npm === '@ai-sdk/google' ||
      input.model.api.npm === '@ai-sdk/google-vertex'
    ) {
      const thinkingConfig: Record<string, unknown> = { includeThoughts: true }
      if (input.model.api.id.includes('gemini-3')) {
        thinkingConfig.thinkingLevel = 'high'
      }
      result.thinkingConfig = thinkingConfig
    }

    if (input.model.api.id.includes('gpt-5') && !input.model.api.id.includes('gpt-5-chat')) {
      if (!input.model.api.id.includes('gpt-5-pro')) {
        result.reasoningEffort = 'medium'
      }
      if (
        input.model.api.id.includes('gpt-5.') &&
        !input.model.api.id.includes('codex') &&
        input.model.providerID !== 'azure'
      ) {
        result.textVerbosity = 'low'
      }
    }

    return result
  }

  export function smallOptions(model: Provider.Model): Record<string, unknown> {
    if (model.providerID === 'openai' || model.api.id.includes('gpt-5')) {
      return model.api.id.includes('5.')
        ? { reasoningEffort: 'low' }
        : { reasoningEffort: 'minimal' }
    }
    if (model.providerID === 'google') {
      return model.api.id.includes('gemini-3')
        ? { thinkingConfig: { thinkingLevel: 'minimal' } }
        : { thinkingConfig: { thinkingBudget: 0 } }
    }
    if (model.providerID === 'openrouter') {
      return model.api.id.includes('google')
        ? { reasoning: { enabled: false } }
        : { reasoningEffort: 'minimal' }
    }
    return {}
  }

  export function providerOptions(
    model: Provider.Model,
    opts: Record<string, unknown>,
  ): Record<string, unknown> {
    const key = sdkKey(model.api.npm) ?? model.providerID
    return { [key]: opts }
  }

  export function maxOutputTokens(
    npm: string,
    opts: Record<string, unknown>,
    modelLimit: number,
    globalLimit: number,
  ): number {
    const modelCap = modelLimit || globalLimit
    const standardLimit = Math.min(modelCap, globalLimit)

    if (npm === '@ai-sdk/anthropic') {
      const thinking = opts?.thinking as Record<string, unknown> | undefined
      const budgetTokens = typeof thinking?.budgetTokens === 'number' ? thinking.budgetTokens : 0
      const enabled = thinking?.type === 'enabled'
      if (enabled && budgetTokens > 0) {
        if (budgetTokens + standardLimit <= modelCap) {
          return standardLimit
        }
        return modelCap - budgetTokens
      }
    }

    return standardLimit
  }
}
