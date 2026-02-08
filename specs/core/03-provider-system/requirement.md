# SPEC-03: Provider 系统（多 LLM）

> 里程碑: M1 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: SPEC-01

## 目标

实现 20+ LLM Provider 统一抽象层，使用 Vercel AI SDK。

## 需求

### R1: Provider 抽象

```typescript
export namespace Provider {
  export const Info = z.object({
    id: z.string(),
    name: z.string(),
    models: z.array(z.object({
      id: z.string(),
      name: z.string(),
      contextWindow: z.number(),
      maxOutput: z.number(),
      pricing: z.object({ input: z.number(), output: z.number() }).optional(),
    })),
    auth: z.object({
      type: z.enum(['api_key', 'oauth', 'none']),
      envVar: z.string().optional(),
    }),
  });
}
```

### R2: 支持的 Provider 列表

Anthropic, OpenAI, Google (Gemini), AWS Bedrock, Azure OpenAI, Groq, Together, Fireworks, Mistral, Cohere, DeepSeek, Perplexity, OpenRouter, Ollama (本地), LM Studio (本地) 等。

### R3: 运行时切换和降级

支持动态切换 Provider 和模型，支持降级策略（主模型不可用时切换备用）。

## 验收场景

### 场景 1: 获取 Provider

- **当** 调用 `Provider.get('anthropic')`
- **那么** 返回 Anthropic Provider 信息，包含模型列表

### 场景 2: 列出所有 Provider

- **当** 调用 `Provider.list()`
- **那么** 返回至少 5 个 Provider

### 场景 3: 查找模型

- **当** 调用 `Provider.findModel('claude-opus-4')`
- **那么** 返回对应的模型信息（contextWindow > 0）

### 场景 4: 过滤可用 Provider

- **当** 调用 `Provider.getAvailable()`
- **那么** 只返回已配置 API Key 的 Provider
