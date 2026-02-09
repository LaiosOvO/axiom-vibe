# 浏览器自动化工具

> 变更类型: 新建 | 里程碑: M7 | 优先级: P1

## 动机

让 Agent 能操作浏览器进行 E2E 测试和网页交互。参考 Playwright 的 API，实现 navigate、screenshot、click、type、evaluate、waitForSelector 等工具。

## 范围

- 新建 `packages/core/src/tool/browser.ts`
- 注册到 ToolRegistry

## 影响

- Agent 具备浏览器操作能力
- 可进行 E2E 自动化测试
- Playwright 作为可选 peer dependency
