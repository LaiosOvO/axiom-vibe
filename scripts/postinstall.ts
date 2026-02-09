#!/usr/bin/env bun

import { resolve } from 'node:path'

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
  {
    path: 'node_modules/react/package.json',
    content: `{
  "name": "react",
  "version": "0.0.0-solid-shim",
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./jsx-runtime": "./jsx-runtime.js",
    "./jsx-dev-runtime": "./jsx-dev-runtime.js"
  }
}
`,
  },
  {
    path: 'node_modules/react/index.js',
    content: 'export * from "solid-js";\n',
  },
  {
    path: 'node_modules/react/jsx-runtime.js',
    content: `import { createComponent } from "solid-js";
export function jsx(type, props) {
  if (typeof type === "function") return createComponent(type, props || {});
  return { type, props: props || {} };
}
export const jsxs = jsx;
export const Fragment = (props) => props.children;
`,
  },
  {
    path: 'node_modules/react/jsx-dev-runtime.js',
    content: `import { createComponent } from "solid-js";
export function jsxDEV(type, props) {
  if (typeof type === "function") return createComponent(type, props || {});
  return { type, props: props || {} };
}
export const Fragment = (props) => props.children;
`,
  },
  {
    path: 'node_modules/react/jsx-runtime.js',
    content: 'export { jsx, jsxs, Fragment } from "solid-js/h/jsx-runtime";\n',
  },
  {
    path: 'node_modules/react/jsx-dev-runtime.js',
    content: 'export { jsxDEV, Fragment } from "solid-js/h/jsx-runtime";\n',
  },
]

async function ensureShims() {
  const projectRoot = process.cwd()
  let rebuilt = 0

  for (const shim of shims) {
    const fullPath = resolve(projectRoot, shim.path)
    const file = Bun.file(fullPath)
    const exists = await file.exists()

    if (!exists) {
      await Bun.write(fullPath, shim.content)
      rebuilt++
    }
  }

  if (rebuilt > 0) {
    console.log(`[postinstall] ${rebuilt} 个 JSX 垫片文件已重建`)
  }
}

try {
  await ensureShims()
  process.exit(0)
} catch (error) {
  console.error('[postinstall] 失败:', error)
  process.exit(1)
}
