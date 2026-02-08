# SPEC-09: 数据持久化

> 里程碑: M1 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: SPEC-00

## 目标

实现基于文件系统的 JSON 持久化层，为会话、消息、配置等提供读写存储。

## 需求

### R1: Storage 命名空间

```typescript
export namespace Storage {
  export function init(baseDir: string): void;
  export function write<T>(key: string[], data: T): Promise<void>;
  export function read<T>(key: string[]): Promise<T>;
  export function remove(key: string[]): Promise<void>;
  export function list(prefix: string[]): Promise<string[][]>;
  export function exists(key: string[]): Promise<boolean>;
}
```

### R2: 存储路径映射

key 数组映射到文件路径：
- `['session', 'abc123']` → `{baseDir}/session/abc123.json`
- `['message', 'abc123', 'msg001']` → `{baseDir}/message/abc123/msg001.json`

### R3: 错误处理

- 读取不存在的 key 抛出 `StorageNotFoundError`
- 自动创建不存在的中间目录

## 验收场景

### 场景 1: 写入和读取

- **当** 调用 `Storage.write(['test', 'item1'], { name: 'hello' })`
- **然后** 调用 `Storage.read(['test', 'item1'])` 返回 `{ name: 'hello' }`

### 场景 2: 列出键

- **当** 写入多个 key 后调用 `Storage.list(['test'])`
- **那么** 返回所有匹配 key 的数组

### 场景 3: 删除

- **当** 调用 `Storage.remove(['test', 'item1'])`
- **那么** 再读取抛出 `StorageNotFoundError`

### 场景 4: 不存在的 key

- **当** 读取不存在的 key
- **那么** 抛出 `StorageNotFoundError`

### 场景 5: 检查存在性

- **当** 调用 `Storage.exists(['test', 'item1'])`
- **那么** 返回布尔值
