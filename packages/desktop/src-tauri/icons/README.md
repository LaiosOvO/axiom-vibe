# Axiom Desktop 图标

这些是 placeholder 图标文件。在正式发布前需要替换为实际设计的图标。

## 所需图标文件

- `32x32.png` - macOS 小图标
- `128x128.png` - macOS 标准图标
- `128x128@2x.png` - macOS Retina 图标
- `icon.icns` - macOS 应用图标包（多分辨率）
- `icon.ico` - Windows 应用图标
- `icon.svg` - 源 SVG 文件（用于生成其他格式）

## 生成图标

可以使用以下工具从 SVG 生成所需的图标格式：

```bash
# 使用 ImageMagick 转换
convert icon.svg -resize 32x32 32x32.png
convert icon.svg -resize 128x128 128x128.png
convert icon.svg -resize 256x256 128x128@2x.png

# 生成 macOS .icns
# 需要使用 png2icns 或其他工具
```

当前 SVG 是简单的蓝色背景 + 白色 "A" 字母作为 placeholder。
