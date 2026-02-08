# SPEC-F01: Spec 引擎 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 实现 Spec frontmatter 解析
- [ ] 实现 SpecEngine.create（创建新 spec）
- [ ] 实现 SpecEngine.get（读取 spec）
- [ ] 实现 SpecEngine.updateStatus（更新状态）
- [ ] 实现 SpecEngine.list（列出所有 spec）
- [ ] 实现 SpecEngine.findByMilestone（按里程碑筛选）
- [ ] 实现 SpecEngine.findBlocked（检测阻塞）
- [ ] 实现进度追踪（generateProgress）
- [ ] 实现 PROGRESS.md 自动更新
- [ ] 实现需求变更分析（analyzeChange）
- [ ] 实现 /spec:* 命令
- [ ] 实现 spec 与测试关联

## 测试任务

### 单元测试

```typescript
describe('SpecEngine', () => {
  test('解析 spec frontmatter', () => {
    const spec = SpecEngine.parse(specContent);
    expect(spec.id).toBe('SPEC-F01');
    expect(spec.status).toBe('pending');
    expect(spec.dependsOn).toEqual(['SPEC-05', 'SPEC-04']);
  });

  test('创建新 spec 文件', async () => {
    const path = await SpecEngine.create({
      title: '测试功能',
      milestone: 'M2',
      priority: 'P1',
    });
    expect(existsSync(path)).toBe(true);
  });

  test('更新 spec 状态', async () => {
    await SpecEngine.updateStatus('SPEC-F01', 'in_progress');
    const spec = await SpecEngine.get('SPEC-F01');
    expect(spec.status).toBe('in_progress');
  });

  test('生成进度报告', async () => {
    const progress = await SpecEngine.generateProgress();
    expect(progress.milestones).toHaveLength(4);
    expect(progress.milestones[0].total).toBeGreaterThan(0);
  });

  test('检测依赖阻塞', async () => {
    const blocked = await SpecEngine.findBlocked();
    // 依赖未完成的 spec 应该在列表中
  });

  test('需求变更分析', async () => {
    const analysis = await SpecEngine.analyzeChange('添加暗黑模式');
    expect(analysis.type).toBeOneOf(['new', 'modify']);
    expect(analysis.affectedSpecs).toBeDefined();
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- Spec frontmatter 解析正确
- CRUD 操作（创建/读取/更新/删除）实现完成
- 进度追踪和 PROGRESS.md 自动更新
- 依赖关系分析正确
- 需求变更检测工作正常
- 所有单元测试通过
