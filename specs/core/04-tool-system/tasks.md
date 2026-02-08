# SPEC-04: 工具系统 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 实现 Tool.define 工厂函数
- [ ] 实现 ToolRegistry（注册/获取/列出）
- [ ] 实现 bash 工具
- [ ] 实现 read 工具
- [ ] 实现 write 工具
- [ ] 实现 edit 工具
- [ ] 实现 glob 工具
- [ ] 实现 grep 工具
- [ ] 实现 task 工具（启动子 agent）
- [ ] 实现 webfetch 工具
- [ ] 实现 websearch 工具
- [ ] 实现 github_search 工具
- [ ] 实现 spec 工具
- [ ] 实现 todo 工具
- [ ] 实现 question 工具
- [ ] 启动时自动注册所有内置工具
- [ ] 实现参数 Zod 验证

## 测试任务

### 单元测试

```typescript
describe('Tool', () => {
  test('定义和注册工具', () => {
    const tool = Tool.define({
      name: 'test_tool',
      description: '测试工具',
      parameters: z.object({ input: z.string() }),
      result: z.object({ output: z.string() }),
      execute: async ({ input }) => ({ output: input.toUpperCase() }),
    });
    ToolRegistry.register(tool);
    expect(ToolRegistry.get('test_tool')).toBeDefined();
  });

  test('执行工具', async () => {
    const tool = ToolRegistry.get('test_tool')!;
    const result = await tool.execute({ input: 'hello' });
    expect(result.output).toBe('HELLO');
  });

  test('参数验证失败时抛出错误', async () => {
    const tool = ToolRegistry.get('test_tool')!;
    await expect(tool.execute({ input: 123 } as any)).rejects.toThrow();
  });

  test('按名称列表解析工具', () => {
    const tools = ToolRegistry.resolve(['read', 'write', 'bash']);
    expect(tools).toHaveLength(3);
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- Tool.define 工厂模式实现完成
- ToolRegistry 注册表实现完成
- 所有内置工具实现完成
- 参数 Zod 验证有效
- 所有单元测试通过
