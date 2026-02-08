# SPEC-00: 项目初始化 — 设计文档

> 状态: 待设计

## 技术方案

### Monorepo 工具链

- **包管理器**: Bun workspaces
- **构建编排**: Turborepo
- **语言**: TypeScript 5.7+ (ESM, 严格模式)
- **代码规范**: Biome (行宽 100，2 空格，单引号)
- **测试框架**: bun:test

### 目录结构

```
axiom/
├── packages/
│   ├── core/          核心引擎包
│   ├── app/           TUI 前端包
│   ├── ui/            共享 UI 组件包
│   ├── desktop/       桌面应用包
│   ├── vscode/        VSCode 插件包
│   ├── sdk/           客户端 SDK 包
│   ├── plugin/        Plugin SDK 包
│   └── util/          共享工具包
├── specs/             Spec 规格文件
├── progress/          进度追踪
├── ref/               Deep Research 参考文档
├── docs/              用户文档
├── turbo.json         Turborepo 配置
├── biome.json         Biome 配置
└── tsconfig.json      共享 TS 配置
```

## 接口设计

### CLI 入口

```typescript
// packages/core/src/index.ts
export function cli(args: string[]): Promise<void>;
```

### 命令行接口

```bash
axiom              # 交互模式
axiom run <task>   # Headless 模式
axiom serve        # 服务器模式
axiom --version    # 显示版本
axiom --help       # 显示帮助
```

## 数据结构

### package.json 结构

```json
{
  "name": "@axiom-ai/core",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "bin": {
    "axiom": "./src/index.ts"
  }
}
```

## 依赖关系

- 无依赖（M0 基础）
