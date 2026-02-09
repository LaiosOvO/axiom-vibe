# 快速开始

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Bun | >= 1.0 | 运行时（必须） |
| Node.js | >= 18 | 可选，部分工具链依赖 |
| Git | >= 2.0 | 版本管理 |

## 安装

```bash
# 全局安装
bun install -g @axiom-ai/cli

# 或直接运行（无需安装）
bunx axiom
```

## 配置 API Key

Axiom 通过环境变量读取 API Key。至少配置一个 Provider：

```bash
# Anthropic（推荐）
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI
export OPENAI_API_KEY="sk-..."

# Google AI
export GOOGLE_API_KEY="..."

# DeepSeek
export DEEPSEEK_API_KEY="..."
```

也可以写入 `~/.bashrc` 或 `~/.zshrc` 中永久生效。

## 首次运行

```bash
# 进入你的项目目录
cd your-project

# 启动交互模式
axiom

# 查看版本
axiom --version

# 查看帮助
axiom --help
```

## 验证安装

```bash
# 启动服务器
axiom serve

# 另一个终端，检查健康状态
curl http://127.0.0.1:4096/health
# 返回: {"status":"ok"}
```

## 下一步

- 了解 [配置详解](configuration.md) 自定义 Provider 和 Agent
- 查看 [使用方法](usage.md) 掌握各种运行模式
