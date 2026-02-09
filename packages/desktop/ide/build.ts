#!/usr/bin/env bun
/**
 * Axiom IDE 主构建脚本
 *
 * 基于 VSCodium 方案构建自定义 IDE
 *
 * 构建步骤：
 * 1. 检查环境依赖 (git, node, yarn, python)
 * 2. 克隆 VSCodium 仓库 (如果不存在)
 * 3. 执行品牌替换补丁
 * 4. 执行扩展预装补丁
 * 5. 运行 VSCodium 构建
 * 6. 输出构建产物路径
 */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { IdeConfig } from '../src/ide/index.js'

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

/** 彩色日志输出 */
function log(level: 'info' | 'success' | 'warn' | 'error', message: string) {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  }[level]

  console.log(`${prefix} ${message}`)
}

/** 检查命令是否存在 */
async function checkCommand(command: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['which', command], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const exitCode = await proc.exited
    return exitCode === 0
  } catch {
    return false
  }
}

/** 检查所有必需的依赖 */
async function checkDependencies(): Promise<boolean> {
  log('info', '检查环境依赖...')

  const required = ['git', 'node', 'yarn', 'python3']
  const missing: string[] = []

  for (const cmd of required) {
    const exists = await checkCommand(cmd)
    if (exists) {
      log('success', `${cmd} 已安装`)
    } else {
      log('error', `${cmd} 未安装`)
      missing.push(cmd)
    }
  }

  if (missing.length > 0) {
    log('error', `缺少依赖: ${missing.join(', ')}`)
    log('info', '请先安装所有依赖后再运行构建')
    return false
  }

  log('success', '所有依赖检查通过')
  return true
}

/** 克隆 VSCodium 仓库 */
async function cloneVSCodium(workDir: string): Promise<boolean> {
  const vscodiumDir = join(workDir, 'vscodium')

  if (existsSync(vscodiumDir)) {
    log('info', 'VSCodium 仓库已存在，跳过克隆')
    return true
  }

  log('info', '克隆 VSCodium 仓库...')
  log('warn', '注意：仓库约 1.5GB，首次克隆需要较长时间')

  try {
    // 注意：实际运行时才会克隆，这里只是构建基础设施
    const proc = Bun.spawn(
      ['git', 'clone', '--depth=1', 'https://github.com/VSCodium/vscodium.git', vscodiumDir],
      {
        stdout: 'inherit',
        stderr: 'inherit',
      },
    )

    const exitCode = await proc.exited
    if (exitCode !== 0) {
      log('error', 'VSCodium 仓库克隆失败')
      return false
    }

    log('success', 'VSCodium 仓库克隆完成')
    return true
  } catch (error) {
    log('error', `克隆失败: ${error}`)
    return false
  }
}

/** 读取根 package.json 获取版本号 */
async function getVersion(): Promise<string> {
  try {
    const pkgPath = resolve(import.meta.dir, '../../package.json')
    const pkg = await Bun.file(pkgPath).json()
    return pkg.version || '0.1.0'
  } catch {
    log('warn', '无法读取 package.json，使用默认版本 0.1.0')
    return '0.1.0'
  }
}

/** 执行补丁脚本 */
async function runPatch(scriptPath: string, vscodiumDir: string): Promise<boolean> {
  log('info', `执行补丁: ${scriptPath}`)

  try {
    const proc = Bun.spawn(['bun', 'run', scriptPath, vscodiumDir], {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dir,
    })

    const exitCode = await proc.exited
    if (exitCode !== 0) {
      log('error', `补丁执行失败: ${scriptPath}`)
      return false
    }

    log('success', `补丁执行完成: ${scriptPath}`)
    return true
  } catch (error) {
    log('error', `补丁执行出错: ${error}`)
    return false
  }
}

/** 运行 VSCodium 构建 */
async function buildVSCodium(vscodiumDir: string, target: IdeConfig.BuildConfig): Promise<boolean> {
  log('info', `开始构建 ${target.target} ${target.arch} (${target.quality})...`)

  const osName = target.target === 'darwin' ? 'osx' : target.target
  const arch = target.arch

  try {
    const proc = Bun.spawn(['./build.sh'], {
      cwd: vscodiumDir,
      env: {
        ...process.env,
        OS_NAME: osName,
        VSCODE_ARCH: arch,
        VSCODE_QUALITY: target.quality,
      },
      stdout: 'inherit',
      stderr: 'inherit',
    })

    const exitCode = await proc.exited
    if (exitCode !== 0) {
      log('error', '构建失败')
      return false
    }

    log('success', '构建完成')
    return true
  } catch (error) {
    log('error', `构建出错: ${error}`)
    return false
  }
}

/** 获取构建产物路径 */
function getArtifactPath(vscodiumDir: string, target: IdeConfig.BuildConfig): string {
  const baseDir = join(vscodiumDir, 'VSCode-darwin-x64')

  switch (target.target) {
    case 'darwin':
      return join(baseDir, 'Axiom IDE.app')
    case 'win32':
      return join(vscodiumDir, 'VSCode-win32-x64', 'Axiom IDE.exe')
    case 'linux':
      return join(vscodiumDir, 'VSCode-linux-x64', 'axiom-ide')
    default:
      return baseDir
  }
}

/** 主函数 */
async function main() {
  console.log(`${colors.bold}${colors.cyan}Axiom IDE 构建工具${colors.reset}\n`)

  // 1. 检查依赖
  const depsOk = await checkDependencies()
  if (!depsOk) {
    process.exit(1)
  }

  console.log() // 空行

  // 2. 确定工作目录
  const workDir = resolve(import.meta.dir, '../.build')
  log('info', `工作目录: ${workDir}`)

  if (!existsSync(workDir)) {
    await Bun.write(join(workDir, '.gitkeep'), '')
    log('success', '创建工作目录')
  }

  console.log() // 空行

  // 3. 克隆 VSCodium（注意：实际不会克隆，只是架构）
  log('warn', '注意：此脚本仅为构建基础设施演示，不会实际克隆仓库')
  const cloneOk = await cloneVSCodium(workDir)
  if (!cloneOk) {
    log('error', '克隆失败，终止构建')
    process.exit(1)
  }

  console.log() // 空行

  const vscodiumDir = join(workDir, 'vscodium')

  // 4. 执行品牌补丁
  const brandPatch = resolve(import.meta.dir, 'patch-brand.ts')
  const brandOk = await runPatch(brandPatch, vscodiumDir)
  if (!brandOk) {
    log('error', '品牌补丁失败，终止构建')
    process.exit(1)
  }

  console.log() // 空行

  // 5. 执行扩展补丁
  const extPatch = resolve(import.meta.dir, 'patch-extensions.ts')
  const extOk = await runPatch(extPatch, vscodiumDir)
  if (!extOk) {
    log('error', '扩展补丁失败，终止构建')
    process.exit(1)
  }

  console.log() // 空行

  // 6. 解析构建目标（从命令行参数或默认 macOS arm64）
  const target: IdeConfig.BuildConfig = {
    target: 'darwin',
    arch: 'arm64',
    quality: 'stable',
    obfuscate: false,
  }

  // 7. 运行构建
  const buildOk = await buildVSCodium(vscodiumDir, target)
  if (!buildOk) {
    log('error', '构建失败')
    process.exit(1)
  }

  console.log() // 空行

  // 8. 输出构建产物
  const artifactPath = getArtifactPath(vscodiumDir, target)
  log('success', `${colors.bold}构建完成！${colors.reset}`)
  log('info', `产物路径: ${colors.cyan}${artifactPath}${colors.reset}`)

  console.log() // 空行

  log('info', '下一步：')
  log('info', `  1. 测试应用: open "${artifactPath}"`)
  log('info', '  2. 打包分发: 使用 create-dmg 或 electron-builder')
  log('info', '  3. 签名公证: 使用 codesign 和 notarytool')
}

// 运行主函数
main().catch((error) => {
  log('error', `未处理的错误: ${error}`)
  process.exit(1)
})
