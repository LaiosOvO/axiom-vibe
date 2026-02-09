# Axiom IDE 构建系统

基于 VSCodium 方案构建的自定义 IDE，预装 Axiom AI 编码扩展。

## 概述

Axiom IDE 通过 fork VSCode（使用 VSCodium 工具链）实现品牌定制，并预装 Axiom VSCode 扩展，为用户提供开箱即用的 AI 编码体验。

### 技术方案

- **基础**: VSCodium（开源 VSCode 发行版工具链）
- **品牌**: 完全替换为 Axiom IDE 品牌
- **扩展**: 预装并默认启用 Axiom VSCode 扩展
- **扩展商店**: 使用 Open VSX（开源扩展市场）

### 支持平台

| 平台    | 架构          | 状态 |
| ------- | ------------- | ---- |
| macOS   | arm64 (M系列) | ✅   |
| macOS   | x64 (Intel)   | ✅   |
| Linux   | x64           | ✅   |
| Linux   | arm64         | ✅   |
| Windows | x64           | 🚧   |
| Windows | arm64         | 🚧   |

## 环境要求

### 必需依赖

1. **Bun** (>= 1.0.0) - 运行时和包管理器
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Git** - 版本控制
   ```bash
   # macOS
   xcode-select --install
   
   # Linux
   sudo apt-get install git
   ```

3. **Node.js** (>= 18.0.0) - 运行时
   ```bash
   # 推荐使用 nvm
   nvm install 20
   ```

4. **Yarn** (>= 1.22.0) - VSCodium 构建需要
   ```bash
   npm install -g yarn
   ```

5. **Python 3** (>= 3.9) - node-gyp 需要
   ```bash
   # macOS
   brew install python3
   
   # Linux
   sudo apt-get install python3
   ```

### 平台特定依赖

#### macOS

```bash
# Xcode Command Line Tools
xcode-select --install

# 可选：用于签名和公证
# Apple Developer 账号 + 证书
```

#### Linux

```bash
# Debian/Ubuntu
sudo apt-get install -y \
  build-essential \
  libx11-dev \
  libxkbfile-dev \
  libsecret-1-dev \
  fakeroot \
  rpm

# Fedora/RHEL
sudo dnf install -y \
  @development-tools \
  libX11-devel \
  libxkbfile-devel \
  libsecret-devel
```

## 构建步骤

### 1. 安装依赖

```bash
# 在项目根目录
bun install

# 进入 desktop 包
cd packages/desktop
bun install
```

### 2. 构建 Axiom VSCode 扩展

```bash
cd packages/vscode
bun install
bun run build
```

### 3. 运行完整构建

```bash
cd packages/desktop
bun run ide:build
```

这将执行以下步骤：

1. ✓ 检查环境依赖
2. ✓ 克隆 VSCodium 仓库（首次运行，~1.5GB）
3. ✓ 应用品牌补丁（替换图标、名称等）
4. ✓ 应用扩展补丁（预装 Axiom 扩展）
5. ✓ 运行构建（编译 TypeScript、打包等）
6. ✓ 输出构建产物路径

### 4. 单独运行补丁（可选）

```bash
# 只运行补丁，不构建
bun run ide:patch
```

## 构建产物

构建完成后，产物位于 `packages/desktop/.build/vscodium/VSCode-{platform}-{arch}/`

### macOS

```
VSCode-darwin-arm64/
└── Axiom IDE.app/
    ├── Contents/
    │   ├── MacOS/
    │   │   └── Axiom IDE
    │   ├── Resources/
    │   └── ...
```

**运行**:
```bash
open "packages/desktop/.build/vscodium/VSCode-darwin-arm64/Axiom IDE.app"
```

### Linux

```
VSCode-linux-x64/
├── axiom-ide
├── resources/
└── ...
```

**运行**:
```bash
./packages/desktop/.build/vscodium/VSCode-linux-x64/axiom-ide
```

## 打包分发

### macOS

#### 方法 1: DMG 磁盘镜像

```bash
# 安装 create-dmg
brew install create-dmg

# 创建 DMG
create-dmg \
  --volname "Axiom IDE" \
  --volicon "assets/icons/icon.icns" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "Axiom IDE.app" 175 120 \
  --hide-extension "Axiom IDE.app" \
  --app-drop-link 425 120 \
  "Axiom-IDE-0.1.0.dmg" \
  "packages/desktop/.build/vscodium/VSCode-darwin-arm64/"
```

#### 方法 2: ZIP 压缩包

```bash
cd packages/desktop/.build/vscodium/VSCode-darwin-arm64
zip -r "Axiom-IDE-0.1.0-macos-arm64.zip" "Axiom IDE.app"
```

### Linux

#### 方法 1: AppImage

```bash
# VSCodium 构建会自动生成 AppImage
# 位于 .build/vscodium/out/
```

#### 方法 2: .deb 包

```bash
# VSCodium 构建会自动生成 .deb
# 位于 .build/vscodium/out/
```

#### 方法 3: tar.gz

```bash
cd packages/desktop/.build/vscodium
tar -czf "axiom-ide-0.1.0-linux-x64.tar.gz" VSCode-linux-x64/
```

## 代码签名和公证

### macOS

```bash
# 1. 签名应用
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  "Axiom IDE.app"

# 2. 创建 DMG
create-dmg ... # 见上文

# 3. 签名 DMG
codesign --sign "Developer ID Application: Your Name (TEAM_ID)" \
  "Axiom-IDE-0.1.0.dmg"

# 4. 公证
xcrun notarytool submit "Axiom-IDE-0.1.0.dmg" \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --password "app-specific-password" \
  --wait

# 5. 钉合票据
xcrun stapler staple "Axiom-IDE-0.1.0.dmg"
```

## CI/CD 自动构建

使用 GitHub Actions 自动构建：

```bash
# 复制 CI 配置到项目根目录
cp packages/desktop/ide/github-actions.yml .github/workflows/build-ide.yml

# 推送 tag 触发构建
git tag ide-v0.1.0
git push origin ide-v0.1.0
```

构建产物将自动发布到 GitHub Releases。

## 自定义品牌

### 修改配置

编辑 `packages/desktop/ide/product.json`:

```json
{
  "nameShort": "Your IDE",
  "nameLong": "Your IDE - Description",
  "applicationName": "your-ide",
  "dataFolderName": ".your-ide",
  ...
}
```

### 替换图标

准备以下尺寸的图标：

- macOS: `icon.icns` (1024x1024)
- Linux: `icon.png` (512x512)
- Windows: `icon.ico` (256x256)

放置在 `packages/desktop/assets/icons/` 目录。

### 修改窗口标题

编辑 `patch-brand.ts` 中的 `patchBrandStrings` 函数。

## 常见问题

### Q: 构建失败，提示缺少依赖

A: 确保已安装所有必需依赖，运行 `bun run ide:build` 会自动检查。

### Q: 首次构建很慢

A: VSCodium 仓库约 1.5GB，首次克隆需要较长时间。后续构建会复用已克隆的仓库。

### Q: 如何更新 VSCode 版本

A: 删除 `.build/vscodium` 目录，重新运行构建会克隆最新版本。

### Q: 扩展未预装成功

A: 确保先构建 VSCode 扩展：`cd packages/vscode && bun run build`

### Q: macOS 提示"应用已损坏"

A: 未签名的应用需要右键打开，或运行：
```bash
xattr -cr "Axiom IDE.app"
```

### Q: Linux 提示缺少共享库

A: 安装缺少的库：
```bash
# 查看缺少的库
ldd axiom-ide

# 安装（示例）
sudo apt-get install libxkbfile1 libsecret-1-0
```

## 贡献

欢迎贡献代码和反馈问题！

## 许可证

MIT License

## 相关资源

- [VSCodium 官方仓库](https://github.com/VSCodium/vscodium)
- [VSCode 官方文档](https://code.visualstudio.com/docs)
- [Open VSX 扩展市场](https://open-vsx.org/)
- [Axiom VSCode 扩展](../vscode/)
