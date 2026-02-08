import { z } from 'zod'

export namespace Provider {
  export const Info = z.object({
    id: z.string(),
    name: z.string(),
    models: z.array(z.string()),
    auth: z.object({
      type: z.enum(['env', 'none']),
      envVar: z.string().optional(),
    }),
  })

  export type Info = z.infer<typeof Info>

  const registry = new Map<string, Info>()

  const builtinProviders: Info[] = [
    {
      id: 'anthropic',
      name: 'Anthropic',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      auth: {
        type: 'env',
        envVar: 'ANTHROPIC_API_KEY',
      },
    },
    {
      id: 'openai',
      name: 'OpenAI',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      auth: {
        type: 'env',
        envVar: 'OPENAI_API_KEY',
      },
    },
    {
      id: 'google',
      name: 'Google AI',
      models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      auth: {
        type: 'env',
        envVar: 'GOOGLE_API_KEY',
      },
    },
    {
      id: 'groq',
      name: 'Groq',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
      auth: {
        type: 'env',
        envVar: 'GROQ_API_KEY',
      },
    },
    {
      id: 'together',
      name: 'Together AI',
      models: [
        'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        'mistralai/Mixtral-8x7B-Instruct-v0.1',
      ],
      auth: {
        type: 'env',
        envVar: 'TOGETHER_API_KEY',
      },
    },
    {
      id: 'fireworks',
      name: 'Fireworks AI',
      models: [
        'accounts/fireworks/models/llama-v3p1-70b-instruct',
        'accounts/fireworks/models/mixtral-8x7b-instruct',
      ],
      auth: {
        type: 'env',
        envVar: 'FIREWORKS_API_KEY',
      },
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
      auth: {
        type: 'env',
        envVar: 'MISTRAL_API_KEY',
      },
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      models: ['deepseek-chat', 'deepseek-coder'],
      auth: {
        type: 'env',
        envVar: 'DEEPSEEK_API_KEY',
      },
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.0-flash-exp'],
      auth: {
        type: 'env',
        envVar: 'OPENROUTER_API_KEY',
      },
    },
    {
      id: 'ollama',
      name: 'Ollama',
      models: ['llama3.1', 'qwen2.5', 'deepseek-r1'],
      auth: {
        type: 'none',
      },
    },
    {
      id: 'lmstudio',
      name: 'LM Studio',
      models: ['local-model'],
      auth: {
        type: 'none',
      },
    },
    {
      id: 'cohere',
      name: 'Cohere',
      models: ['command-r-plus', 'command-r', 'command'],
      auth: {
        type: 'env',
        envVar: 'COHERE_API_KEY',
      },
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
      auth: {
        type: 'env',
        envVar: 'PERPLEXITY_API_KEY',
      },
    },
    {
      id: 'bedrock',
      name: 'AWS Bedrock',
      models: [
        'anthropic.claude-3-5-sonnet-20241022-v2:0',
        'anthropic.claude-3-opus-20240229-v1:0',
      ],
      auth: {
        type: 'env',
        envVar: 'AWS_ACCESS_KEY_ID',
      },
    },
    {
      id: 'azure',
      name: 'Azure OpenAI',
      models: ['gpt-4o', 'gpt-4-turbo'],
      auth: {
        type: 'env',
        envVar: 'AZURE_OPENAI_API_KEY',
      },
    },
  ]

  function initBuiltins() {
    for (const provider of builtinProviders) {
      registry.set(provider.id, provider)
    }
  }

  initBuiltins()

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
      if (provider.auth.type === 'none') {
        return true
      }
      if (provider.auth.envVar) {
        return !!process.env[provider.auth.envVar]
      }
      return false
    })
  }

  export function findModel(modelName: string): { provider: Info; model: string } | undefined {
    for (const provider of list()) {
      if (provider.models.includes(modelName)) {
        return { provider, model: modelName }
      }
    }
    return undefined
  }

  export function reset(): void {
    registry.clear()
    initBuiltins()
  }
}
