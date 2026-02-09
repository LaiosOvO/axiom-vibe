# VSCode 扩展开发指南

## 构建步骤

### 1. 安装依赖

由于项目使用 workspace，建议在项目根目录安装：

```bash
# 回到项目根目录
cd ../..

# 使用 bun 安装所有依赖
bun install
```

或者在 vscode 目录单独安装（需要 npm）：

```bash
cd packages/vscode
npm install --legacy-peer-deps
```

### 2. 编译扩展

```bash
npm run compile
```

这会将 `src/extension.ts` 编译为 CommonJS 格式的 `dist/extension.js`。

### 3. 打包为 .vsix

```bash
npm run package
```

这会生成 `axiom-ai-vscode-0.1.0.vsix` 文件。

### 4. 安装扩展

在 VSCode 中：
1. 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. 输入 "Extensions: Install from VSIX"
3. 选择生成的 `.vsix` 文件

## 验证配置

验证 vsce 配置是否正确：

```bash
npx @vscode/vsce ls
```

## 已知问题

### npm 安装失败

如果 `npm install` 失败，可能是因为：

1. **包名冲突** - 根目录 package.json 中可能有 `@axiom-ai/vscode` 的别名
2. **Workspace 配置** - 项目使用 bun workspaces，建议在根目录安装

**解决方案**：

```bash
# 方案 1: 在根目录安装（推荐）
cd ../..
bun install

# 方案 2: 清理后重新安装
cd packages/vscode
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### TypeScript 版本冲突

如果遇到 TypeScript 版本问题：

```bash
# 使用项目根目录的 TypeScript
cd ../..
bun run typecheck

# 或使用 npx
cd packages/vscode
npx tsc -p tsconfig.vscode.json --noEmit
```

## 文件说明

### 核心文件

- **src/extension.ts** - VSCode 扩展入口，实现 `activate()` 和 `deactivate()`
- **src/index.ts** - VscodePlugin namespace，可复用的核心逻辑
- **tsconfig.vscode.json** - VSCode 扩展专用的 TypeScript 配置
- **.vscodeignore** - 打包时排除的文件列表

### 配置字段

package.json 中的关键字段：

- **name** - 必须是纯字符串，不能有作用域（如 `@xxx/`）
- **main** - 指向编译后的入口文件 `./dist/extension.js`
- **engines.vscode** - 最低支持的 VSCode 版本
- **activationEvents** - 扩展激活时机
- **contributes** - 贡献点：命令、快捷键、配置等

## 调试

### 方式 1: 使用 VSCode 调试

1. 在 VSCode 中打开项目
2. 按 `F5` 启动调试
3. 在新窗口中测试扩展

### 方式 2: 手动安装测试

1. 编译并打包
2. 安装 .vsix 文件
3. 重启 VSCode
4. 测试命令和功能

## 发布

**注意**: 当前配置为开发测试用，不要发布到 VSCode Marketplace。

如需发布，需要：

1. 注册 Azure DevOps 账号
2. 创建 Personal Access Token
3. 登录：`npx vsce login axiom-ai`
4. 发布：`npx vsce publish`

## 技术细节

### CommonJS vs ESM

VSCode 扩展要求使用 CommonJS 格式：

- tsconfig.vscode.json 中 `module: "commonjs"`
- package.json 中不能有 `"type": "module"`
- 编译输出为 `.js` 文件（非 `.mjs`）

### WebView 通信

扩展使用 WebView 与 Axiom 服务器通信：

1. **扩展 → WebView**: `panel.webview.postMessage()`
2. **WebView → 扩展**: `vscode.postMessage()`
3. **WebView → Axiom**: Fetch API + SSE

### 状态管理

- 使用 `VscodePlugin.ExtensionState` 管理扩展状态
- 通过 `VscodePlugin.handleCommand()` 处理命令
- WebView 状态独立管理（HTML + JavaScript）
