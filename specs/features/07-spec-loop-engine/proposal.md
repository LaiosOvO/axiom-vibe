# Spec 驱动循环引擎

> 变更类型: 重写 | 里程碑: M7 | 优先级: P0

## 动机

当前 SpecEngine 仅包含纯数据处理函数（parseFrontmatter、createSpec 等），缺乏真正的状态机驱动逻辑。需要参考 OpenSpec 框架，实现完整的四阶段循环引擎：Proposal → Definition → Apply → Archive。

## 范围

- 重写 `packages/core/src/spec/index.ts`
- 保留现有函数（向后兼容）
- 新增 OpenSpec 风格的目录结构管理和状态机

## 影响

- SpecEngine namespace 新增 ~15 个函数
- 测试文件需要更新
- 后续所有 Agent 的行为都将基于 spec 驱动

## 非目标

- 不实现 LLM 自动分析需求（那是 Agent 层的职责）
- 不实现 Web UI
