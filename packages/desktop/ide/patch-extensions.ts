#!/usr/bin/env bun
/**
 * Axiom IDE 扩展预装补丁脚本
 *
 * 功能：
 * - 将 packages/vscode/ 构建产物复制到内置扩展目录
 * - 配置默认启用 Axiom 扩展
 * - 添加扩展到推荐列表
 */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
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

/** 获取 Axiom VSCode 扩展路径 */
function getAxiomExtensionPath(): string {
  return resolve(import.meta.dir, '../../vscode')
}

/** 检查扩展是否已构建 */
async function checkExtensionBuilt(extensionPath: string): Promise<boolean> {
  const packageJsonPath = join(extensionPath, 'package.json')

  if (!existsSync(packageJsonPath)) {
    log('error', `扩展目录不存在: ${extensionPath}`)
    return false
  }

  // 检查是否有构建产物（通常是 out/ 或 dist/ 目录）
  const outDir = join(extensionPath, 'out')
  const distDir = join(extensionPath, 'dist')

  if (!existsSync(outDir) && !existsSync(distDir)) {
    log('warn', '扩展未构建，需要先运行 `bun run build`')
    return false
  }

  return true
}

/** 读取扩展 package.json */
async function readExtensionPackageJson(
  extensionPath: string,
): Promise<{ name: string; publisher: string; version: string }> {
  const packageJsonPath = join(extensionPath, 'package.json')

  try {
    const pkg = await Bun.file(packageJsonPath).json()
    return {
      name: pkg.name || 'axiom-vscode',
      publisher: pkg.publisher || 'axiom',
      version: pkg.version || '0.1.0',
    }
  } catch (error) {
    log('error', `无法读取扩展 package.json: ${error}`)
    throw error
  }
}

/** 复制扩展到 VSCodium 内置扩展目录 */
async function copyExtension(
  extensionPath: string,
  vscodiumDir: string,
  extensionInfo: { name: string; publisher: string; version?: string },
): Promise<boolean> {
  const targetDir = join(
    vscodiumDir,
    'extensions',
    `${extensionInfo.publisher}.${extensionInfo.name}-${extensionInfo.version}`,
  )

  log('info', `复制扩展: ${extensionPath} -> ${targetDir}`)

  try {
    // 使用 cp -r 递归复制
    const proc = Bun.spawn(['cp', '-r', extensionPath, targetDir], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      log('error', `复制失败: ${stderr}`)
      return false
    }

    log('success', `扩展已复制到: ${targetDir}`)
    return true
  } catch (error) {
    log('error', `复制扩展失败: ${error}`)
    return false
  }
}

/** 配置默认启用扩展 */
async function configureDefaultExtensions(
  vscodiumDir: string,
  extensionInfo: { name: string; publisher: string; version?: string },
): Promise<boolean> {
  const extensionId = `${extensionInfo.publisher}.${extensionInfo.name}`

  // 修改默认设置文件
  const settingsPath = join(vscodiumDir, 'resources', 'app', 'product.json')

  if (!existsSync(settingsPath)) {
    log('warn', `设置文件不存在: ${settingsPath}`)
    return true // 不算失败
  }

  try {
    const product = await Bun.file(settingsPath).json()

    // 添加到默认启用的扩展列表
    if (!product.extensionEnabledApiProposals) {
      product.extensionEnabledApiProposals = {}
    }

    product.extensionEnabledApiProposals[extensionId] = [
      'resolvers',
      'fileSearchProvider',
      'textSearchProvider',
    ]

    // 添加到内置扩展列表
    if (!product.builtInExtensions) {
      product.builtInExtensions = []
    }

    const alreadyExists = product.builtInExtensions.some(
      (ext: { name: string }) => ext.name === extensionId,
    )

    if (!alreadyExists) {
      product.builtInExtensions.push({
        name: extensionId,
        version: extensionInfo.version || '0.1.0',
        repo: 'https://github.com/LaiosOvO/axiom-vibe',
      })
    }

    // 写回配置
    await Bun.write(settingsPath, JSON.stringify(product, null, 2))

    log('success', `已配置默认启用扩展: ${extensionId}`)
    return true
  } catch (error) {
    log('error', `配置默认扩展失败: ${error}`)
    return false
  }
}

/** 添加扩展到推荐列表 */
async function addToRecommendations(
  vscodiumDir: string,
  extensionInfo: { name: string; publisher: string },
): Promise<boolean> {
  const extensionId = `${extensionInfo.publisher}.${extensionInfo.name}`

  // 创建 .vscode/extensions.json
  const vscodeDir = join(vscodiumDir, '.vscode')
  const extensionsJsonPath = join(vscodeDir, 'extensions.json')

  try {
    // 确保目录存在
    if (!existsSync(vscodeDir)) {
      await Bun.write(join(vscodeDir, '.gitkeep'), '')
    }

    // 读取或创建 extensions.json
    let extensionsJson: { recommendations?: string[] } = {
      recommendations: [],
    }

    if (existsSync(extensionsJsonPath)) {
      extensionsJson = await Bun.file(extensionsJsonPath).json()
    }

    if (!extensionsJson.recommendations) {
      extensionsJson.recommendations = []
    }

    // 添加到推荐列表
    if (!extensionsJson.recommendations.includes(extensionId)) {
      extensionsJson.recommendations.push(extensionId)
    }

    // 写回配置
    await Bun.write(extensionsJsonPath, JSON.stringify(extensionsJson, null, 2))

    log('success', `已添加到推荐扩展: ${extensionId}`)
    return true
  } catch (error) {
    log('error', `添加推荐扩展失败: ${error}`)
    return false
  }
}

/** 主函数 */
async function main() {
  console.log(`${colors.blue}━━━ Axiom IDE 扩展补丁 ━━━${colors.reset}\n`)

  // 从命令行参数获取 VSCodium 目录
  const vscodiumDir = process.argv[2]
  if (!vscodiumDir) {
    log('error', '用法: bun run patch-extensions.ts <vscodium-dir>')
    process.exit(1)
  }

  if (!existsSync(vscodiumDir)) {
    log('error', `VSCodium 目录不存在: ${vscodiumDir}`)
    process.exit(1)
  }

  log('info', `目标目录: ${vscodiumDir}`)
  console.log() // 空行

  // 1. 获取扩展路径
  const extensionPath = getAxiomExtensionPath()
  log('info', `扩展路径: ${extensionPath}`)

  // 2. 检查扩展是否已构建
  const isBuilt = await checkExtensionBuilt(extensionPath)
  if (!isBuilt) {
    log('error', '扩展未构建，请先运行 `bun run build`')
    process.exit(1)
  }
  log('success', '扩展已构建')
  console.log() // 空行

  // 3. 读取扩展信息
  log('info', '读取扩展信息...')
  const extensionInfo = await readExtensionPackageJson(extensionPath)
  log('success', `扩展: ${extensionInfo.publisher}.${extensionInfo.name}@${extensionInfo.version}`)
  console.log() // 空行

  // 4. 复制扩展
  log('info', '复制扩展到内置扩展目录...')
  const copyOk = await copyExtension(extensionPath, vscodiumDir, extensionInfo)
  if (!copyOk) {
    log('error', '扩展复制失败')
    process.exit(1)
  }
  console.log() // 空行

  // 5. 配置默认启用
  log('info', '配置默认启用扩展...')
  const configOk = await configureDefaultExtensions(vscodiumDir, extensionInfo)
  if (!configOk) {
    log('warn', '配置默认扩展失败（非致命错误）')
  }
  console.log() // 空行

  // 6. 添加到推荐列表
  log('info', '添加到推荐扩展列表...')
  const recommendOk = await addToRecommendations(vscodiumDir, extensionInfo)
  if (!recommendOk) {
    log('warn', '添加推荐扩展失败（非致命错误）')
  }
  console.log() // 空行

  log('success', '✨ 扩展补丁应用成功！')
}

// 运行主函数
main().catch((error) => {
  log('error', `未处理的错误: ${error}`)
  process.exit(1)
})
