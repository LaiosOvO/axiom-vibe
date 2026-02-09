# Axiom VSCode Extension

Axiom AI 的 VSCode 扩展，将 AI 驱动的编码 Agent 直接集成到你的编辑器中。

## 功能特性

- 🤖 **AI 对话** - 在 VSCode 中直接与 Axiom AI 交互
- ⚡ **实时连接** - 通过 SSE 连接到本地 Axiom 服务器
- 🎯 **快捷键支持** - `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) 快速打开面板
- 🔧 **可配置** - 自定义服务器端口和启动选项

## 安装

### 从 .vsix 文件安装

1. 下载 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. 输入 "Install from VSIX"
4. 选择下载的 `.vsix` 文件

### 从源码构建

```bash
# 进入扩展目录
cd packages/vscode

# 安装依赖
bun install

# 编译
npm run compile

# 打包
npm run package
```

这将生成 `axiom-ai-0.1.0.vsix` 文件。

## 使用

### 1. 启动 Axiom 服务器

在使用扩展前，需要先启动 Axiom 服务器：

```bash
axiom serve
```

默认端口为 4096。

### 2. 打开面板

- 使用快捷键：`Ctrl+Shift+A` (Mac: `Cmd+Shift+A`)
- 或通过命令面板：按 `Ctrl+Shift+P`，输入 "Axiom: 打开 Axiom 面板"

### 3. 开始对话

在面板中输入你的问题或需求，Axiom AI 会帮你完成任务。

## 配置

在 VSCode 设置中搜索 "axiom"：

- **axiom.serverPort** - Axiom 服务器端口（默认: 4096）
- **axiom.autoStart** - 是否自动启动服务器（默认: true）

## 可用命令

- `Axiom: 打开 Axiom 面板` - 打开 AI 对话面板
- `Axiom: 新建会话` - 创建新的对话会话
- `Axiom: 发送消息` - 快速发送消息
- `Axiom: 切换面板` - 显示/隐藏面板

## 开发

### 项目结构

```
packages/vscode/
├── src/
│   ├── extension.ts    # 扩展入口
│   └── index.ts        # VscodePlugin namespace
├── dist/              # 编译输出
├── resources/         # 图标资源
├── package.json       # 扩展配置
├── tsconfig.vscode.json  # TypeScript 配置
└── .vscodeignore     # 打包排除文件
```

### 本地调试

1. 在 VSCode 中打开此项目
2. 按 `F5` 启动调试
3. 在新窗口中测试扩展

### 编译

```bash
npm run compile
```

### 打包

```bash
npm run package
```

## 技术实现

- **入口文件**: `src/extension.ts` - 使用标准 VSCode Extension API
- **核心逻辑**: `src/index.ts` - VscodePlugin namespace（可复用）
- **通信方式**: SSE (Server-Sent Events) - 与 `axiom serve` 通信
- **WebView**: 内嵌 HTML/CSS/JS 实现对话界面

## 许可证

MIT
