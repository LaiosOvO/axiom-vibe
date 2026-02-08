# SPEC-F04: 自我成长（轻量级）

> 里程碑: M2 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: M1

## 目标

实现轻量级的自我成长机制：记录用户的常用模式和偏好，积累为 skill/prompt 文件，用户可选择是否采纳进化。

## 需求

### R1: 模式记录（LearningEngine）

```typescript
export namespace Growth {
  export interface PatternEntry {
    id: string;
    type: 'preference' | 'workflow' | 'tool_pattern' | 'coding_style';
    description: string;
    occurrences: number;
    confidence: number;  // 0-1
    context: string;
    firstSeen: string;
    lastSeen: string;
    adoptedAsSkill?: string;  // skill 文件路径
  }

  export function recordPattern(pattern: Omit<PatternEntry, 'id' | 'firstSeen' | 'lastSeen'>): string;
  export function getPatterns(filter?: { type?: string; minConfidence?: number }): PatternEntry[];
  export function suggestEvolutions(): EvolutionSuggestion[];
}
```

### R2: 进化建议

当模式满足条件时（出现 3+ 次，置信度 > 0.7），生成进化建议：

```typescript
export interface EvolutionSuggestion {
  patternId: string;
  type: 'new_skill' | 'update_prompt' | 'new_shortcut';
  title: string;
  description: string;
  preview: string;  // 预览生成的 skill/prompt 内容
  confidence: number;
}
```

### R3: 用户确认流程

```
检测到模式 → 生成进化建议 → 展示给用户:

  ╭─────────────────────────────────────────────╮
  │ 🧬 Axiom 检测到一个可进化的模式              │
  │                                              │
  │ 你经常在创建组件时先写测试文件，然后再写实现。 │
  │ 置信度: 85% | 出现次数: 7                     │
  │                                              │
  │ 建议：创建一个 "TDD 组件" skill              │
  │                                              │
  │ [查看预览] [采纳] [忽略] [永久忽略]           │
  ╰─────────────────────────────────────────────╯
```

### R4: Skill 生成

采纳后自动生成 skill 文件到 `~/.config/axiom/skills/`:

```markdown
---
name: tdd-component
description: 创建组件时先写测试，再写实现
auto: true
---

当用户要求创建新组件时：
1. 先在 __tests__/ 目录创建测试文件
2. 编写基本的测试用例（渲染、交互）
3. 再创建组件实现文件
4. 确保测试通过
```

### R5: 数据持久化

所有学习数据存储在 `~/.config/axiom/growth/`:
- `patterns.json` — 模式记录
- `suggestions.json` — 进化建议历史
- `adopted.json` — 已采纳的进化

## 验收场景

### 场景 1: 记录新模式

- **当** 记录一个新的 workflow 模式
- **那么** 返回模式 ID（`pat_xxx`）

### 场景 2: 模式次数累加

- **当** 记录两次相同模式
- **那么** occurrences 累加为 2

### 场景 3: 达到阈值生成建议

- **当** 记录 5 次相同模式（置信度 0.8）
- **那么** `suggestEvolutions` 返回至少 1 个建议

### 场景 4: 采纳进化生成 Skill

- **当** 采纳一个进化建议
- **那么** 在 `~/.config/axiom/skills/` 生成 skill 文件

### 场景 5: 忽略的建议不再重复

- **当** 永久忽略一个建议
- **那么** `suggestEvolutions` 不再返回该建议
