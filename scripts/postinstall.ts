#!/usr/bin/env bun

/**
 * postinstall 脚本
 *
 * 功能：验证 JSX 垫片文件存在，如不存在则重新创建
 * 这确保了 npm install 后 TypeScript 能正确解析 React JSX 类型
 */

import { resolve } from 'node:path'

// 定义垫片文件的路径和内容
const shims = [
  {
    path: 'packages/app/src/react/jsx-runtime.d.ts',
    content: `import type * as SolidJSX from 'solid-js'

declare global {
  namespace JSX {
    interface IntrinsicElements extends SolidJSX.JSX.IntrinsicElements {}
  }
}

export * from 'solid-js/jsx-runtime'
`,
  },
  {
    path: 'packages/app/src/tui/jsx.d.ts',
    content: `/// <reference types="solid-js/types/jsx" />
`,
  },
]

/**
 * 确保垫片文件存在
 */
async function ensureShims() {
  const projectRoot = process.cwd()
  let allExist = true

  for (const shim of shims) {
    const fullPath = resolve(projectRoot, shim.path)
    const file = Bun.file(fullPath)
    const exists = await file.exists()

    if (!exists) {
      console.log(`📝 创建垫片文件: ${shim.path}`)
      await Bun.write(fullPath, shim.content)
      allExist = false
    } else {
      console.log(`✅ 垫片文件已存在: ${shim.path}`)
    }
  }

  if (allExist) {
    console.log('✨ 所有 JSX 垫片文件都已就位')
  } else {
    console.log('✨ JSX 垫片文件已重建')
  }
}

// 执行脚本
try {
  await ensureShims()
  process.exit(0)
} catch (error) {
  console.error('❌ postinstall 脚本失败:', error)
  process.exit(1)
}
