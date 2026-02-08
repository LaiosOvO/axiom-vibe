# SPEC-F06: 验收测试系统 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 定义 AcceptanceCriteria 数据结构
- [ ] 实现验收标准解析（parseFromSpec）
- [ ] 实现单元测试执行（runUnit）
- [ ] 实现集成测试执行（runIntegration）
- [ ] 实现 E2E 测试执行（runE2E）
- [ ] 集成 Playwright
- [ ] 实现 BrowserTest.open（打开浏览器）
- [ ] 实现 BrowserTest.click（点击元素）
- [ ] 实现 BrowserTest.fill（填写表单）
- [ ] 实现 BrowserTest.screenshot（截图）
- [ ] 实现 BrowserTest.waitFor（等待元素）
- [ ] 实现 BrowserTest.getConsoleMessages（获取日志）
- [ ] 实现测试结果收集
- [ ] 实现测试报告生成（generateReport）
- [ ] 实现与 Spec 状态联动
- [ ] 实现 /spec:test 命令

## 测试任务

### 单元测试

```typescript
describe('Acceptance', () => {
  test('解析 spec 中的验收标准', () => {
    const criteria = Acceptance.parseFromSpec(specContent);
    expect(criteria.unitTests).toHaveLength(2);
    expect(criteria.e2eTests).toHaveLength(1);
  });

  test('运行单元测试并返回结果', async () => {
    const result = await Acceptance.runUnit('test/example.test.ts');
    expect(result.total).toBeGreaterThan(0);
    expect(result.passed + result.failed).toBe(result.total);
  });

  test('生成测试报告', () => {
    const report = Acceptance.generateReport({
      specId: 'SPEC-01',
      unitTests: { total: 5, passed: 5, failed: 0 },
      integrationTests: { total: 2, passed: 2, failed: 0 },
      e2eTests: { total: 1, passed: 0, failed: 1, errors: ['超时'] },
    });
    expect(report.overall).toBe('partial');
    expect(report.markdown).toContain('⚠️');
  });

  test('验收通过后更新 spec 状态', async () => {
    await Acceptance.runForSpec('SPEC-01');
    const spec = await SpecEngine.get('SPEC-01');
    // 如果所有测试通过则状态为 completed
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- 验收标准解析正确
- 单元测试执行实现完成
- 集成测试执行实现完成
- 浏览器 E2E 测试（Playwright）实现完成
- 测试结果与 Spec 状态联动正确
- 测试报告生成正确
- 所有单元测试通过
