import { z } from 'zod'
import { ProviderFactory } from './llm'
import { ModelsDev } from './models'

/**
 * Provider 命名空间 — 参考 opencode 的完整 Model/Provider 体系
 *
 * 核心变化（相对于旧版）:
 * 1. Model schema 包含完整的 capabilities/cost/limit/status
 * 2. Info.models 从 string[] 变为 Record<string, Model>
 * 3. Info.env: string[] 替代旧的 auth 对象
 * 4. 支持从 models.dev 远程获取模型数据
 */
export namespace Provider {
  // ========== Model Schema ==========

  export const Model = z.object({
    id: z.string(),
    providerID: z.string(),
    api: z.object({
      id: z.string(),
      url: z.string(),
      npm: z.string(),
    }),
    name: z.string(),
    family: z.string().optional(),
    capabilities: z.object({
      temperature: z.boolean(),
      reasoning: z.boolean(),
      attachment: z.boolean(),
      toolcall: z.boolean(),
      input: z.object({
        text: z.boolean(),
        audio: z.boolean(),
        image: z.boolean(),
        video: z.boolean(),
        pdf: z.boolean(),
      }),
      output: z.object({
        text: z.boolean(),
        audio: z.boolean(),
        image: z.boolean(),
        video: z.boolean(),
        pdf: z.boolean(),
      }),
      interleaved: z.union([
        z.boolean(),
        z.object({
          field: z.enum(['reasoning_content', 'reasoning_details']),
        }),
      ]),
    }),
    cost: z.object({
      input: z.number(),
      output: z.number(),
      cache: z.object({
        read: z.number(),
        write: z.number(),
      }),
    }),
    limit: z.object({
      context: z.number(),
      input: z.number().optional(),
      output: z.number(),
    }),
    status: z.enum(['alpha', 'beta', 'deprecated', 'active']),
    options: z.record(z.string(), z.any()),
    headers: z.record(z.string(), z.string()),
    release_date: z.string(),
  })
  export type Model = z.infer<typeof Model>

  // ========== Provider Info Schema ==========

  export const Info = z.object({
    id: z.string(),
    name: z.string(),
    source: z.enum(['env', 'config', 'custom', 'builtin']),
    env: z.array(z.string()),
    options: z.record(z.string(), z.any()).optional(),
    models: z.record(z.string(), Model),
  })
  export type Info = z.infer<typeof Info>

  // ========== 内部状态 ==========

  const registry = new Map<string, Info>()

  // ========== ModelsDev -> Provider 转换 ==========

  function fromModelsDevModel(provider: ModelsDev.Provider, model: ModelsDev.Model): Model {
    return {
      id: model.id,
      providerID: provider.id,
      name: model.name,
      family: model.family,
      api: {
        id: model.id,
        url: provider.api ?? '',
        npm: model.provider?.npm ?? provider.npm ?? '@ai-sdk/openai-compatible',
      },
      status: model.status ?? 'active',
      headers: model.headers ?? {},
      options: model.options ?? {},
      cost: {
        input: model.cost?.input ?? 0,
        output: model.cost?.output ?? 0,
        cache: {
          read: model.cost?.cache_read ?? 0,
          write: model.cost?.cache_write ?? 0,
        },
      },
      limit: {
        context: model.limit.context,
        input: model.limit.input,
        output: model.limit.output,
      },
      capabilities: {
        temperature: model.temperature,
        reasoning: model.reasoning,
        attachment: model.attachment,
        toolcall: model.tool_call,
        input: {
          text: model.modalities?.input?.includes('text') ?? true,
          audio: model.modalities?.input?.includes('audio') ?? false,
          image: model.modalities?.input?.includes('image') ?? false,
          video: model.modalities?.input?.includes('video') ?? false,
          pdf: model.modalities?.input?.includes('pdf') ?? false,
        },
        output: {
          text: model.modalities?.output?.includes('text') ?? true,
          audio: model.modalities?.output?.includes('audio') ?? false,
          image: model.modalities?.output?.includes('image') ?? false,
          video: model.modalities?.output?.includes('video') ?? false,
          pdf: model.modalities?.output?.includes('pdf') ?? false,
        },
        interleaved: model.interleaved ?? false,
      },
      release_date: model.release_date,
    }
  }

  function fromModelsDevProvider(provider: ModelsDev.Provider): Info {
    const models: Record<string, Model> = {}
    for (const [modelId, model] of Object.entries(provider.models)) {
      models[modelId] = fromModelsDevModel(provider, model)
    }
    return {
      id: provider.id,
      name: provider.name,
      source: 'custom',
      env: provider.env ?? [],
      options: {},
      models,
    }
  }

  // ========== 内置 fallback 模型定义工具 ==========

  function mkModel(
    id: string,
    providerID: string,
    name: string,
    url: string,
    npm: string,
    opts: {
      reasoning?: boolean
      attachment?: boolean
      image?: boolean
      pdf?: boolean
      interleaved?: boolean | { field: 'reasoning_content' | 'reasoning_details' }
      costIn?: number
      costOut?: number
      cacheRead?: number
      cacheWrite?: number
      context?: number
      output?: number
      date?: string
    } = {},
  ): Model {
    return {
      id,
      providerID,
      api: { id, url, npm },
      name,
      capabilities: {
        temperature: true,
        reasoning: opts.reasoning ?? false,
        attachment: opts.attachment ?? false,
        toolcall: true,
        input: {
          text: true,
          audio: false,
          image: opts.image ?? false,
          video: false,
          pdf: opts.pdf ?? false,
        },
        output: { text: true, audio: false, image: false, video: false, pdf: false },
        interleaved: opts.interleaved ?? false,
      },
      cost: {
        input: opts.costIn ?? 0,
        output: opts.costOut ?? 0,
        cache: { read: opts.cacheRead ?? 0, write: opts.cacheWrite ?? 0 },
      },
      limit: { context: opts.context ?? 128000, output: opts.output ?? 8192 },
      status: 'active',
      options: {},
      headers: {},
      release_date: opts.date ?? '2024-01-01',
    }
  }

  // ========== 内置 fallback providers ==========

  const FALLBACK_PROVIDERS: Info[] = [
    {
      id: 'anthropic',
      name: 'Anthropic',
      source: 'builtin',
      env: ['ANTHROPIC_API_KEY'],
      options: {},
      models: {
        'claude-sonnet-4-20250514': mkModel(
          'claude-sonnet-4-20250514',
          'anthropic',
          'Claude Sonnet 4',
          'https://api.anthropic.com',
          '@ai-sdk/anthropic',
          {
            reasoning: true,
            attachment: true,
            image: true,
            pdf: true,
            interleaved: true,
            costIn: 3,
            costOut: 15,
            cacheRead: 0.3,
            cacheWrite: 3.75,
            context: 200000,
            output: 16000,
            date: '2025-05-14',
          },
        ),
        'claude-haiku-4-20250514': mkModel(
          'claude-haiku-4-20250514',
          'anthropic',
          'Claude Haiku 4',
          'https://api.anthropic.com',
          '@ai-sdk/anthropic',
          {
            attachment: true,
            image: true,
            pdf: true,
            costIn: 0.8,
            costOut: 4,
            cacheRead: 0.08,
            cacheWrite: 1,
            context: 200000,
            output: 16000,
            date: '2025-05-14',
          },
        ),
      },
    },
    {
      id: 'openai',
      name: 'OpenAI',
      source: 'builtin',
      env: ['OPENAI_API_KEY'],
      options: {},
      models: {
        'gpt-4o': mkModel(
          'gpt-4o',
          'openai',
          'GPT-4o',
          'https://api.openai.com/v1',
          '@ai-sdk/openai',
          {
            attachment: true,
            image: true,
            costIn: 2.5,
            costOut: 10,
            cacheRead: 1.25,
            date: '2024-05-13',
          },
        ),
        'gpt-4o-mini': mkModel(
          'gpt-4o-mini',
          'openai',
          'GPT-4o Mini',
          'https://api.openai.com/v1',
          '@ai-sdk/openai',
          {
            attachment: true,
            image: true,
            costIn: 0.15,
            costOut: 0.6,
            cacheRead: 0.075,
            date: '2024-07-18',
          },
        ),
      },
    },
    {
      id: 'google',
      name: 'Google AI',
      source: 'builtin',
      env: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'],
      options: {},
      models: {
        'gemini-2.0-flash-exp': mkModel(
          'gemini-2.0-flash-exp',
          'google',
          'Gemini 2.0 Flash',
          'https://generativelanguage.googleapis.com/v1beta',
          '@ai-sdk/google',
          { attachment: true, image: true, pdf: true, context: 1048576, date: '2024-12-11' },
        ),
      },
    },
    {
      id: 'groq',
      name: 'Groq',
      source: 'builtin',
      env: ['GROQ_API_KEY'],
      options: {},
      models: {
        'llama-3.3-70b-versatile': mkModel(
          'llama-3.3-70b-versatile',
          'groq',
          'Llama 3.3 70B',
          'https://api.groq.com/openai/v1',
          '@ai-sdk/groq',
          { costIn: 0.59, costOut: 0.79, output: 32768, date: '2024-12-06' },
        ),
      },
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      source: 'builtin',
      env: ['DEEPSEEK_API_KEY'],
      options: {},
      models: {
        'deepseek-chat': mkModel(
          'deepseek-chat',
          'deepseek',
          'DeepSeek Chat',
          'https://api.deepseek.com',
          '@ai-sdk/openai-compatible',
          { costIn: 0.27, costOut: 1.1, cacheRead: 0.07, context: 64000, date: '2025-01-20' },
        ),
      },
    },
    {
      id: 'dashscope',
      name: '通义千问 (DashScope)',
      source: 'builtin',
      env: ['DASHSCOPE_API_KEY'],
      options: {},
      models: {
        'qwen-turbo': mkModel(
          'qwen-turbo',
          'dashscope',
          'Qwen Turbo',
          'https://dashscope.aliyuncs.com/compatible-mode/v1',
          '@ai-sdk/openai-compatible',
          { costIn: 0.3, costOut: 0.6, context: 131072, date: '2024-09-19' },
        ),
        'qwen-max': mkModel(
          'qwen-max',
          'dashscope',
          'Qwen Max',
          'https://dashscope.aliyuncs.com/compatible-mode/v1',
          '@ai-sdk/openai-compatible',
          { costIn: 2.4, costOut: 9.6, context: 131072, date: '2024-09-19' },
        ),
        'qwen-plus': mkModel(
          'qwen-plus',
          'dashscope',
          'Qwen Plus',
          'https://dashscope.aliyuncs.com/compatible-mode/v1',
          '@ai-sdk/openai-compatible',
          { costIn: 0.8, costOut: 2, context: 131072, date: '2024-09-19' },
        ),
        'qwen3-235b-a22b': mkModel(
          'qwen3-235b-a22b',
          'dashscope',
          'Qwen3 235B',
          'https://dashscope.aliyuncs.com/compatible-mode/v1',
          '@ai-sdk/openai-compatible',
          { reasoning: true, costIn: 4, costOut: 16, context: 131072, date: '2025-04-28' },
        ),
      },
    },
    {
      id: 'moonshot',
      name: 'Moonshot (Kimi)',
      source: 'builtin',
      env: ['MOONSHOT_API_KEY'],
      options: {},
      models: {
        'moonshot-v1-128k': mkModel(
          'moonshot-v1-128k',
          'moonshot',
          'Moonshot V1 128K',
          'https://api.moonshot.cn/v1',
          '@ai-sdk/openai-compatible',
          { costIn: 0.84, costOut: 0.84, output: 4096, date: '2024-03-06' },
        ),
      },
    },
    {
      id: 'zhipu',
      name: '智谱 (GLM)',
      source: 'builtin',
      env: ['ZHIPU_API_KEY'],
      options: {},
      models: {
        'glm-4-plus': mkModel(
          'glm-4-plus',
          'zhipu',
          'GLM-4 Plus',
          'https://open.bigmodel.cn/api/paas/v4',
          '@ai-sdk/openai-compatible',
          { costIn: 0.5, costOut: 0.5, output: 4096, date: '2024-07-19' },
        ),
      },
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      source: 'builtin',
      env: ['MISTRAL_API_KEY'],
      options: {},
      models: {
        'mistral-large-latest': mkModel(
          'mistral-large-latest',
          'mistral',
          'Mistral Large',
          'https://api.mistral.ai/v1',
          '@ai-sdk/mistral',
          { costIn: 2, costOut: 6, date: '2024-11-18' },
        ),
      },
    },
    {
      id: 'xai',
      name: 'xAI',
      source: 'builtin',
      env: ['XAI_API_KEY'],
      options: {},
      models: {
        'grok-3': mkModel('grok-3', 'xai', 'Grok 3', 'https://api.x.ai/v1', '@ai-sdk/xai', {
          costIn: 3,
          costOut: 15,
          context: 131072,
          output: 16384,
          date: '2025-02-17',
        }),
      },
    },
    {
      id: 'together',
      name: 'Together AI',
      source: 'builtin',
      env: ['TOGETHER_API_KEY'],
      options: {},
      models: {
        'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': mkModel(
          'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          'together',
          'Llama 3.1 70B Instruct',
          'https://api.together.xyz/v1',
          '@ai-sdk/openai-compatible',
          { costIn: 0.88, costOut: 0.88, context: 131072, output: 4096, date: '2024-07-23' },
        ),
      },
    },
    {
      id: 'fireworks',
      name: 'Fireworks AI',
      source: 'builtin',
      env: ['FIREWORKS_API_KEY'],
      options: {},
      models: {
        'accounts/fireworks/models/llama-v3p1-70b-instruct': mkModel(
          'accounts/fireworks/models/llama-v3p1-70b-instruct',
          'fireworks',
          'Llama 3.1 70B Instruct',
          'https://api.fireworks.ai/inference/v1',
          '@ai-sdk/openai-compatible',
          { costIn: 0.9, costOut: 0.9, context: 131072, output: 4096, date: '2024-07-23' },
        ),
      },
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      source: 'builtin',
      env: ['OPENROUTER_API_KEY'],
      options: {},
      models: {
        'anthropic/claude-3.5-sonnet': mkModel(
          'anthropic/claude-3.5-sonnet',
          'openrouter',
          'Claude 3.5 Sonnet (via OpenRouter)',
          'https://openrouter.ai/api/v1',
          '@ai-sdk/openai-compatible',
          {
            attachment: true,
            image: true,
            costIn: 3,
            costOut: 15,
            context: 200000,
            date: '2024-10-22',
          },
        ),
      },
    },
    {
      id: 'ollama',
      name: 'Ollama',
      source: 'builtin',
      env: [],
      options: {},
      models: {
        'llama3.1': mkModel(
          'llama3.1',
          'ollama',
          'Llama 3.1',
          'http://localhost:11434/v1',
          '@ai-sdk/openai-compatible',
          { context: 131072, output: 4096, date: '2024-07-23' },
        ),
      },
    },
    {
      id: 'lmstudio',
      name: 'LM Studio',
      source: 'builtin',
      env: [],
      options: {},
      models: {
        'local-model': mkModel(
          'local-model',
          'lmstudio',
          'Local Model',
          'http://localhost:1234/v1',
          '@ai-sdk/openai-compatible',
          { context: 32768, output: 4096 },
        ),
      },
    },
    {
      id: 'cohere',
      name: 'Cohere',
      source: 'builtin',
      env: ['COHERE_API_KEY'],
      options: {},
      models: {
        'command-r-plus': mkModel(
          'command-r-plus',
          'cohere',
          'Command R+',
          'https://api.cohere.ai/v1',
          '@ai-sdk/openai-compatible',
          { costIn: 2.5, costOut: 10, output: 4096, date: '2024-04-04' },
        ),
      },
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      source: 'builtin',
      env: ['PERPLEXITY_API_KEY'],
      options: {},
      models: {
        'llama-3.1-sonar-large-128k-online': mkModel(
          'llama-3.1-sonar-large-128k-online',
          'perplexity',
          'Sonar Large 128K Online',
          'https://api.perplexity.ai',
          '@ai-sdk/openai-compatible',
          { costIn: 1, costOut: 1, context: 127072, output: 4096, date: '2024-09-19' },
        ),
      },
    },
  ]

  // ========== 初始化 ==========

  function initFallbacks() {
    for (const provider of FALLBACK_PROVIDERS) {
      registry.set(provider.id, provider)
    }
  }

  // 立即用 fallback 初始化，保证同步 API 可用
  initFallbacks()

  /**
   * 从 models.dev 异步初始化完整模型数据
   * 成功后覆盖 fallback 数据；失败保留 fallback
   */
  export async function init(): Promise<void> {
    try {
      const modelsDevData = await ModelsDev.get()
      if (Object.keys(modelsDevData).length === 0) return

      registry.clear()

      for (const [providerId, provider] of Object.entries(modelsDevData)) {
        const info = fromModelsDevProvider(provider)
        registry.set(providerId, info)
      }

      // 确保 fallback 中有但 models.dev 没有的 provider 也保留
      for (const fallback of FALLBACK_PROVIDERS) {
        if (!registry.has(fallback.id)) {
          registry.set(fallback.id, fallback)
        }
      }
    } catch {
      // models.dev 不可用，保留 fallback
    }
  }

  // ========== 公开 API ==========

  export function register(provider: Info): void {
    const validated = Info.parse(provider)
    registry.set(validated.id, validated)
  }

  export function get(id: string): Info | undefined {
    return registry.get(id)
  }

  export function list(): Info[] {
    return Array.from(registry.values())
  }

  export function getAvailable(): Info[] {
    return list().filter((provider) => {
      if (provider.env.length === 0) return true
      return provider.env.some((envVar) => !!process.env[envVar])
    })
  }

  export function findModel(modelName: string): { provider: Info; model: Model } | undefined {
    for (const provider of list()) {
      const model = provider.models[modelName]
      if (model) return { provider, model }
    }
    return undefined
  }

  export function reset(): void {
    registry.clear()
    initFallbacks()
  }

  export function getLanguageModel(modelId: string) {
    const separator = modelId.includes('/') ? '/' : ':'
    const [providerId, ...modelParts] = modelId.split(separator)
    const modelName = modelParts.join(separator)

    if (!providerId || !modelName) {
      throw new Error(`无效的 modelId 格式: ${modelId}。期望格式: "providerId/modelName"`)
    }

    const provider = get(providerId)
    if (!provider) {
      throw new Error(`Provider 不存在: ${providerId}`)
    }

    const modelInfo = provider.models[modelName]
    return ProviderFactory.getLanguageModel(providerId, modelName, modelInfo)
  }

  // ========== 兼容性辅助方法 ==========

  export function getFirstModelName(provider: Info): string | undefined {
    return Object.keys(provider.models)[0]
  }

  export function getModelCount(provider: Info): number {
    return Object.keys(provider.models).length
  }

  export function getModelNames(provider: Info): string[] {
    return Object.keys(provider.models)
  }
}
