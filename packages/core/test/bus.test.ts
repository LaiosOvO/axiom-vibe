import { beforeEach, describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { Bus, BusEvent } from '../src/bus'

describe('SPEC-02: 事件总线', () => {
  beforeEach(() => {
    Bus.reset()
  })

  test('BusEvent.define 创建事件定义', () => {
    const evt = BusEvent.define('test.event', z.object({ value: z.number() }))
    expect(evt.name).toBe('test.event')
    expect(evt.schema).toBeDefined()
  })

  test('发布和订阅事件', () => {
    const TestEvent = BusEvent.define('test.pub', z.object({ value: z.number() }))
    let received: number | null = null
    Bus.subscribe(TestEvent, (data) => {
      received = data.value
    })
    Bus.publish(TestEvent, { value: 42 })
    expect(received).toBe(42)
  })

  test('取消订阅后不再接收', () => {
    const TestEvent = BusEvent.define('test.unsub', z.object({ x: z.string() }))
    let count = 0
    const unsub = Bus.subscribe(TestEvent, () => {
      count++
    })
    Bus.publish(TestEvent, { x: 'a' })
    unsub()
    Bus.publish(TestEvent, { x: 'b' })
    expect(count).toBe(1)
  })

  test('schema 验证失败时抛出错误', () => {
    const TestEvent = BusEvent.define('test.schema', z.object({ n: z.number() }))
    // biome-ignore lint/suspicious/noExplicitAny: 故意传入错误类型来测试 schema 验证
    expect(() => Bus.publish(TestEvent, { n: 'not-number' } as any)).toThrow()
  })

  test('多个订阅者都能收到事件', () => {
    const TestEvent = BusEvent.define('test.multi', z.object({ v: z.number() }))
    const results: number[] = []
    Bus.subscribe(TestEvent, (d) => results.push(d.v * 1))
    Bus.subscribe(TestEvent, (d) => results.push(d.v * 2))
    Bus.publish(TestEvent, { v: 5 })
    expect(results).toEqual([5, 10])
  })

  test('reset 清除所有订阅', () => {
    const TestEvent = BusEvent.define('test.reset', z.object({ x: z.number() }))
    let called = false
    Bus.subscribe(TestEvent, () => {
      called = true
    })
    Bus.reset()
    Bus.publish(TestEvent, { x: 1 })
    expect(called).toBe(false)
  })

  test('subscriberCount 返回订阅者数量', () => {
    const TestEvent = BusEvent.define('test.count', z.object({ x: z.number() }))
    expect(Bus.subscriberCount(TestEvent)).toBe(0)
    const unsub1 = Bus.subscribe(TestEvent, () => {})
    const unsub2 = Bus.subscribe(TestEvent, () => {})
    expect(Bus.subscriberCount(TestEvent)).toBe(2)
    unsub1()
    expect(Bus.subscriberCount(TestEvent)).toBe(1)
  })
})
