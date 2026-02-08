# SPEC-02: 事件总线 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 实现 BusEvent.define 工厂函数
- [ ] 实现 Bus.subscribe（返回取消订阅函数）
- [ ] 实现 Bus.publish（包含 Schema 验证）
- [ ] 实现订阅者管理（Map 存储）
- [ ] 定义所有内置事件（Events 命名空间）
- [ ] 添加调试工具（subscribers 计数）
- [ ] 导出公开接口

## 测试任务

### 单元测试

```typescript
describe('Bus', () => {
  test('发布和订阅事件', () => {
    const TestEvent = BusEvent.define('test', z.object({ value: z.number() }));
    let received: number | null = null;
    Bus.subscribe(TestEvent, (data) => { received = data.value; });
    Bus.publish(TestEvent, { value: 42 });
    expect(received).toBe(42);
  });

  test('取消订阅后不再接收', () => {
    const TestEvent = BusEvent.define('test2', z.object({ x: z.string() }));
    let count = 0;
    const unsub = Bus.subscribe(TestEvent, () => { count++; });
    Bus.publish(TestEvent, { x: 'a' });
    unsub();
    Bus.publish(TestEvent, { x: 'b' });
    expect(count).toBe(1);
  });

  test('schema 验证失败时抛出错误', () => {
    const TestEvent = BusEvent.define('test3', z.object({ n: z.number() }));
    expect(() => Bus.publish(TestEvent, { n: 'not-number' } as any))
      .toThrow();
  });

  test('多个订阅者都能收到事件', () => {
    const TestEvent = BusEvent.define('test4', z.object({ v: z.number() }));
    const results: number[] = [];
    Bus.subscribe(TestEvent, (d) => results.push(d.v * 1));
    Bus.subscribe(TestEvent, (d) => results.push(d.v * 2));
    Bus.publish(TestEvent, { v: 5 });
    expect(results).toEqual([5, 10]);
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- BusEvent.define 实现完成
- Bus.publish / subscribe 实现完成
- Schema 运行时验证有效
- 内置事件定义完整
- 所有单元测试通过
