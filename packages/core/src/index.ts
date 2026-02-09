#!/usr/bin/env bun
// Axiom - AI 驱动的编码 Agent 平台

import { Agent } from './agent'
import { AgentRunner } from './agent/runner'
import { Config } from './config'
import { LspClient } from './lsp/client'
import { McpClient } from './mcp/client'
import { Orchestrator } from './orchestrator'
import { Provider } from './provider'
import { ProviderFactory } from './provider/llm'
import { Server } from './server'
import { Session } from './session'
import { LLM } from './session/llm'
import { SessionProcessor } from './session/processor'
import { SystemPrompt } from './session/system'
import { Skill } from './skill'
import { Tool, ToolRegistry } from './tool'

export const VERSION = '0.1.0'
export const NAME = 'axiom'

export {
  Server,
  Session,
  Provider,
  ProviderFactory,
  Agent,
  AgentRunner,
  Config,
  LLM,
  SessionProcessor,
  SystemPrompt,
  Skill,
  Tool,
  ToolRegistry,
  McpClient,
  LspClient,
  Orchestrator,
}

/** CLI 入口 */
export async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION)
    process.exit(0)
  }

  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  // 默认启动 TUI
  if (!command) {
    await handleTui()
    return
  }

  switch (command) {
    case 'run':
      await handleRun(args.slice(1))
      break
    case 'research':
      await handleResearch(args.slice(1))
      break
    case 'orchestrate':
      await handleOrchestrate(args.slice(1))
      break
    case 'serve':
      handleServe(args.slice(1))
      break
    default:
      console.error(`未知命令: ${command}`)
      console.error('运行 axiom --help 查看可用命令')
      process.exit(1)
  }
}

/** 打印帮助信息 */
export function printHelp() {
  console.log(
    `
${NAME} v${VERSION} — AI 驱动的编码 Agent 平台

用法:
  axiom                      启动交互模式
  axiom run <prompt>         Headless 模式 [--agent=build|plan|explore]
  axiom research <url>       Deep Research，克隆并分析参考项目
  axiom orchestrate <plan>   执行编排计划 (JSON 格式)
  axiom serve                启动 HTTP 服务器

选项:
  -v, --version              显示版本号
  -h, --help                 显示帮助信息

示例:
  axiom                      进入交互式 TUI
  axiom run "实现登录功能"   直接执行任务
  axiom orchestrate plan.json 执行编排计划
  axiom serve                启动服务器供客户端连接
`.trim(),
  )
}

/** 处理 TUI 模式 — 启动终端界面 */
export async function handleTui() {
  try {
    const mod = await import('../../app/src/tui/app')
    await mod.tui({
      onExit: async () => {
        console.log('\n再见！')
        process.exit(0)
      },
    })
  } catch (e) {
    console.error('[axiom] TUI 启动失败，请确保 @opentui/solid 已安装')
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}

/** 处理 run 子命令 — headless 模式 */
export async function handleRun(args: string[]) {
  // 解析 --agent 参数
  const agentArg = args.find((a) => a.startsWith('--agent='))
  const agentId = agentArg ? agentArg.split('=')[1] : 'build'
  // 过滤掉 flag 参数，只保留 prompt
  const promptArgs = args.filter((a) => !a.startsWith('--'))

  const prompt = promptArgs.join(' ')
  if (!prompt) {
    console.error('错误: run 命令需要提供 prompt')
    console.error('用法: axiom run <prompt>')
    process.exit(1)
    return
  }

  try {
    const config = Config.load({ projectDir: process.cwd() })

    const { homedir } = await import('node:os')
    const { join } = await import('node:path')
    const dataDir = join(homedir(), '.axiom', 'data')
    const { Storage } = await import('./storage')
    Storage.init(dataDir)

    const modelIdFromEnv = process.env.AXIOM_MODEL
    let modelId: string

    if (modelIdFromEnv) {
      modelId = modelIdFromEnv
    } else {
      const defaultProvider = config.provider.default
      const providerInfo = Provider.get(defaultProvider)
      if (!providerInfo || providerInfo.models.length === 0) {
        throw new Error(`Provider ${defaultProvider} 没有可用模型`)
      }
      modelId = `${defaultProvider}/${providerInfo.models[0]}`
    }

    const [providerId, ...modelParts] = modelId.split('/')
    const modelName = modelParts.join('/')

    if (!providerId || !modelName) {
      throw new Error(`无效的模型 ID 格式: ${modelId}，期望格式: "providerId/modelName"`)
    }

    console.log(`[axiom] 使用模型: ${modelId}`)
    console.log(`[axiom] 使用 Agent: ${agentId}`)

    const model = ProviderFactory.getLanguageModel(providerId, modelName)

    const session = Session.create({ modelId, title: `headless: ${prompt.slice(0, 50)}` })
    console.log(`[axiom] 会话 ${session.id} 已创建`)

    const toolInfos = ToolRegistry.list()
    const tools: Record<
      string,
      {
        description: string
        parameters: unknown
        execute: (args: unknown) => Promise<unknown>
      }
    > = {}

    for (const toolInfo of toolInfos) {
      tools[toolInfo.name] = {
        description: toolInfo.description,
        parameters: toolInfo.parameters,
        execute: toolInfo.execute,
      }
    }

    console.log(`[axiom] 已加载 ${Object.keys(tools).length} 个工具`)

    console.log('[axiom] 正在处理...\n')
    const result = await SessionProcessor.process({
      sessionId: session.id,
      userMessage: prompt,
      model,
      tools,
    })

    console.log('\n[axiom] 响应:')
    console.log(result.assistantMessage.content)
    console.log(
      `\n[axiom] 使用量: ${result.usage.inputTokens} 输入 + ${result.usage.outputTokens} 输出 = ${result.usage.totalTokens} 总计`,
    )
    console.log(`[axiom] 完成原因: ${result.finishReason}`)

    process.exit(0)
  } catch (error) {
    console.error('[axiom] 错误:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/** 处理 serve 子命令 — 启动 HTTP 服务器 */
export function handleServe(args: string[]) {
  const portArg = args.find((a) => a.startsWith('--port='))
  const port = portArg ? Number.parseInt(portArg.split('=')[1] ?? '4096', 10) : 4096

  const app = Server.createApp()
  console.log(`[axiom] 服务器启动于 http://127.0.0.1:${port}`)
  console.log(`[axiom] 可用 Provider: ${Provider.getAvailable().length} 个`)
  console.log(`[axiom] 内置 Agent: ${Agent.list().length} 个`)

  Bun.serve({
    fetch: app.fetch,
    port,
  })
}

/** 处理 research 子命令 — Deep Research */
export async function handleResearch(args: string[]) {
  const url = args.find((a) => !a.startsWith('--'))
  if (!url) {
    console.error('错误: research 命令需要提供 Git 仓库 URL')
    console.error('用法: axiom research <url> [--features=f1,f2,f3] [--name=项目名]')
    process.exit(1)
    return
  }

  const { Research } = await import('./research')

  // 解析参数
  const featuresArg = args.find((a) => a.startsWith('--features='))
  const features = featuresArg ? (featuresArg.split('=')[1]?.split(',').filter(Boolean) ?? []) : []

  const nameArg = args.find((a) => a.startsWith('--name='))
  const name = nameArg ? nameArg.split('=')[1] : undefined

  const projectRoot = process.cwd()
  try {
    console.log(`[axiom] 克隆参考项目: ${url}`)
    const refProject = await Research.cloneProject(projectRoot, url, name)
    console.log(`[axiom] 项目已克隆到: ${refProject.localPath}`)

    const analyzeFeatures =
      features.length > 0 ? features : ['config', 'session', 'tool', 'agent', 'provider']

    console.log(`[axiom] 分析功能模块: ${analyzeFeatures.join(', ')}`)
    const doc = await Research.generateRefDocument(projectRoot, refProject, analyzeFeatures)

    console.log('[axiom] 生成参考文档...')
    const summaryPath = await Research.saveRefDocument(projectRoot, doc)

    console.log('')
    console.log('[axiom] Deep Research 完成!')
    console.log(`  项目: ${refProject.name}`)
    console.log(`  文档: ${summaryPath}`)
    console.log(`  模块: ${doc.modules.length} 个`)
  } catch (error) {
    console.error('[axiom] 错误:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/** 处理 orchestrate 子命令 — 执行编排计划 */
export async function handleOrchestrate(args: string[]) {
  const planFile = args.find((a) => !a.startsWith('--'))
  if (!planFile) {
    console.error('错误: orchestrate 命令需要提供 plan 文件路径')
    console.error('用法: axiom orchestrate <plan.json>')
    process.exit(1)
    return
  }

  try {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')

    // 读取 plan 文件
    const planPath = resolve(planFile)
    const planContent = readFileSync(planPath, 'utf-8')
    const planData = JSON.parse(planContent)

    // 验证 plan 数据结构
    if (!planData.title || !Array.isArray(planData.steps)) {
      throw new Error('无效的 plan 文件格式，需要包含 title 和 steps 字段')
    }

    // 初始化配置和存储
    const config = Config.load({ projectDir: process.cwd() })

    const { homedir } = await import('node:os')
    const { join } = await import('node:path')
    const dataDir = join(homedir(), '.axiom', 'data')
    const { Storage } = await import('./storage')
    Storage.init(dataDir)

    // 获取模型
    const modelIdFromEnv = process.env.AXIOM_MODEL
    let modelId: string

    if (modelIdFromEnv) {
      modelId = modelIdFromEnv
    } else {
      const defaultProvider = config.provider.default
      const providerInfo = Provider.get(defaultProvider)
      if (!providerInfo || providerInfo.models.length === 0) {
        throw new Error(`Provider ${defaultProvider} 没有可用模型`)
      }
      modelId = `${defaultProvider}/${providerInfo.models[0]}`
    }

    const [providerId, ...modelParts] = modelId.split('/')
    const modelName = modelParts.join('/')

    if (!providerId || !modelName) {
      throw new Error(`无效的模型 ID 格式: ${modelId}，期望格式: "providerId/modelName"`)
    }

    console.log(`[axiom] 使用模型: ${modelId}`)
    console.log(`[axiom] 加载计划: ${planData.title}`)

    const model = ProviderFactory.getLanguageModel(providerId, modelName)

    // 创建 plan
    const plan = Orchestrator.createPlan(planData.title, planData.steps)
    console.log(`[axiom] 计划已创建，包含 ${plan.steps.length} 个步骤`)

    // 执行 plan
    console.log('[axiom] 开始执行计划...\n')
    const projectRoot = process.cwd()
    const result = await Orchestrator.executePlan(plan, model, projectRoot)

    // 输出结果摘要
    console.log('\n[axiom] 计划执行完成!')
    console.log(`  计划 ID: ${result.planId}`)
    console.log(
      `  完成步骤: ${result.results.filter((r) => r.success).length}/${result.results.length}`,
    )
    console.log(`  全部完成: ${result.allCompleted ? '是' : '否'}`)
    console.log(
      `  使用量: ${result.totalUsage.inputTokens} 输入 + ${result.totalUsage.outputTokens} 输出 = ${result.totalUsage.totalTokens} 总计`,
    )

    // 输出每个步骤的结果
    console.log('\n[axiom] 步骤结果:')
    for (const stepResult of result.results) {
      const status = stepResult.success ? '✓' : '✗'
      console.log(`  ${status} [${stepResult.agentId}] ${stepResult.stepId}`)
      if (!stepResult.success) {
        console.log(`    错误: ${stepResult.output}`)
      }
    }

    process.exit(result.allCompleted ? 0 : 1)
  } catch (error) {
    console.error('[axiom] 错误:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

if (import.meta.main) {
  main()
}
