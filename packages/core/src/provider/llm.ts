import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createXai } from '@ai-sdk/xai'
import type { LanguageModel } from 'ai'

/**
 * ProviderFactory - 创建 AI SDK Provider 和 LanguageModel 实例
 */
export namespace ProviderFactory {
  /**
   * BUNDLED_PROVIDERS 映射表: providerId -> create函数
   * 包含已安装的核心 AI SDK providers
   */
  const BUNDLED_PROVIDERS: Record<string, (options?: any) => any> = {
    anthropic: createAnthropic,
    openai: createOpenAI,
    google: createGoogleGenerativeAI,
    groq: createGroq,
    mistral: createMistral,
    xai: createXai,
  }

  /**
   * OpenAI-compatible providers 的 baseURL 映射表
   * 这些 provider 使用 createOpenAI 但需要自定义 baseURL
   */
  const OPENAI_COMPATIBLE_URLS: Record<string, string> = {
    deepseek: 'https://api.deepseek.com',
    together: 'https://api.together.xyz/v1',
    fireworks: 'https://api.fireworks.ai/inference/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    ollama: 'http://localhost:11434/v1',
    lmstudio: 'http://localhost:1234/v1',
  }

  /**
   * 获取 provider 的 API Key
   * 优先级: options.apiKey > 环境变量
   */
  function getApiKey(providerId: string, options?: Record<string, any>): string | undefined {
    if (options?.apiKey) {
      return options.apiKey
    }

    // 从环境变量读取（根据现有 Provider.Info 的 envVar 映射）
    const envVarMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
      groq: 'GROQ_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      xai: 'XAI_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      together: 'TOGETHER_API_KEY',
      fireworks: 'FIREWORKS_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    }

    const envVar = envVarMap[providerId]
    return envVar ? process.env[envVar] : undefined
  }

  /**
   * 创建 Provider SDK 实例
   * @param providerId - Provider ID（如 'anthropic', 'openai', 'deepseek'）
   * @param options - 可选配置（apiKey, baseURL 等）
   * @returns Provider SDK 实例
   */
  export function createProvider(providerId: string, options?: Record<string, any>): any {
    const apiKey = getApiKey(providerId, options)

    // 如果是 bundled provider，直接使用对应的 create 函数
    if (BUNDLED_PROVIDERS[providerId]) {
      return BUNDLED_PROVIDERS[providerId]({
        apiKey,
        ...options,
      })
    }

    // 如果是 openai-compatible provider，使用 createOpenAI + baseURL
    if (OPENAI_COMPATIBLE_URLS[providerId]) {
      const baseURL = options?.baseURL ?? OPENAI_COMPATIBLE_URLS[providerId]
      return createOpenAI({
        apiKey,
        baseURL,
        ...options,
      })
    }

    throw new Error(`Unknown provider: ${providerId}`)
  }

  /**
   * 获取 LanguageModel 实例
   * @param providerId - Provider ID（如 'anthropic', 'openai'）
   * @param modelName - 模型名称（如 'claude-sonnet-4-20250514', 'gpt-4o'）
   * @param options - 可选配置（apiKey, baseURL 等）
   * @returns LanguageModel 实例
   */
  export function getLanguageModel(
    providerId: string,
    modelName: string,
    options?: Record<string, any>,
  ): LanguageModel {
    const sdk = createProvider(providerId, options)

    // 大部分 provider SDK 提供 languageModel 方法
    if (typeof sdk.languageModel === 'function') {
      return sdk.languageModel(modelName)
    }

    // 某些 provider SDK 可以直接作为函数调用
    if (typeof sdk === 'function') {
      return sdk(modelName)
    }

    throw new Error(`Cannot create language model from provider: ${providerId}`)
  }
}
