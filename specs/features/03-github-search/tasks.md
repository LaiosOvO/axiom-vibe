# SPEC-F03: GitHub 搜索接口 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 实现 gh CLI 搜索（searchViaGhCli）
- [ ] 实现 GitHub REST API 搜索（searchViaRestApi）
- [ ] 实现自定义爬虫搜索（searchViaCustom）
- [ ] 实现三层降级逻辑
- [ ] 实现结果过滤（minStars, maxAge）
- [ ] 实现结果去重
- [ ] 实现结果排序
- [ ] 实现查询扩展（expandQuery）
- [ ] 实现结果缓存（24 小时 TTL）
- [ ] 实现仓库深度分析（analyzeRepo）
- [ ] 实现 README 读取
- [ ] 实现目录结构扫描
- [ ] 实现依赖文件分析
- [ ] 实现技术栈识别

## 测试任务

### 单元测试

```typescript
describe('GitHubSearch', () => {
  test('搜索返回结果列表', async () => {
    const results = await GitHubSearch.search({
      query: 'terminal ui framework',
      language: 'typescript',
      minStars: 100,
      limit: 5,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].fullName).toMatch(/\//);
    expect(results[0].stars).toBeGreaterThanOrEqual(100);
  });

  test('搜索结果按 star 排序', async () => {
    const results = await GitHubSearch.search({
      query: 'ai coding agent',
      sort: 'stars',
      limit: 10,
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].stars).toBeGreaterThanOrEqual(results[i].stars);
    }
  });

  test('过滤过期仓库', async () => {
    const results = await GitHubSearch.search({
      query: 'opencode',
      maxAge: 365,  // 最近一年
    });
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    for (const r of results) {
      expect(new Date(r.lastUpdated).getTime()).toBeGreaterThan(oneYearAgo);
    }
  });

  test('仓库深度分析', async () => {
    const analysis = await GitHubSearch.analyzeRepo('opencode-ai/opencode');
    expect(analysis.techStack).toBeDefined();
    expect(analysis.architecture).toBeDefined();
    expect(analysis.pros).toBeInstanceOf(Array);
  });

  test('查询扩展', () => {
    const expanded = GitHubSearch.expandQuery('TUI 框架');
    expect(expanded.length).toBeGreaterThan(1);
    expect(expanded).toContain('terminal ui framework');
  });

  test('结果缓存', async () => {
    const opts = { query: 'test-cache', limit: 1 };
    await GitHubSearch.search(opts);
    // 第二次调用应该从缓存返回
    const start = Date.now();
    await GitHubSearch.search(opts);
    expect(Date.now() - start).toBeLessThan(50); // 缓存应该很快
  });

  test('三种搜索方式降级', async () => {
    // 测试当 gh CLI 不可用时降级到 API
    // 测试当 API token 不可用时降级到自定义接口
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- gh CLI 搜索实现完成
- GitHub REST API 搜索实现完成
- 自定义搜索接口实现完成
- 仓库深度分析实现完成
- 搜索优化（缓存、去重、查询扩展）实现完成
- 三层降级机制工作正常
- 所有单元测试通过（可独立运行）
