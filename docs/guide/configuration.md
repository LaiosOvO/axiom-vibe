# 配置详解

## 配置文件

| 位置 | 作用域 | 优先级 |
|------|--------|--------|
| 内置默认值 | 全局 | 最低 |
| `~/.config/axiom/config.yaml` | 用户全局 | 中 |
| `.axiom.yaml`（项目根目录） | 项目级 | 最高 |

优先级规则：项目配置 > 全局配置 > 默认值。

## Provider 配置

Axiom 内置 15 个 LLM Provider：

| Provider | 环境变量 | 模型示例 |
|----------|----------|----------|
| Anthropic | `ANTHROPIC_API_KEY` | claude-3-5-sonnet, claude-3-opus |
| OpenAI | `OPENAI_API_KEY` | gpt-4o, gpt-4o-mini |
| Google AI | `GOOGLE_API_KEY` | gemini-2.0-flash, gemini-1.5-pro |
| Groq | `GROQ_API_KEY` | llama-3.3-70b-versatile |
| Together AI | `TOGETHER_API_KEY` | Meta-Llama-3.1-70B |
| Fireworks AI | `FIREWORKS_API_KEY` | llama-v3p1-70b-instruct |
| Mistral AI | `MISTRAL_API_KEY` | mistral-large-latest |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat, deepseek-coder |
| OpenRouter | `OPENROUTER_API_KEY` | 支持多 Provider 路由 |
| Ollama | 无需（本地） | llama3.1, qwen2.5, deepseek-r1 |
| LM Studio | 无需（本地） | local-model |
| Cohere | `COHERE_API_KEY` | command-r-plus |
| Perplexity | `PERPLEXITY_API_KEY` | llama-3.1-sonar-large |
| AWS Bedrock | `AWS_ACCESS_KEY_ID` | anthropic.claude-3-5-sonnet |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` | gpt-4o |

## Agent 配置

内置 6 个 Agent：

| Agent | 用途 | 默认工具 |
|-------|------|----------|
| coder | 主编码 Agent，通用编码任务 | read, write, bash |
| architect | 架构设计和代码审查 | read, bash |
| explorer | 代码搜索和分析 | read, bash |
| writer | 文档和注释编写 | read, write |
| reviewer | 代码审查和质量检查 | read, bash |
| planner | 任务规划和需求分析 | read |

默认模型均为 `claude-3-5-sonnet-20241022`，可通过配置文件覆盖。

## MCP Server 配置

支持两种连接方式：

### 本地 stdio

```yaml
mcp:
  my-tool:
    type: local
    command: ["npx", "-y", "@my/mcp-server"]
    environment:
      API_KEY: "..."
    timeout: 30000
```

### 远程 HTTP

```yaml
mcp:
  remote-tool:
    type: remote
    url: "https://mcp.example.com/sse"
    headers:
      Authorization: "Bearer ..."
    timeout: 30000
```

## LSP Server 配置

内置 5 个语言服务器：

| 语言 | 命令 | 文件扩展名 |
|------|------|-----------|
| TypeScript | typescript-language-server --stdio | .ts, .tsx, .js, .jsx |
| Python | pylsp | .py |
| Go | gopls | .go |
| Rust | rust-analyzer | .rs |
| JSON | vscode-json-language-server --stdio | .json |

语言服务器按需启动，打开对应文件时自动连接。
