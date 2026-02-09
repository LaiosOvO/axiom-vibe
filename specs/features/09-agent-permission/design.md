# Agent + Permission — 技术设计

## Agent 模式

| 模式 | 说明 | 用途 |
|------|------|------|
| primary | 用户直接使用 | build, plan |
| subagent | 被其他 agent 调用 | explore |
| hidden | 系统内部使用 | title, summary |

## Permission Ruleset

```typescript
interface PermissionRule {
  tool: string     // 工具名，* 表示所有
  pattern?: string // 参数匹配 glob
  action: 'allow' | 'deny' | 'ask'
}
```

评估规则：**last match wins**（最后匹配的优先）

## 内置 Agent

| ID | Mode | 工具 | 权限策略 |
|----|------|------|----------|
| build | primary | 全部 | 全部允许，危险操作 ask |
| plan | primary | read/write/edit | 只能编辑 .md 文件 |
| explore | subagent | read/glob/grep | 只读，bash 需 ask |
| title | hidden | 无 | 全部 deny |
| summary | hidden | 无 | 全部 deny |

## Doom Loop 检测

同一工具 + 相同参数调用 3 次 → 强制 ask
