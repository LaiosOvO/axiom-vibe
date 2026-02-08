# SPEC-08: LSP 集成

> 里程碑: M1 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: SPEC-04

## 目标

实现 LSP (Language Server Protocol) 服务器注册和管理。支持多语言 LSP 服务器配置，管理连接状态，提供诊断、定义跳转等功能的数据结构。

## 需求

### R1: LspServer 命名空间

```typescript
export namespace LspServer {
  export const Config = z.object({
    language: z.string(),
    command: z.array(z.string()),
    extensions: z.array(z.string()),
    rootPatterns: z.array(z.string()).optional(),
    initOptions: z.record(z.unknown()).optional(),
  })
  export type Config = z.infer<typeof Config>

  export type Status = 'stopped' | 'starting' | 'running' | 'error'

  export const Info = z.object({
    language: z.string(),
    config: Config,
    status: z.enum(['stopped', 'starting', 'running', 'error']),
    error: z.string().optional(),
  })
  export type Info = z.infer<typeof Info>

  export function register(config: Config): void;
  export function get(language: string): Info | undefined;
  export function list(): Info[];
  export function getByExtension(ext: string): Info | undefined;
  export function updateStatus(language: string, status: Status, error?: string): void;
  export function remove(language: string): void;
  export function reset(): void;
}
```

### R2: 内置 LSP 服务器配置（5 个）

| language | command | extensions |
|----------|---------|------------|
| typescript | `['typescript-language-server', '--stdio']` | `.ts`, `.tsx`, `.js`, `.jsx` |
| python | `['pylsp']` | `.py` |
| go | `['gopls']` | `.go` |
| rust | `['rust-analyzer']` | `.rs` |
| json | `['vscode-json-language-server', '--stdio']` | `.json` |

### R3: Diagnostic 数据结构

```typescript
export namespace LspDiagnostic {
  export const Info = z.object({
    file: z.string(),
    line: z.number(),
    character: z.number(),
    severity: z.enum(['error', 'warning', 'info', 'hint']),
    message: z.string(),
    source: z.string().optional(),
  })
  export type Info = z.infer<typeof Info>
}
```

## 验收场景

### 场景 1: 获取内置 LSP 服务器
- **当** 调用 `LspServer.get('typescript')`
- **那么** 返回 Info 包含 command 和 extensions

### 场景 2: 通过扩展名查找
- **当** 调用 `LspServer.getByExtension('.ts')`
- **那么** 返回 typescript 的 Info

### 场景 3: 注册自定义 LSP
- **当** 注册 `{ language: 'java', command: ['jdtls'], extensions: ['.java'] }`
- **那么** `LspServer.get('java')` 返回该配置

### 场景 4: 状态管理
- **当** `LspServer.updateStatus('typescript', 'running')`
- **那么** status 更新为 'running'

### 场景 5: 诊断数据
- **当** 创建 `LspDiagnostic.Info.parse({ file: 'a.ts', line: 1, character: 0, severity: 'error', message: '...' })`
- **那么** Schema 验证通过
