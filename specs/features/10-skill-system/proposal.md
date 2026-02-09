# Skill 系统

> 变更类型: 新建 | 里程碑: M7 | 优先级: P1

## 动机

参考 opencode 的 SKILL.md 扫描机制，为 Axiom 实现 skill 系统。Skill 是可复用的知识模块，通过 SKILL.md 文件定义，可以被 Agent 在对话中引用。

## 范围

- 新建 `packages/core/src/skill/index.ts`
- SKILL.md 文件扫描和解析
- Skill 注册表

## 影响

- Agent 系统可以引用 skill
- System prompt 中包含 skill 列表
- 用户可以自定义 skill
