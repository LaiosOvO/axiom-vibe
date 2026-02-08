# SPEC-09: 数据持久化 — 设计文档

> 状态: 已设计

## 技术方案

参考 opencode 的 Storage 实现，使用基于文件系统的 JSON 持久化：

```
Storage.write(['session', 'abc123'], data)
    ↓
JSON.stringify(data, null, 2)
    ↓
写入 {baseDir}/session/abc123.json
```

## 接口设计

```typescript
export namespace Storage {
  export function init(baseDir: string): void;
  export function write<T>(key: string[], data: T): Promise<void>;
  export function read<T>(key: string[]): Promise<T>;
  export function remove(key: string[]): Promise<void>;
  export function exists(key: string[]): Promise<boolean>;
  export function list(prefix: string[]): Promise<string[][]>;
  export function reset(): void;

  export class StorageNotFoundError extends Error {
    constructor(key: string[])
  }
}
```

## 数据结构

所有数据以 JSON 格式存储（2 空格缩进）。

## 依赖关系

- SPEC-00: 项目初始化
- Node.js fs/promises, path
