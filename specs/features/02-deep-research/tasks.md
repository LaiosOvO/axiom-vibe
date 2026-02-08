# SPEC-F02: Deep Research 深度研究 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 实现需求澄清对话流程（clarify）
- [ ] 实现搜索查询生成（generateQueries）
- [ ] 实现竞品搜索（searchCompetitors）
- [ ] 集成 GitHub 搜索接口（searchGitHub）
- [ ] 实现仓库分析（analyzeRepo）
- [ ] 实现 README 解析
- [ ] 实现目录结构分析
- [ ] 实现技术栈识别
- [ ] 实现总结文档生成（generateSummary）
- [ ] 实现 ref/ 目录管理
- [ ] 实现结果保存（saveResults）
- [ ] 实现 /research 命令

## 测试任务

### 单元测试

```typescript
describe('DeepResearch', () => {
  test('解析研究请求', () => {
    const request = DeepResearch.parseRequest('搜索 TUI 框架实现');
    expect(request.topic).toBe('TUI 框架实现');
    expect(request.keywords).toContain('TUI');
  });

  test('生成搜索查询', () => {
    const queries = DeepResearch.generateQueries({
      systemType: 'CLI 工具',
      topic: 'AI 编码助手',
      tech: ['TypeScript', 'Bun'],
    });
    expect(queries.github.length).toBeGreaterThan(0);
    expect(queries.web.length).toBeGreaterThan(0);
  });

  test('解析仓库分析结果', () => {
    const report = DeepResearch.parseRepoReport(mockRepoData);
    expect(report.name).toBeDefined();
    expect(report.techStack).toBeInstanceOf(Array);
    expect(report.pros).toBeInstanceOf(Array);
  });

  test('生成总结文档', () => {
    const summary = DeepResearch.generateSummary(mockReports);
    expect(summary).toContain('## 竞品对比');
    expect(summary).toContain('## 推荐方案');
  });

  test('ref 目录结构正确', async () => {
    await DeepResearch.saveResults('tui-framework', mockResults);
    expect(existsSync('ref/tui-framework/summary.md')).toBe(true);
    expect(existsSync('ref/tui-framework/repos')).toBe(true);
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- 需求澄清对话流程实现完成
- 竞品搜索（Web 搜索）实现完成
- GitHub 仓库搜索和分析实现完成
- 参考文档生成正确
- ref/ 目录管理正常
- 所有单元测试通过
