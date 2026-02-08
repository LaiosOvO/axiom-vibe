# SPEC-03: Provider 系统（多 LLM）— 设计文档

> 状态: 待设计

## 技术方案

### 架构设计

使用 Vercel AI SDK 作为底层调用层，封装统一的 Provider 接口：

```
Axiom Agent
     ↓
Provider.call(model, messages)
     ↓
Vercel AI SDK (统一接口)
     ↓
各个 LLM Provider (Anthropic, OpenAI, Google, ...)
```

### Provider 注册机制

所有 Provider 在启动时注册到 `ProviderRegistry`：

```typescript
ProviderRegistry.register({
  id: 'anthropic',
  name: 'Anthropic',
  models: [...],
  auth: { type: 'api_key', envVar: 'ANTHROPIC_API_KEY' },
  create: (apiKey) => createAnthropic({ apiKey }),
});
```

## 接口设计

### Provider 命名空间

```typescript
export namespace Provider {
  // Provider 信息 Schema
  export const Info: z.ZodType<ProviderInfo>;
  export type Info = z.infer<typeof Info>;

  // 注册和获取
  export function register(provider: ProviderInfo): void;
  export function get(id: string): ProviderInfo | undefined;
  export function list(): ProviderInfo[];
  export function getAvailable(): ProviderInfo[];  // 过滤已配置 key 的

  // 模型查找
  export function findModel(modelId: string): ModelInfo | undefined;

  // 调用接口
  export function call(modelId: string, messages: Message[]): Promise<Response>;
}
```

### 支持的 Provider 列表

| Provider | ID | 认证方式 | 环境变量 |
|---------|-----|---------|---------|
| Anthropic | anthropic | api_key | ANTHROPIC_API_KEY |
| OpenAI | openai | api_key | OPENAI_API_KEY |
| Google Gemini | google | api_key | GOOGLE_API_KEY |
| AWS Bedrock | bedrock | aws_credentials | AWS_* |
| Azure OpenAI | azure | api_key | AZURE_OPENAI_API_KEY |
| Groq | groq | api_key | GROQ_API_KEY |
| Together | together | api_key | TOGETHER_API_KEY |
| Fireworks | fireworks | api_key | FIREWORKS_API_KEY |
| Mistral | mistral | api_key | MISTRAL_API_KEY |
| Cohere | cohere | api_key | COHERE_API_KEY |
| DeepSeek | deepseek | api_key | DEEPSEEK_API_KEY |
| Perplexity | perplexity | api_key | PERPLEXITY_API_KEY |
| OpenRouter | openrouter | api_key | OPENROUTER_API_KEY |
| Ollama | ollama | none | - |
| LM Studio | lmstudio | none | - |

## 数据结构

### ProviderInfo

```typescript
interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
  auth: {
    type: 'api_key' | 'oauth' | 'none';
    envVar?: string;
  };
  create: (config: any) => LanguageModel;  // Vercel AI SDK
}
```

### ModelInfo

```typescript
interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  pricing?: {
    input: number;   // per 1M tokens
    output: number;  // per 1M tokens
  };
}
```

## 依赖关系

- SPEC-01: 配置系统（读取 API Keys）
- Vercel AI SDK（统一 LLM 调用接口）
