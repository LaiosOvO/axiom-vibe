# SPEC-F04: 自我成长（轻量级）— 任务清单

> 状态: 待开始

## 实现任务

- [ ] 定义 PatternEntry 数据结构
- [ ] 实现 Growth.recordPattern（记录模式）
- [ ] 实现模式去重和累加逻辑
- [ ] 实现 Growth.getPatterns（查询模式）
- [ ] 实现进化阈值检测
- [ ] 实现 Growth.suggestEvolutions（生成建议）
- [ ] 实现 Growth.generateSkill（生成 skill 内容）
- [ ] 实现 Growth.adoptEvolution（采纳进化）
- [ ] 实现 Growth.ignoreEvolution（忽略进化）
- [ ] 实现数据持久化（patterns.json, suggestions.json, adopted.json）
- [ ] 实现用户确认交互 UI
- [ ] 集成到 Agent 工作流

## 测试任务

### 单元测试

```typescript
describe('Growth', () => {
  test('记录新模式', () => {
    const id = Growth.recordPattern({
      type: 'workflow',
      description: '总是先写测试再写实现',
      occurrences: 1,
      confidence: 0.3,
      context: 'React 组件开发',
    });
    expect(id).toMatch(/^pat_/);
  });

  test('模式次数累加', () => {
    Growth.recordPattern({ type: 'workflow', description: '先写测试', occurrences: 1, confidence: 0.5, context: '' });
    Growth.recordPattern({ type: 'workflow', description: '先写测试', occurrences: 1, confidence: 0.6, context: '' });
    const patterns = Growth.getPatterns({ type: 'workflow' });
    const match = patterns.find(p => p.description === '先写测试');
    expect(match?.occurrences).toBe(2);
  });

  test('达到阈值时生成进化建议', () => {
    // 模拟记录 5 次相同模式
    for (let i = 0; i < 5; i++) {
      Growth.recordPattern({
        type: 'coding_style',
        description: '偏好函数式组件',
        occurrences: 1,
        confidence: 0.8,
        context: 'React',
      });
    }
    const suggestions = Growth.suggestEvolutions();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].type).toBe('new_skill');
  });

  test('采纳进化生成 skill 文件', async () => {
    const suggestion = Growth.suggestEvolutions()[0];
    const skillPath = await Growth.adoptEvolution(suggestion.patternId);
    expect(existsSync(skillPath)).toBe(true);
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('---');  // 有 frontmatter
  });

  test('忽略的建议不再重复', () => {
    Growth.ignoreEvolution('pat_xxx', true);  // 永久忽略
    const suggestions = Growth.suggestEvolutions();
    expect(suggestions.find(s => s.patternId === 'pat_xxx')).toBeUndefined();
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- PatternEntry 记录和持久化实现完成
- 模式检测和置信度计算正确
- 进化建议生成工作正常
- 用户确认交互实现完成
- Skill 文件自动生成正确
- 所有单元测试通过
