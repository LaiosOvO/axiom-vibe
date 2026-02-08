# SPEC-00: 项目初始化

> 里程碑: M0 | 优先级: P0 | 状态: ⚪ 待开始

## 目标

初始化 Axiom monorepo 骨架，包含所有包的基础结构、构建工具链、代码规范配置。

## 需求

### R1: Monorepo 结构

- 使用 Bun workspaces + Turborepo 管理
- packages/ 下包含: core, app, ui, desktop, vscode, sdk, plugin, util
- 共享 tsconfig.json 基础配置

### R2: 构建工具链

- TypeScript 5.7+ 严格模式
- Biome 作为 linter/formatter（行宽 100，2 空格缩进，单引号）
- bun:test 作为测试框架
- turbo 管道: build → typecheck → test → lint

### R3: 核心包骨架 (packages/core)

```
packages/core/
├── src/
│   ├── index.ts           CLI 入口
│   ├── agent/             Agent 定义
│   ├── bus/               事件总线
│   ├── config/            配置系统
│   ├── mcp/               MCP 集成
│   ├── provider/          LLM Provider
│   ├── session/           会话管理
│   ├── tool/              工具系统
│   ├── server/            HTTP Server
│   ├── storage/           数据持久化
│   ├── lsp/               LSP 集成
│   ├── spec/              Spec 引擎
│   ├── research/          Deep Research
│   ├── growth/            自我成长
│   ├── github/            GitHub 搜索
│   └── util/              工具函数
├── package.json
└── tsconfig.json
```

### R4: 全局 CLI 入口

- `axiom` 命令可全局安装
- 支持 `axiom`（交互模式）、`axiom run`（headless）、`axiom serve`（服务器）

## 验收场景

### 场景 1: 构建流程通过

- **当** 执行 `turbo build`
- **那么** 所有包编译成功，退出码 0

### 场景 2: 类型检查通过

- **当** 执行 `turbo typecheck`
- **那么** 所有包类型检查通过，退出码 0

### 场景 3: 代码规范检查通过

- **当** 执行 `biome check`
- **那么** 所有文件符合规范，退出码 0

### 场景 4: CLI 可执行

- **当** 执行 `axiom --version`
- **那么** 输出版本号 `0.1.0`

### 场景 5: 帮助信息完整

- **当** 执行 `axiom --help`
- **那么** 输出包含 `run`、`serve` 子命令
