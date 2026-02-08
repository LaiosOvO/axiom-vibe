# SPEC-F04: 自我成长（轻量级）— 设计文档

> 状态: 待设计

## 技术方案

### 模式记录流程

```
Agent 执行任务
     ↓
检测可能的模式（重复行为）
     ↓
Growth.recordPattern()
     ↓
存储到 patterns.json
     ↓
定期检查是否达到进化阈值
     ↓
生成进化建议
     ↓
展示给用户
     ↓
用户采纳 → 生成 skill 文件
```

### 模式检测策略

| 模式类型 | 检测方式 | 示例 |
|---------|---------|------|
| preference | 工具选择、配置偏好 | 总是使用 Biome 而非 ESLint |
| workflow | 任务执行顺序 | 先写测试再写实现 |
| tool_pattern | 工具使用习惯 | 总是用 grep 搜索再用 read 读取 |
| coding_style | 代码风格偏好 | 偏好函数式组件 |

## 接口设计

### Growth 命名空间

```typescript
export namespace Growth {
  // 模式记录
  export interface PatternEntry {
    id: string;
    type: 'preference' | 'workflow' | 'tool_pattern' | 'coding_style';
    description: string;
    occurrences: number;
    confidence: number;
    context: string;
    firstSeen: string;
    lastSeen: string;
    adoptedAsSkill?: string;
  }

  // 记录模式
  export function recordPattern(pattern: Omit<PatternEntry, 'id' | 'firstSeen' | 'lastSeen'>): string;

  // 获取模式
  export function getPatterns(filter?: {
    type?: string;
    minConfidence?: number;
  }): PatternEntry[];

  // 进化建议
  export interface EvolutionSuggestion {
    patternId: string;
    type: 'new_skill' | 'update_prompt' | 'new_shortcut';
    title: string;
    description: string;
    preview: string;
    confidence: number;
  }

  export function suggestEvolutions(): EvolutionSuggestion[];

  // 采纳进化
  export function adoptEvolution(patternId: string): Promise<string>;  // 返回 skill 文件路径

  // 忽略进化
  export function ignoreEvolution(patternId: string, permanent?: boolean): void;

  // 生成 skill
  export function generateSkill(pattern: PatternEntry): string;  // 返回 skill 内容
}
```

### 数据持久化

```typescript
// ~/.config/axiom/growth/patterns.json
{
  "patterns": [
    {
      "id": "pat_001",
      "type": "workflow",
      "description": "先写测试再写实现",
      "occurrences": 7,
      "confidence": 0.85,
      "context": "React 组件开发",
      "firstSeen": "2026-02-01T10:00:00Z",
      "lastSeen": "2026-02-08T15:30:00Z"
    }
  ]
}

// ~/.config/axiom/growth/suggestions.json
{
  "suggestions": [...],
  "ignored": ["pat_002"]
}

// ~/.config/axiom/growth/adopted.json
{
  "adopted": [
    {
      "patternId": "pat_001",
      "skillPath": "~/.config/axiom/skills/tdd-component.md",
      "adoptedAt": "2026-02-08T16:00:00Z"
    }
  ]
}
```

## 数据结构

### 进化阈值

```typescript
const EVOLUTION_THRESHOLDS = {
  minOccurrences: 3,
  minConfidence: 0.7,
  cooldownPeriod: 7 * 24 * 60 * 60 * 1000, // 7 天内不重复建议
};
```

### Skill 模板

```markdown
---
name: {pattern-id}
description: {pattern-description}
auto: true
created: {timestamp}
source: growth
---

{generated-skill-content}
```

## 依赖关系

- M1 完成（配置系统）
- SPEC-01: 配置系统（读取/写入 skill 文件）
