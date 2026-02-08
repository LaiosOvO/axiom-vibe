# SPEC-05: Session Prompt Loop — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 定义 Message Zod Schema
- [ ] 定义 Session.Info Zod Schema
- [ ] 实现 Session.create
- [ ] 实现 Session.get / list / remove / reset
- [ ] 实现 Session.addMessage
- [ ] 实现 SessionPrompt.send 骨架（不含真实 LLM）

## 测试任务

- 创建和获取会话
- 列出所有会话
- 添加消息到会话
- 删除会话
- Message schema 验证

## 验收标准

- Session CRUD 和消息管理实现完成
- 所有单元测试通过
- typecheck 通过
