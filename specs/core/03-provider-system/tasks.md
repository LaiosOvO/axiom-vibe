# SPEC-03: Provider 系统（多 LLM）— 任务清单

> 状态: 待开始

## 实现任务

- [ ] 定义 Provider.Info Zod schema
- [ ] 实现 ProviderRegistry（注册/获取）
- [ ] 注册 Anthropic Provider
- [ ] 注册 OpenAI Provider
- [ ] 注册 Google Gemini Provider
- [ ] 注册 AWS Bedrock Provider
- [ ] 注册 Azure OpenAI Provider
- [ ] 注册 Groq Provider
- [ ] 注册 Together Provider
- [ ] 注册 Fireworks Provider
- [ ] 注册 Mistral Provider
- [ ] 注册 Cohere Provider
- [ ] 注册 DeepSeek Provider
- [ ] 注册 Perplexity Provider
- [ ] 注册 OpenRouter Provider
- [ ] 注册 Ollama Provider（本地）
- [ ] 注册 LM Studio Provider（本地）
- [ ] 实现 Provider.findModel（跨 Provider 查找）
- [ ] 实现 Provider.getAvailable（过滤可用）
- [ ] 集成 Vercel AI SDK
- [ ] 实现运行时切换

## 测试任务

### 单元测试

```typescript
describe('Provider', () => {
  test('注册和获取 Provider', () => {
    const p = Provider.get('anthropic');
    expect(p.name).toBe('Anthropic');
    expect(p.models.length).toBeGreaterThan(0);
  });

  test('列出所有可用 Provider', () => {
    const providers = Provider.list();
    expect(providers.length).toBeGreaterThanOrEqual(5);
  });

  test('模型查找', () => {
    const model = Provider.findModel('claude-opus-4');
    expect(model).toBeDefined();
    expect(model?.contextWindow).toBeGreaterThan(0);
  });

  test('无 API key 时标记不可用', () => {
    const available = Provider.getAvailable();
    // 没有配置 key 的 provider 不在可用列表中
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- Provider 注册和管理实现完成
- Vercel AI SDK 集成完成
- 20+ Provider 配置完成
- 运行时切换功能实现
- 所有单元测试通过
