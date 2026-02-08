# SPEC-01: 配置系统 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 定义 Config.Info Zod schema
- [ ] 实现默认值加载
- [ ] 实现全局配置读取（~/.config/axiom/config.json）
- [ ] 实现项目配置读取（.axiom/config.json）
- [ ] 实现环境变量读取和映射
- [ ] 实现三层配置合并逻辑
- [ ] 实现 Zod 验证
- [ ] 实现 Markdown frontmatter 解析器
- [ ] 导出 Config.load() 接口

## 测试任务

### 单元测试

```typescript
describe('Config', () => {
  test('加载默认配置', () => {
    const config = Config.load();
    expect(config.provider.default).toBe('anthropic');
  });

  test('项目级配置覆盖全局', () => {
    // 设置全局和项目级配置，验证合并结果
  });

  test('环境变量覆盖配置文件', () => {
    process.env.AXIOM_PROVIDER_DEFAULT = 'openai';
    const config = Config.load();
    expect(config.provider.default).toBe('openai');
  });

  test('无效配置抛出 ZodError', () => {
    expect(() => Config.Info.parse({ provider: 'invalid' }))
      .toThrow();
  });

  test('Markdown frontmatter 解析', () => {
    const md = '---\nname: test\n---\n# Content';
    const { frontmatter, content } = Config.parseMarkdown(md);
    expect(frontmatter.name).toBe('test');
    expect(content).toBe('# Content');
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- Config namespace 实现完成
- 三层配置加载和合并工作正常
- Zod schema 验证有效配置
- Markdown frontmatter 解析正确
- 所有单元测试通过
