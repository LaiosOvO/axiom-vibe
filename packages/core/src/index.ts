#!/usr/bin/env bun
// Axiom - AI 驱动的编码 Agent 平台

export const VERSION = '0.1.0'
export const NAME = 'axiom'

/** CLI 入口 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION)
    process.exit(0)
  }

  if (args.includes('--help') || args.includes('-h') || !command) {
    printHelp()
    process.exit(0)
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
function printHelp() {
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

/** 处理 run 子命令 */
function handleRun(args: string[]) {
  const prompt = args.join(' ')
  if (!prompt) {
    console.error('错误: run 命令需要提供 prompt')
    console.error('用法: axiom run <prompt>')
    process.exit(1)
  }
  // TODO: 实现 headless 模式
  console.log(`[headless] 执行任务: ${prompt}`)
}

/** 处理 serve 子命令 */
function handleServe(_args: string[]) {
  // TODO: 实现 HTTP 服务器
  console.log('[server] Axiom 服务器启动中...')
}

if (import.meta.main) {
  main()
}
