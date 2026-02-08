# SPEC-F05: Agent 编排系统 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 定义 Agent.Info Zod schema
- [ ] 创建 orchestrator 预设 Agent
- [ ] 创建 explorer 预设 Agent
- [ ] 创建 oracle 预设 Agent
- [ ] 创建 librarian 预设 Agent
- [ ] 创建 builder 预设 Agent
- [ ] 创建 researcher 预设 Agent
- [ ] 实现 Agent.listPresets（加载预设）
- [ ] 实现 Agent.get（获取 Agent）
- [ ] 实现 Agent.create（创建自定义 Agent）
- [ ] 实现 Agent.resolveTools（工具权限过滤）
- [ ] 实现 Agent.orchestrate（编排逻辑）
- [ ] 实现 /create-agent 交互命令
- [ ] 实现 Agent.save（持久化）
- [ ] 实现 Agent.loadFromFile（从文件加载）
- [ ] 集成 MCP 和 Skills 关联

## 测试任务

### 单元测试

```typescript
describe('Agent 编排', () => {
  test('加载预设 agent', () => {
    const agents = Agent.listPresets();
    expect(agents.map(a => a.id)).toContain('orchestrator');
    expect(agents.map(a => a.id)).toContain('explorer');
  });

  test('创建自定义 agent', async () => {
    const agent = await Agent.create({
      id: 'my-tester',
      name: '测试专家',
      description: '专门写测试的 agent',
      systemPrompt: '你是测试专家...',
      model: 'claude-sonnet',
      tools: ['read', 'write', 'bash'],
      permissions: { canWrite: true, canExecute: true, canNetwork: false },
    });
    expect(agent.id).toBe('my-tester');
  });

  test('agent 工具权限过滤', () => {
    const oracle = Agent.get('oracle');
    const tools = Agent.resolveTools(oracle);
    // oracle 是只读的，不应该有 write/edit/bash
    expect(tools.map(t => t.name)).not.toContain('write');
    expect(tools.map(t => t.name)).not.toContain('bash');
  });

  test('agent MCP 关联', () => {
    const librarian = Agent.get('librarian');
    expect(librarian.mcps).toContain('websearch');
  });

  test('编排任务分派', async () => {
    const plan = await Agent.orchestrate('实现用户登录功能');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps.some(s => s.agent === 'explorer')).toBe(true);
  });

  test('自定义 agent 持久化', async () => {
    await Agent.save('my-tester', { dir: '.axiom/agents' });
    const loaded = Agent.loadFromFile('.axiom/agents/my-tester.md');
    expect(loaded.id).toBe('my-tester');
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- 预设 Agent 定义和加载完成
- 动态创建 Agent（/create-agent 命令）实现完成
- Agent 工具权限管理正确
- Agent MCP/Skill 关联实现完成
- orchestrator 编排逻辑实现完成
- Agent 配置持久化正确
- 所有单元测试通过
