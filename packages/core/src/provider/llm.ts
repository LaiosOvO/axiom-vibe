import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createXai } from '@ai-sdk/xai'
import type { LanguageModel, Provider as SDK } from 'ai'
import type { Provider } from './index'

/**
 * ProviderFactory — 参考 opencode 的 SDK 工厂模式
 *
 * 根据 model.api.npm 决定使用哪个 SDK:
 * - BUNDLED: @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/groq, @ai-sdk/mistral, @ai-sdk/xai
 * - OPENAI_COMPATIBLE: @ai-sdk/openai-compatible（deepseek, moonshot, dashscope, zhipu, together, fireworks 等）
 *
 * openai 特殊处理: 使用 sdk.responses(modelID) 而非 sdk.languageModel(modelID)
 */
export namespace ProviderFactory {
  // npm 包名 -> create 函数
  const BUNDLED_PROVIDERS: Record<string, (options: Record<string, unknown>) => SDK> = {
    '@ai-sdk/anthropic': createAnthropic as unknown as (options: Record<string, unknown>) => SDK,
    '@ai-sdk/openai': createOpenAI as unknown as (options: Record<string, unknown>) => SDK,
    '@ai-sdk/google': createGoogleGenerativeAI as unknown as (
      options: Record<string, unknown>,
    ) => SDK,
    '@ai-sdk/groq': createGroq as unknown as (options: Record<string, unknown>) => SDK,
    '@ai-sdk/mistral': createMistral as unknown as (options: Record<string, unknown>) => SDK,
    '@ai-sdk/xai': createXai as unknown as (options: Record<string, unknown>) => SDK,
  }

  // providerId -> npm 包名 映射（不在 model 元数据中时使用的 fallback）
  const PROVIDER_NPM_MAP: Record<string, string> = {
    anthropic: '@ai-sdk/anthropic',
    openai: '@ai-sdk/openai',
    google: '@ai-sdk/google',
    groq: '@ai-sdk/groq',
    mistral: '@ai-sdk/mistral',
    xai: '@ai-sdk/xai',
  }

  // OpenAI 兼容 provider 的默认 baseURL（model 元数据中没有 api.url 时使用的 fallback）
  const COMPATIBLE_URLS: Record<string, string> = {
    deepseek: 'https://api.deepseek.com/v1',
    moonshot: 'https://api.moonshot.cn/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    dashscope: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    together: 'https://api.together.xyz/v1',
    fireworks: 'https://api.fireworks.ai/inference/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    cohere: 'https://api.cohere.ai/v1',
    perplexity: 'https://api.perplexity.ai',
    ollama: 'http://localhost:11434/v1',
    lmstudio: 'http://localhost:1234/v1',
  }

  // providerId -> envVar 名 映射
  const ENV_MAP: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    groq: 'GROQ_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    xai: 'XAI_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    moonshot: 'MOONSHOT_API_KEY',
    zhipu: 'ZHIPU_API_KEY',
    dashscope: 'DASHSCOPE_API_KEY',
    together: 'TOGETHER_API_KEY',
    fireworks: 'FIREWORKS_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    cohere: 'COHERE_API_KEY',
    perplexity: 'PERPLEXITY_API_KEY',
  }

  function getApiKey(providerId: string, options?: Record<string, unknown>): string | undefined {
    if (options?.apiKey && typeof options.apiKey === 'string') return options.apiKey
    const envVar = ENV_MAP[providerId]
    return envVar ? process.env[envVar] : undefined
  }

  /**
   * 创建 Provider SDK 实例
   */
  export function createProvider(
    providerId: string,
    modelName: string,
    modelInfo?: Provider.Model,
    options?: Record<string, unknown>,
  ): unknown {
    const apiKey = getApiKey(providerId, options)
    const npm = modelInfo?.api.npm ?? PROVIDER_NPM_MAP[providerId]

    // 1. 尝试 bundled provider
    if (npm && BUNDLED_PROVIDERS[npm]) {
      return BUNDLED_PROVIDERS[npm]({
        apiKey,
        ...options,
      })
    }

    // 2. 尝试 openai-compatible
    const baseURL =
      (typeof options?.baseURL === 'string' ? options.baseURL : undefined) ??
      modelInfo?.api.url ??
      COMPATIBLE_URLS[providerId]

    if (baseURL) {
      return createOpenAICompatible({
        name: providerId,
        apiKey: apiKey ?? '',
        baseURL,
      })
    }

    throw new Error(`Unknown provider: ${providerId}`)
  }

  /**
   * 获取 LanguageModel 实例
   *
   * 关键逻辑:
   * - openai: 使用 sdk.responses(modelID) 走 Responses API
   * - openai-compatible: 使用 sdk.chatModel(modelID)
   * - 其他 bundled: 使用 sdk.languageModel(modelID) 或 sdk(modelID)
   */
  export function getLanguageModel(
    providerId: string,
    modelName: string,
    modelInfo?: Provider.Model,
    options?: Record<string, unknown>,
  ): LanguageModel {
    const sdk = createProvider(providerId, modelName, modelInfo, options)
    const npm = modelInfo?.api.npm ?? PROVIDER_NPM_MAP[providerId]

    // openai 特殊处理: 用 responses API（参考 opencode）
    if (npm === '@ai-sdk/openai') {
      if (typeof sdk === 'object' && sdk !== null && 'responses' in sdk) {
        const responsesFn = (sdk as Record<string, unknown>).responses
        if (typeof responsesFn === 'function') {
          return responsesFn(modelName) as LanguageModel
        }
      }
    }

    // openai-compatible 返回的对象有 chatModel 方法
    if (typeof sdk === 'object' && sdk !== null && 'chatModel' in sdk) {
      const chatModelFn = (sdk as Record<string, unknown>).chatModel
      if (typeof chatModelFn === 'function') {
        return chatModelFn(modelName) as LanguageModel
      }
    }

    // 官方 bundled provider SDK 提供 languageModel 方法
    if (typeof sdk === 'object' && sdk !== null && 'languageModel' in sdk) {
      const languageModelFn = (sdk as Record<string, unknown>).languageModel
      if (typeof languageModelFn === 'function') {
        return languageModelFn(modelName) as LanguageModel
      }
    }

    // 某些 provider SDK 可以直接作为函数调用
    if (typeof sdk === 'function') {
      return sdk(modelName)
    }

    throw new Error(`Cannot create language model from provider: ${providerId}`)
  }
}
