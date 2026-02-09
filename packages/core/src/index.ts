#!/usr/bin/env bun
// Axiom - AI 驱动的编码 Agent 平台

import { Agent } from './agent'
import { Config } from './config'
import { Provider } from './provider'
import { ProviderFactory } from './provider/llm'
import { Server } from './server'
import { Session } from './session'
import { LLM } from './session/llm'
import { SessionProcessor } from './session/processor'

export const VERSION = '0.1.0'
export const NAME = 'axiom'

// 导出所有模块供外部使用
export { Server, Session, Provider, ProviderFactory, Agent, Config, LLM, SessionProcessor }

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
      handleRun(args.slice(1))
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
  axiom                 启动交互模式
  axiom run <prompt>    Headless 模式，执行指定任务
  axiom serve           启动 HTTP 服务器

选项:
  -v, --version         显示版本号
  -h, --help            显示帮助信息

示例:
  axiom                 进入交互式 TUI
  axiom run "实现登录功能"  直接执行任务
  axiom serve           启动服务器供客户端连接
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
export function handleRun(args: string[]) {
  const prompt = args.join(' ')
  if (!prompt) {
    console.error('错误: run 命令需要提供 prompt')
    console.error('用法: axiom run <prompt>')
    process.exit(1)
  }

  const modelId = process.env.AXIOM_MODEL ?? 'claude-3-5-sonnet-20241022'
  const session = Session.create({ modelId, title: `headless: ${prompt.slice(0, 50)}` })
  Session.addMessage(session.id, { role: 'user', content: prompt })

  console.log(`[axiom] 会话 ${session.id} 已创建`)
  console.log(`[axiom] 模型: ${modelId}`)
  console.log(`[axiom] Prompt: ${prompt}`)
  // TODO: 接入 AiAdapter 调用真正的 AI
  console.log('[axiom] AI 调用待接入 — 当前仅创建会话和消息')
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

if (import.meta.main) {
  main()
}
