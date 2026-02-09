# Deep Research + Ref 系统

> 变更类型: 重写 | 里程碑: M7 | 优先级: P0

## 动机

当前 Research namespace 只有格式化函数，没有真正执行搜索和分析。需要实现完整的 Deep Research 引擎：克隆参考项目 → 分析目录结构 → 生成功能参考文档 → 存入 ref/ 文件夹 → 给 plan 阶段使用。

## 范围

- 重写 `packages/core/src/research/index.ts`
- 新增 ref/ 目录管理
- 新增 git clone、文件分析、功能映射

## 影响

- Research namespace 新增 ~10 个函数
- ref/ 目录结构标准化
- 与 SpecEngine 的 plan 阶段集成

## 非目标

- 不实现 Web 搜索（那是 Tool 层的 webfetch）
- 不实现 LLM 分析（由 Agent 调用 LLM）
