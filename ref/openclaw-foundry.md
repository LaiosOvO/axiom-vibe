# openclaw-foundry — 参考分析

> 分析日期: 2026-02-09

## 基本信息

| 字段 | 值 |
|------|---|
| 项目名 | Foundry (openclaw-foundry) |
| 仓库 | github.com/lekt9/openclaw-foundry |
| 语言 | TypeScript / JavaScript |
| 平台 | OpenClaw (Agent 运行时) |
| 定位 | 自我进化的元扩展——观察工作流 → 学习模式 → 自动生成新能力 |
| 许可 | MIT |
| 口号 | "The forge that forges itself" |

## 功能概述

### 核心理念：自写代码

Foundry 的核心不是"LLM 帮你写代码"，而是"系统自动升级自己"——递归式自我改进。

### 五阶段循环

```
Observe → Research → Learn → Write → Deploy
观察工作流 → 搜索文档 → 学习模式 → 生成代码 → 部署新能力
```

### 关键功能

1. **工作流学习与结晶化** — 追踪 goal → tool序列 → outcome，高频模式（5+次、70%+成功率）自动结晶为专用工具
2. **自写代码生成** — 生成 OpenClaw 扩展（tools + hooks）、API 技能、浏览器自动化技能
3. **自我扩展** — `foundry_extend_self` 可以修改 Foundry 自身代码
4. **Overseer 自动管理** — 定时运行，识别结晶候选、自动生成工具、清理过期模式
5. **沙箱验证** — 在隔离进程中验证生成的代码，阻止危险操作
6. **重启恢复** — 保存上下文、自动恢复对话
7. **Foundry Marketplace** — 通过 x402 Solana USDC 分享/购买能力

### 知识 vs 行为

| 知识（模式） | 行为（自写代码） |
|-------------|----------------|
| 存储为文本 | 固化到系统中 |
| LLM 每次都要读取应用 | 自动运行 |
| 每次调用消耗 token | 零 token 成本 |
| 可能被遗忘或忽略 | 始终执行 |

## 技术栈

- 运行时: Node.js (OpenClaw 平台)
- 扩展格式: OpenClaw plugin (openclaw.plugin.json)
- 技能格式: YAML frontmatter + Markdown
- 沙箱: 隔离 Node 进程 + tsx

## 架构模式

### 工具集

| 分类 | 工具 |
|------|------|
| 研究 | foundry_research, foundry_docs, foundry_learnings |
| 生成 | foundry_implement, foundry_write_extension, foundry_write_skill, foundry_write_hook |
| 管理 | foundry_list, foundry_restart, foundry_extend_self |
| 市场 | foundry_publish_ability, foundry_marketplace |

### 数据存储

```
~/.openclaw/foundry/
├── workflows.json           — 记录的工作流
├── workflow-patterns.json   — 结晶化候选
├── learnings.json           — 模式、洞察、结果
~/.openclaw/extensions/      — 生成的扩展
~/.openclaw/skills/          — 生成的技能
```

### 沙箱安全

- **阻止**：child_process/exec/spawn、eval/new Function、SSH/AWS 凭据访问、外泄域名
- **标记**：process.env、文件系统访问、Base64 编码
- **运行时验证**：临时目录 → 隔离进程 → 模拟 API → 导入测试 → 通过才部署

## 学术基础

Foundry 的设计参考了多篇自我改进 Agent 论文：

- **Self-Improving Coding Agent** (Robeyns et al., 2025) — 17-53% 性能提升
- **SelfEvolve** (Jiang et al., 2023) — 两步管道：知识生成 + 自我反思
- **ADAS** (Hu et al., 2024) — 基于存档的元 Agent 进化搜索
- **HexMachina** (Liu et al., 2025) — 以工件为中心的持续学习

## 对 Axiom 的启示

### 核心借鉴（Axiom 的 self-growth 直接参考）

1. **工作流追踪** — 记录 goal → 工具链 → 结果，这是 Axiom self-growth 的核心数据源
2. **模式结晶化** — 高频成功模式自动固化为工具/技能，减少 token 消耗
3. **Observe → Learn → Write 循环** — Axiom 的自我成长应该实现类似的递归自改进
4. **沙箱验证** — 自动生成的代码必须在沙箱中验证才能部署
5. **知识 vs 行为的区分** — 模式（可遗忘）→ 代码（始终执行）的晋升机制

### 可改进

1. **OpenClaw 生态太小** — 不如 OpenCode 生态成熟，Axiom 应基于更成熟的平台
2. **Marketplace 复杂** — x402 Solana 支付太复杂，Axiom 先做本地自我成长
3. **缺少 Spec 驱动** — 不关注需求管理，只关注工作流优化
4. **学术化倾向** — 实际落地效果存疑，Axiom 应更注重实用性
