# Axiom Desktop

基于 Tauri v2 的 Axiom 桌面应用。

## 功能

- 嵌入式 WebView，连接到本地运行的 Axiom 服务器
- 原生桌面体验
- 跨平台支持（macOS, Windows, Linux）

## 前置要求

1. **Rust 工具链** (已安装 rustc 1.93.0)
2. **Bun** 运行时
3. **Axiom 服务器** - 通过 `axiom serve` 启动

## 开发

### 1. 安装依赖

```bash
# 安装 npm 依赖（包括 @tauri-apps/cli）
bun install
```

### 2. 启动 Axiom 服务器

在另一个终端窗口中：

```bash
# 进入项目根目录
cd ../../

# 启动 Axiom 服务器（默认端口 4096）
axiom serve
```

### 3. 开发模式

```bash
# 启动 Tauri 开发模式
bun run tauri:dev
```

这会：
- 打开一个桌面窗口
- WebView 会尝试连接到 http://localhost:4096
- 如果服务器未运行，会显示连接错误提示

## 构建

### 构建 macOS 应用

```bash
bun run tauri:build
```

构建产物位于: `src-tauri/target/release/bundle/`

支持的格式：
- `.app` - macOS 应用包
- `.dmg` - macOS 磁盘镜像

### 构建其他平台

在对应的操作系统上运行 `bun run tauri:build`：
- **Windows**: 生成 `.exe` 和 `.msi`
- **Linux**: 生成 `.deb`, `.AppImage` 等

## 项目结构

```
packages/desktop/
├── src/
│   ├── index.ts              # TypeScript 主模块
│   ├── ide/index.ts          # IDE 配置
│   └── webview/
│       └── index.html        # WebView 前端（连接到 axiom serve）
├── src-tauri/
│   ├── Cargo.toml            # Rust 依赖
│   ├── tauri.conf.json       # Tauri v2 配置
│   ├── build.rs              # 构建脚本
│   ├── src/
│   │   └── main.rs           # Rust 入口
│   └── icons/                # 应用图标
├── test/                     # 测试文件
├── package.json              # npm 依赖和脚本
└── tsconfig.json             # TypeScript 配置
```

## 配置

### Tauri 配置 (`src-tauri/tauri.conf.json`)

关键配置项：
- **identifier**: `ai.axiom.desktop`
- **productName**: `Axiom`
- **devUrl**: `http://localhost:4096` - 开发时连接的 URL
- **窗口大小**: 1200x800 (最小 800x600)

### 图标

当前使用 placeholder 图标（蓝色背景 + 白色 "A"）。

生成正式图标：
```bash
# 准备好 icon.png（至少 1024x1024）
bun run tauri:icon path/to/icon.png
```

## 故障排查

### 连接失败

如果桌面应用无法连接到 Axiom 服务器：

1. 确认服务器正在运行：`axiom serve`
2. 检查端口是否是 4096（默认）
3. 查看终端输出的错误信息

### 构建失败

常见问题：
- Rust 工具链未安装或版本过旧
- 缺少系统依赖（macOS 需要 Xcode Command Line Tools）
- 磁盘空间不足

## TypeScript 类型

本包导出以下类型和命名空间：

```typescript
import { DesktopApp, IdeConfig } from '@axiom-ai/desktop';

// 生成 Tauri 配置
const config = DesktopApp.generateFullTauriConfig({
  product: { name: 'My App', version: '1.0.0' }
});
```

## 更多信息

- [Tauri 官方文档](https://v2.tauri.app/)
- [Tauri API 文档](https://v2.tauri.app/reference/javascript/api/)
