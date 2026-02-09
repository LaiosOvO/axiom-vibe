# Agent 行为规范 + Permission 系统

> 变更类型: 重写+新建 | 里程碑: M7 | 优先级: P0

## 动机

当前 Agent 系统是简单的注册表，没有权限控制和行为规范。需要参考 opencode 的 permission-based agent 模式，实现：
- Agent 模式 (primary/subagent/hidden)
- Permission ruleset ("last match wins")
- Doom loop 检测
- System prompt 模板加载

## 范围

- 重写 `packages/core/src/agent/index.ts`
- 新建 `packages/core/src/permission/index.ts`

## 影响

- Agent 定义增加 mode, permissions, systemPromptFile 字段
- Permission 系统控制工具调用权限
- 安全性大幅提升
