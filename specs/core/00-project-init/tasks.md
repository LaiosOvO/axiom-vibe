# SPEC-00: 项目初始化 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 创建 monorepo 根目录结构
- [ ] 配置 Bun workspaces
- [ ] 配置 Turborepo 管道
- [ ] 配置 Biome linter/formatter
- [ ] 创建共享 tsconfig.json
- [ ] 创建 packages/core 包骨架
- [ ] 实现 CLI 入口 (index.ts)
- [ ] 配置全局安装 (bin)
- [ ] 添加 --version 和 --help 支持

## 测试任务

### 单元测试

```typescript
// test/project-init.test.ts
import { describe, test, expect } from 'bun:test';

describe('项目初始化', () => {
  test('turbo build 成功', async () => {
    // 执行 turbo build，期望退出码 0
  });

  test('typecheck 通过', async () => {
    // 执行 turbo typecheck，期望退出码 0
  });

  test('lint 通过', async () => {
    // 执行 biome check，期望退出码 0
  });

  test('axiom --version 输出版本号', async () => {
    // 执行 axiom --version，期望输出 0.1.0
  });

  test('axiom --help 输出帮助信息', async () => {
    // 执行 axiom --help，期望包含 run/serve 子命令
  });
});
```

### 集成测试

TODO: 待补充

## 验收标准

- turbo build/typecheck/lint 全部通过
- `axiom --version` 可执行并输出 `0.1.0`
- `axiom --help` 输出完整帮助信息
- 所有单元测试通过
