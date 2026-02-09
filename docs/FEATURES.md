# Axiom 功能文档

> 版本: M7 | 更新时间: 2026-02-09 | 测试: 369 pass / 8 typecheck

Axiom 是一个从零实现的开源 AI 编码 Agent 平台，支持多种 LLM Provider、Spec 驱动开发、Deep Research、多 Agent 协作、浏览器自动化等能力。

---

## 目录

- [1. 运行模式](#1-运行模式)
- [2. LLM 多 Provider 支持](#2-llm-多-provider-支持)
- [3. 内置工具系统](#3-内置工具系统)
- [4. Agent 系统](#4-agent-系统)
- [5. Permission 权限控制](#5-permission-权限控制)
- [6. Spec 驱动开发引擎](#6-spec-驱动开发引擎)
- [7. Deep Research 参考研究](#7-deep-research-参考研究)
- [8. Skill 技能系统](#8-skill-技能系统)
- [9. 浏览器自动化工具](#9-浏览器自动化工具)
- [10. Session 会话管理](#10-session-会话管理)
- [11. MCP 协议客户端](#11-mcp-协议客户端)
- [12. LSP 协议客户端](#12-lsp-协议客户端)
- [13. TUI 终端界面](#13-tui-终端界面)
- [14. HTTP 服务器](#14-http-服务器)
- [15. 项目结构](#15-项目结构)

---

## 1. 运行模式

Axiom 提供三种运行模式：

### 交互模式（TUI）

```bash
cd your-project
axiom
```

启动 SolidJS 驱动的终端 UI，支持：
- 流式渲染 LLM 响应（逐字输出）
- 工具调用结果实时显示
- 危险操作权限确认弹窗
- 会话历史浏览

### Headless 模式

```bash
axiom run "帮我实现用户登录功能"
```

无 UI 直接执行，适合 CI/CD 或脚本调用。流程：
1. 读取项目配置 → 2. 初始化 Provider → 3. 创建 Session → 4. LLM 流式调用 → 5. 工具执行 → 6. 输出结果

### 服务器模式

```bash
axiom serve
# 默认监听 http://127.0.0.1:4096
```

Hono HTTP API，供 Desktop/VSCode 等客户端连接：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/session` | POST | 创建新会话 |
| `/session/:id` | GET | 获取会话信息 |
| `/session/:id/message` | POST | 发送消息（SSE 流式响应） |

---

## 2. LLM 多 Provider 支持

基于 Vercel AI SDK v6，统一接口调用多家 LLM：

| Provider | 模型示例 | 环境变量 |
|----------|---------|----------|
| **Anthropic** | claude-sonnet-4-20250514 | `ANTHROPIC_API_KEY` |
| **OpenAI** | gpt-4o | `OPENAI_API_KEY` |
| **Google** | gemini-2.0-flash | `GOOGLE_API_KEY` |
| **Groq** | llama-3.3-70b | `GROQ_API_KEY` |
| **Mistral** | mistral-large | `MISTRAL_API_KEY` |
| **xAI** | grok-3 | `XAI_API_KEY` |

### 配置方式

在项目根目录创建 `axiom.config.json`：

```json
{
  "provider": "anthropic",
  "model": {
    "default": "claude-sonnet-4-20250514",
    "maxOutputTokens": 16384,
    "temperature": 0
  }
}
```

### 代码示例

```typescript
import { Provider } from '@axiom-ai/core'

// 自动检测可用 provider（按优先级）
const provider = Provider.detect()

// 获取 AI SDK 模型实例
const model = Provider.getModel(provider)

// 流式调用
for await (const event of LLM.stream({ model, messages: [...] })) {
  if (event.type === 'text-delta') process.stdout.write(event.text)
}
```

---

## 3. 内置工具系统

Agent 可调用以下工具与文件系统和外部世界交互：

### 基础工具（8 个，自动注册）

| 工具 | 说明 | 参数 |
|------|------|------|
| `read` | 读取文件内容 | `{ path: string }` |
| `write` | 写入文件 | `{ path: string, content: string }` |
| `edit` | 精确文本替换 | `{ path: string, oldText: string, newText: string }` |
| `bash` | 执行 shell 命令 | `{ command: string }` |
| `glob` | 文件模式搜索 | `{ pattern: string, cwd?: string }` |
| `grep` | 正则内容搜索 | `{ pattern: string, path?: string, include?: string }` |
| `ls` | 列出目录 | `{ path: string }` |
| `webfetch` | 抓取网页 | `{ url: string }` |

### 浏览器工具（6 个，可选注册）

见 [第 9 节](#9-浏览器自动化工具)。

### 自定义工具

```typescript
import { Tool, ToolRegistry } from '@axiom-ai/core'
import { z } from 'zod'

const myTool = Tool.define({
  name: 'my_tool',
  description: '我的自定义工具',
  parameters: z.object({ input: z.string() }),
  result: z.object({ output: z.string() }),
  execute: async (params) => {
    return { output: `处理: ${params.input}` }
  },
})

ToolRegistry.register(myTool)
```

### 权限确认

工具调用分为三级：
- **白名单**（read, glob, grep, ls）— 自动执行
- **普通工具**（write, edit）— 需用户确认
- **危险工具**（bash）— 强制确认，支持 "Always Allow"

---

## 4. Agent 系统

### 内置 Agent

| Agent | 模式 | 用途 | 可用工具 |
|-------|------|------|---------|
| **build** | primary | 默认编码助手，全功能 | 全部 8 个 |
| **plan** | primary | 任务规划，只编辑 .md | read, write, edit, glob, grep |
| **explore** | subagent | 代码搜索分析，只读 | read, glob, grep, bash, ls, webfetch |
| **title** | hidden | 生成会话标题 | 无 |
| **summary** | hidden | 生成会话摘要 | 无 |

### Agent 模式

| 模式 | 说明 |
|------|------|
| `primary` | 用户直接交互，出现在 Agent 选择列表 |
| `subagent` | 被其他 Agent 调用（如 build 调用 explore 搜索代码） |
| `hidden` | 系统内部使用，用户不可见 |

### Agent 定义

每个 Agent 包含：
- **systemPromptFile** — `.txt` 模板文件（`packages/core/src/agent/prompt/` 下）
- **tools** — 允许使用的工具列表
- **permissions** — 权限规则列表（见第 5 节）
- **model** — 使用的 LLM 模型
- **temperature** — 温度参数

### System Prompt 模板

| 文件 | 行数 | 内容 |
|------|------|------|
| `build.txt` | 254 | 工具使用规范、TodoWrite 管理、代码规范、Git 安全协议 |
| `explore.txt` | 115 | 只读搜索策略、多角度搜索、精简输出 |
| `plan.txt` | 150 | 需求分析、任务拆分、brainstorm→plan→review 流程 |
| `title.txt` | 110 | 标题生成规则和示例 |
| `summary.txt` | 161 | 结构化摘要模板 |

### 自定义 Agent

```typescript
import { Agent } from '@axiom-ai/core'

Agent.registerAgentDef({
  id: 'reviewer',
  name: 'Reviewer',
  description: '代码审查专家',
  mode: 'subagent',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: '你是一个严格的代码审查专家...',
  tools: ['read', 'glob', 'grep'],
  permissions: [
    { tool: 'read', action: 'allow' },
    { tool: '*', action: 'deny' },
  ],
})
```

---

## 5. Permission 权限控制

### 规则定义

```typescript
interface PermissionRule {
  tool: string      // 工具名，* 表示所有
  pattern?: string  // 参数匹配 glob（如 '*.md'）
  action: 'allow' | 'deny' | 'ask'
}
```

### 评估策略

权限评估采用混合策略：

1. **有 pattern 且匹配** → 立即返回（first specific match）
2. **具体工具规则** 优先于 **通配规则**（`tool !== '*'`）
3. **无 pattern 规则** → last match wins

### 示例：Plan Agent 权限

```typescript
const planPermissions = [
  { tool: 'write', pattern: '*.md', action: 'allow' },  // 只能写 markdown
  { tool: 'write', action: 'deny' },                     // 其他文件禁止写
  { tool: 'edit', pattern: '*.md', action: 'allow' },    // 只能编辑 markdown
  { tool: 'edit', action: 'deny' },                       // 其他文件禁止编辑
  { tool: '*', action: 'allow' },                          // 其他工具允许
]
```

调用 `Permission.evaluate(rules, 'write', { path: 'plan.md' })` → `'allow'`
调用 `Permission.evaluate(rules, 'write', { path: 'index.ts' })` → `'deny'`

### Doom Loop 检测

当同一工具 + 相同参数在 60 秒内被调用 3 次时，自动触发 `ask`，防止 Agent 陷入死循环。

```typescript
Permission.checkDoomLoop(history, 'write', { path: 'file.ts' })
// → true（需要用户确认）
```

---

## 6. Spec 驱动开发引擎

参考 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 框架，实现四阶段状态机。

### 四阶段循环

```
Proposal (提案) → Definition (定义) → Apply (实施) → Archive (归档)
    ↑                                                    |
    └────────────────── 新需求 ──────────────────────────┘
```

### 目录结构

```
openspec/
├── project.md              # 项目全局上下文
├── specs/                   # 归档的 spec（事实来源）
│   └── auth-login/
│       └── spec.md
└── changes/                 # 活动变更提案
    └── add-dark-mode/
        ├── proposal.md      # 变更意图
        ├── design.md        # 技术设计
        ├── tasks.md         # 原子任务清单
        └── specs/           # spec 增量
```

### API

```typescript
import { SpecEngine } from '@axiom-ai/core'

// 初始化目录结构
await SpecEngine.init('/path/to/project')

// 创建变更提案
const change = await SpecEngine.createChange(
  '/path/to/project',
  'add-dark-mode',
  '为应用添加暗黑模式主题切换功能'
)
// → 自动创建 changes/add-dark-mode/proposal.md

// 写入技术设计
await SpecEngine.writeDesign(root, 'add-dark-mode', '# 技术设计\n...')

// 写入任务列表
await SpecEngine.writeTasks(root, 'add-dark-mode', [
  { id: '1.1', description: '创建主题 Context', status: 'pending' },
  { id: '1.2', description: '实现 Toggle 组件', status: 'pending' },
  { id: '2.1', description: '编写 CSS 变量', status: 'pending' },
])

// 推进阶段
await SpecEngine.advancePhase(root, 'add-dark-mode')
// proposal → definition → apply → archive

// 更新任务状态
await SpecEngine.updateTaskStatus(root, 'add-dark-mode', '1.1', 'done')

// 归档（合并到 specs/）
await SpecEngine.archiveChange(root, 'add-dark-mode')
```

### tasks.md 格式

```markdown
# Tasks

- [ ] 1.1 创建主题 Context
- [x] 1.2 实现 Toggle 组件
- [ ] 2.1 编写 CSS 变量
```

---

## 7. Deep Research 参考研究

将外部参考项目克隆下来，分析其结构和功能，生成参考文档供 Plan 阶段使用。

### ref/ 目录结构

```
ref/
├── repos/               # 克隆的原始项目
│   └── opencode/
├── opencode/            # 生成的参考文档
│   ├── summary.md       # 项目总览
│   ├── structure.md     # 目录结构树
│   └── modules.md       # 功能模块映射
└── index.md             # 所有参考项目索引
```

### API

```typescript
import { Research } from '@axiom-ai/core'

// 初始化 ref 目录
await Research.initRefDir('/path/to/project')

// 克隆参考项目
const project = await Research.cloneProject(
  '/path/to/project',
  'https://github.com/nicepkg/opencode.git',
  'opencode'
)

// 分析目录结构
const tree = await Research.analyzeStructure(project.localPath)
// → "├── src/\n│   ├── agent/\n│   ├── session/\n..."

// 分析文件 export
const files = await Research.analyzeFiles(project.localPath, ['ts', 'tsx'])
// → [{ path: 'src/agent/agent.ts', purpose: '...', exports: ['Agent', 'AgentInfo'] }]

// 生成功能映射
const mappings = await Research.generateModuleMapping(
  project.localPath,
  ['Agent 系统', 'Session 管理', '工具调用']
)
// → [{ feature: 'Agent 系统', sourceFiles: ['src/agent/'], description: '...' }]

// 生成并保存完整参考文档
const doc = await Research.generateRefDocument(root, project, features)
const path = await Research.saveRefDocument(root, doc)
// → 'ref/opencode/summary.md'

// 搜索参考文档
const results = await Research.searchRef(root, 'permission')
// → 匹配的 ModuleMapping 列表
```

### 用途

1. **Plan 阶段输入** — "这个功能参考 opencode 的 `src/agent/` 目录"
2. **架构对比** — 对比多个参考项目的实现方式
3. **知识积累** — ref/ 文档持久化保存，跨会话可用

---

## 8. Skill 技能系统

Skill 是可复用的知识模块，通过 SKILL.md 文件定义，注入 Agent 的 System Prompt。

### SKILL.md 格式

```markdown
---
name: test-driven-development
description: 使用 TDD 方法实现功能，先写测试再写代码
---

# TDD 工作流

1. 分析需求，确定测试用例
2. 编写失败的测试
3. 实现最小代码使测试通过
4. 重构优化
5. 重复
```

### 扫描目录

| 级别 | 扫描路径 |
|------|---------|
| 项目级 | `.axiom/skill/`, `.opencode/skill/`, `.claude/skills/` |
| 用户级 | `~/.config/axiom/skill/`, `~/.config/opencode/skill/` |

### API

```typescript
import { Skill } from '@axiom-ai/core'

// 加载所有 skill（项目 + 用户）
const skills = await Skill.loadAll('/path/to/project')

// 根据名称获取
const tdd = Skill.getByName(skills, 'test-driven-development')

// 格式化为 System Prompt 片段
const promptFragment = Skill.formatForPrompt(skills)
// → '<available_skills>\n  <skill>\n    <name>test-driven-development</name>\n...'

// 注册表管理
Skill.register(skill)
Skill.get('test-driven-development')
Skill.list()
```

### 注入方式

Skill 内容会被格式化为 XML 并插入 Agent 的 System Prompt：

```xml
<available_skills>
  <skill>
    <name>test-driven-development</name>
    <description>使用 TDD 方法实现功能</description>
  </skill>
  <skill>
    <name>git-workflow</name>
    <description>Git 分支和提交规范</description>
  </skill>
</available_skills>
```

---

## 9. 浏览器自动化工具

基于 Playwright，让 Agent 操作浏览器进行 E2E 测试和网页交互。

> **前提条件**：需要安装 `playwright`（`bun add playwright`）

### 工具列表

| 工具 | 说明 | 关键参数 |
|------|------|---------|
| `browser_navigate` | 导航到 URL | `url`, `waitUntil` |
| `browser_screenshot` | 截图 | `selector?`, `fullPage`, `path?` |
| `browser_click` | 点击元素 | `selector`, `button` |
| `browser_type` | 输入文本 | `selector`, `text`, `delay` |
| `browser_evaluate` | 执行 JavaScript | `script` |
| `browser_wait` | 等待元素出现 | `selector`, `timeout`, `state` |

### 注册

浏览器工具默认不注册（避免未安装 playwright 时报错），需要手动调用：

```typescript
import { registerBrowserTools, closeBrowser } from '@axiom-ai/core/tool/browser'

// 注册浏览器工具到 ToolRegistry
registerBrowserTools()

// 使用完毕后关闭浏览器
await closeBrowser()
```

### 特性

- **延迟加载** — Playwright 在首次使用时才动态 import
- **单例模式** — 全局复用一个 Browser/Page 实例
- **Headless 模式** — 默认无头运行

---

## 10. Session 会话管理

### 功能

| 操作 | 说明 |
|------|------|
| 创建会话 | 分配 UUID，初始化消息历史 |
| 添加消息 | 支持 user / assistant / system 角色 |
| 流式处理 | LLM.stream → 事件流 → TUI 渲染 |
| 持久化 | 自动保存到 `.axiom/sessions/<id>.json` |
| 加载历史 | 从磁盘恢复会话 |
| 列出会话 | 查看所有历史会话 |

### 代码示例

```typescript
import { Session } from '@axiom-ai/core'

// 创建会话
const session = Session.create()

// 添加消息
Session.addMessage(session, { role: 'user', content: '帮我写一个 TODO 应用' })

// 持久化
await Session.saveToDisk(session, '/path/to/project')

// 加载
const loaded = await Session.loadFromDisk(session.id, '/path/to/project')

// 列出所有会话
const all = await Session.loadAll('/path/to/project')
```

---

## 11. MCP 协议客户端

支持连接外部 MCP (Model Context Protocol) 服务器，扩展 Agent 能力。

### 功能

- JSON-RPC 2.0 通信（stdin/stdout）
- 自动初始化握手（`initialize` → `initialized`）
- 工具列表获取（`tools/list`）
- 工具调用（`tools/call`）
- 进程生命周期管理

### 配置

在 `axiom.config.json` 中配置 MCP 服务器：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "..." }
    }
  }
}
```

---

## 12. LSP 协议客户端

连接语言服务器，为 Agent 提供代码智能分析能力。

### 功能

- Content-Length 协议通信
- 初始化握手 + 能力协商
- 诊断信息推送（错误、警告）
- 支持任何 LSP 兼容的语言服务器

### 配置

```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"]
    }
  }
}
```

---

## 13. TUI 终端界面

基于 SolidJS + @opentui/solid 构建的响应式终端 UI。

### 特性

| 功能 | 说明 |
|------|------|
| 流式渲染 | LLM 输出逐字显示 |
| 工具调用展示 | 显示工具名、参数、执行结果 |
| 权限确认弹窗 | 危险操作需用户确认 |
| 路由系统 | 首页 → 新会话 / 历史会话 → 会话详情 |
| 响应式布局 | 自适应终端尺寸 |

---

## 14. HTTP 服务器

基于 Hono 的 REST API 服务器。

### 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /health` | GET | 健康检查，返回 `{"status":"ok"}` |
| `POST /session` | POST | 创建新会话 |
| `GET /session/:id` | GET | 获取会话信息 |
| `POST /session/:id/message` | POST | 发送消息，SSE 流式响应 |
| `GET /config` | GET | 获取当前配置 |

### 特性

- 默认端口 4096
- SSE (Server-Sent Events) 流式响应
- CORS 支持
- 错误统一处理

---

## 15. 项目结构

```
axiom/
├── packages/
│   ├── core/                  # 核心引擎
│   │   ├── src/
│   │   │   ├── index.ts       # CLI 入口（TUI / run / serve）
│   │   │   ├── config/        # 配置管理
│   │   │   ├── provider/      # LLM Provider 工厂
│   │   │   ├── session/       # 会话 + LLM 调用 + System Prompt
│   │   │   ├── agent/         # Agent 定义 + Prompt 模板
│   │   │   │   └── prompt/    # .txt System Prompt 文件
│   │   │   ├── permission/    # 权限规则系统
│   │   │   ├── skill/         # Skill 扫描和注册
│   │   │   ├── tool/          # 工具定义 + ToolRegistry
│   │   │   │   ├── index.ts   # 8 个内置工具
│   │   │   │   └── browser.ts # 6 个浏览器工具
│   │   │   ├── spec/          # Spec 驱动引擎
│   │   │   ├── research/      # Deep Research
│   │   │   ├── orchestrator/  # Agent 编排
│   │   │   ├── mcp/           # MCP 客户端
│   │   │   ├── lsp/           # LSP 客户端
│   │   │   ├── server/        # Hono HTTP 服务器
│   │   │   ├── bus/           # 事件总线
│   │   │   └── storage/       # 文件存储
│   │   └── test/              # 30 个测试文件，369 个测试
│   ├── app/                   # TUI 前端（SolidJS）
│   ├── sdk/                   # 客户端 SDK
│   ├── desktop/               # 桌面应用（Tauri）
│   ├── vscode/                # VSCode 插件
│   ├── ui/                    # 共享 UI 组件
│   ├── plugin/                # Plugin SDK
│   └── util/                  # 共享工具库
├── specs/                     # OpenSpec 规格文件
│   ├── PROJECT.md
│   ├── core/                  # 11 个核心 spec
│   ├── features/              # 11 个功能 spec
│   └── clients/               # 4 个客户端 spec
├── docs/                      # 文档（中文）
├── ref/                       # Deep Research 参考文档
└── progress/                  # 进度追踪
```

---

## 技术栈

| 层面 | 技术 | 版本 |
|------|------|------|
| 运行时 | Bun | >= 1.0 |
| 语言 | TypeScript (ESM) | 5.8 |
| AI SDK | Vercel AI SDK | 6.0 |
| HTTP | Hono | 4.10 |
| 数据验证 | Zod | 4.1 |
| TUI | SolidJS + @opentui/solid | — |
| 桌面 | Tauri | — |
| 浏览器 | Playwright (可选) | — |
| 测试 | bun:test | — |
| 构建 | Turborepo | 2.5 |
| 代码规范 | Biome | 1.9 |

---

## 测试覆盖

```
总计: 369 个测试 / 30 个测试文件
Typecheck: 8/8 packages 通过

测试分布:
├── spec.test.ts          24 个（Spec 驱动引擎）
├── research.test.ts      15 个（Deep Research）
├── agent.test.ts         17 个（Agent 系统）
├── permission.test.ts    19 个（Permission 权限）
├── skill.test.ts         23 个（Skill 系统）
├── browser-tool.test.ts  19 个（浏览器工具）
├── integration.test.ts   26 个（集成测试）
├── tool.test.ts + tool-new.test.ts + tool-impl.test.ts  工具测试
├── session*.test.ts      会话 + LLM + Processor
├── provider*.test.ts     Provider + AI Adapter
├── mcp*.test.ts          MCP 协议
├── lsp*.test.ts          LSP 协议
└── ...其他
```
