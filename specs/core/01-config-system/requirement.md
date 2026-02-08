# SPEC-01: 配置系统

> 里程碑: M0 | 优先级: P0 | 状态: ⚪ 待开始 | 依赖: SPEC-00

## 目标

实现多层配置加载系统，支持全局、项目级、环境变量三层配置合并。

## 需求

### R1: 配置 Schema

使用 Zod v4 定义配置结构：

```typescript
export namespace Config {
  export const Info = z.object({
    provider: z.object({
      default: z.string().default('anthropic'),
      anthropic: z.object({ apiKey: z.string().optional() }).optional(),
      openai: z.object({ apiKey: z.string().optional() }).optional(),
      // ... 其他 provider
    }),
    agent: z.object({
      default: z.string().default('orchestrator'),
      // agent 覆盖配置
    }),
    mcp: z.record(z.object({
      command: z.string(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      enabled: z.boolean().default(true),
    })).optional(),
    spec: z.object({
      dir: z.string().default('specs'),
      progressFile: z.string().default('progress/PROGRESS.md'),
    }),
    growth: z.object({
      enabled: z.boolean().default(true),
      autoRecord: z.boolean().default(true),
    }),
  });

  export type Info = z.infer<typeof Info>;
}
```

### R2: 多层加载

优先级（高覆盖低）：
1. 环境变量 `AXIOM_*`
2. 项目级 `.axiom/config.json`
3. 全局 `~/.config/axiom/config.json`
4. 默认值

### R3: Markdown Frontmatter 支持

Skill 和 Agent 定义文件使用 markdown frontmatter 格式。

## 验收场景

### 场景 1: 加载默认配置

- **当** 不存在任何配置文件时调用 `Config.load()`
- **那么** 返回默认配置，`provider.default` 为 `'anthropic'`

### 场景 2: 项目级配置覆盖全局

- **当** 全局配置设置 `provider.default` 为 `'anthropic'`，项目配置设置为 `'openai'`
- **那么** 最终配置的 `provider.default` 为 `'openai'`

### 场景 3: 环境变量最高优先级

- **当** 设置环境变量 `AXIOM_PROVIDER_DEFAULT=openai`
- **那么** 无论配置文件如何，`provider.default` 都为 `'openai'`

### 场景 4: 无效配置抛出错误

- **当** 配置文件包含无效数据（如 `provider: 'invalid'`）
- **那么** 抛出 `ZodError`

### 场景 5: Markdown Frontmatter 解析

- **当** 解析包含 frontmatter 的 markdown 文件
- **那么** 正确分离 frontmatter 和 content
