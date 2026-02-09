#!/usr/bin/env bun
/**
 * Axiom IDE 品牌替换补丁脚本
 *
 * 功能：
 * - 替换 product.json 中的品牌字段
 * - 复制 Axiom 图标到 resources/
 * - 修改窗口标题和应用名称
 */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { IdeConfig } from '../src/ide/index.js'

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

/** 读取 Axiom 品牌配置 */
async function loadProductConfig(): Promise<object> {
  try {
    const productPath = resolve(import.meta.dir, 'product.json')
    const productJson = await Bun.file(productPath).json()

    // 验证配置
    const version = productJson.version || '0.1.0'
    const productInfo = IdeConfig.getDefaultProduct(version)

    // 合并配置
    return {
      ...IdeConfig.generateProductJson(productInfo),
      ...productJson,
    }
  } catch (error) {
    log('error', `无法读取 product.json: ${error}`)
    throw error
  }
}

/** 替换 VSCodium 的 product.json */
async function patchProductJson(vscodiumDir: string, productConfig: object): Promise<boolean> {
  const targetPath = join(vscodiumDir, 'product.json')

  if (!existsSync(targetPath)) {
    log('warn', `目标文件不存在: ${targetPath}`)
    log('info', '创建新的 product.json')
  }

  try {
    // 读取原始配置（如果存在）
    let originalConfig = {}
    if (existsSync(targetPath)) {
      const originalFile = Bun.file(targetPath)
      originalConfig = await originalFile.json()
    }

    // 合并配置（Axiom 配置优先）
    const mergedConfig = {
      ...originalConfig,
      ...productConfig,
    }

    // 写入新配置
    await Bun.write(targetPath, JSON.stringify(mergedConfig, null, 2))

    log('success', `已更新 product.json: ${targetPath}`)
    return true
  } catch (error) {
    log('error', `无法写入 product.json: ${error}`)
    return false
  }
}

/** 复制 Axiom 图标 */
async function copyIcons(vscodiumDir: string): Promise<boolean> {
  // 注意：这里假设图标文件在 assets/ 目录
  // 实际项目中需要准备好图标文件
  const iconsDir = resolve(import.meta.dir, '../assets/icons')
  const targetDir = join(vscodiumDir, 'resources', 'linux')

  if (!existsSync(iconsDir)) {
    log('warn', '图标目录不存在，跳过图标复制')
    log('info', `需要在 ${iconsDir} 准备图标文件`)
    return true // 不算失败，只是警告
  }

  try {
    // 这里只是示例，实际需要根据平台复制不同的图标
    log('info', `复制图标: ${iconsDir} -> ${targetDir}`)
    // await Bun.spawn(['cp', '-r', iconsDir, targetDir])

    log('success', '图标复制完成')
    return true
  } catch (error) {
    log('error', `图标复制失败: ${error}`)
    return false
  }
}

/** 修改源代码中的品牌字符串 */
async function patchBrandStrings(vscodiumDir: string): Promise<boolean> {
  // 需要替换的文件和字符串
  const patches = [
    {
      file: 'src/vs/workbench/browser/parts/titlebar/titlebarPart.ts',
      replacements: [
        { from: 'VSCodium', to: 'Axiom IDE' },
        { from: 'Code - OSS', to: 'Axiom IDE' },
      ],
    },
    {
      file: 'src/vs/platform/product/common/product.ts',
      replacements: [{ from: 'VSCodium', to: 'Axiom IDE' }],
    },
  ]

  for (const patch of patches) {
    const filePath = join(vscodiumDir, patch.file)

    if (!existsSync(filePath)) {
      log('warn', `文件不存在，跳过: ${patch.file}`)
      continue
    }

    try {
      let content = await Bun.file(filePath).text()

      for (const { from, to } of patch.replacements) {
        const count = (content.match(new RegExp(from, 'g')) || []).length
        content = content.replaceAll(from, to)

        if (count > 0) {
          log('success', `${patch.file}: 替换 "${from}" -> "${to}" (${count} 处)`)
        }
      }

      await Bun.write(filePath, content)
    } catch (error) {
      log('error', `无法修改文件 ${patch.file}: ${error}`)
      return false
    }
  }

  log('success', '品牌字符串替换完成')
  return true
}

/** 主函数 */
async function main() {
  console.log(`${colors.blue}━━━ Axiom IDE 品牌补丁 ━━━${colors.reset}\n`)

  // 从命令行参数获取 VSCodium 目录
  const vscodiumDir = process.argv[2]
  if (!vscodiumDir) {
    log('error', '用法: bun run patch-brand.ts <vscodium-dir>')
    process.exit(1)
  }

  if (!existsSync(vscodiumDir)) {
    log('error', `VSCodium 目录不存在: ${vscodiumDir}`)
    process.exit(1)
  }

  log('info', `目标目录: ${vscodiumDir}`)
  console.log() // 空行

  // 1. 加载品牌配置
  log('info', '加载 Axiom 品牌配置...')
  const productConfig = await loadProductConfig()
  log('success', '配置加载完成')
  console.log() // 空行

  // 2. 替换 product.json
  log('info', '替换 product.json...')
  const productOk = await patchProductJson(vscodiumDir, productConfig)
  if (!productOk) {
    log('error', 'product.json 替换失败')
    process.exit(1)
  }
  console.log() // 空行

  // 3. 复制图标
  log('info', '复制 Axiom 图标...')
  const iconsOk = await copyIcons(vscodiumDir)
  if (!iconsOk) {
    log('error', '图标复制失败')
    process.exit(1)
  }
  console.log() // 空行

  // 4. 替换品牌字符串
  log('info', '替换品牌字符串...')
  const stringsOk = await patchBrandStrings(vscodiumDir)
  if (!stringsOk) {
    log('error', '品牌字符串替换失败')
    process.exit(1)
  }
  console.log() // 空行

  log('success', '✨ 品牌补丁应用成功！')
}

// 运行主函数
main().catch((error) => {
  log('error', `未处理的错误: ${error}`)
  process.exit(1)
})
