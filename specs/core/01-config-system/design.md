# SPEC-01: 配置系统 — 设计文档

> 状态: 待设计

## 技术方案

### 配置加载流程

```
1. 加载默认值（Schema 中的 .default()）
     ↓
2. 读取并合并全局配置 (~/.config/axiom/config.json)
     ↓
3. 读取并合并项目配置 (.axiom/config.json)
     ↓
4. 读取并覆盖环境变量 (AXIOM_*)
     ↓
5. Zod 验证最终配置
```

### Markdown Frontmatter 解析

使用 gray-matter 或自定义解析器：
- 识别 `---` 分隔符
- 解析 YAML frontmatter
- 分离 content 部分

## 接口设计

### Config 命名空间

```typescript
export namespace Config {
  // Schema 定义
  export const Info: z.ZodType<ConfigInfo>;
  export type Info = z.infer<typeof Info>;

  // 配置加载
  export function load(): Info;
  export function loadFrom(path: string): Partial<Info>;
  export function merge(...configs: Partial<Info>[]): Info;

  // 环境变量映射
  export function fromEnv(): Partial<Info>;

  // Frontmatter 解析
  export function parseMarkdown(content: string): {
    frontmatter: Record<string, any>;
    content: string;
  };
}
```

### 环境变量映射规则

```
AXIOM_PROVIDER_DEFAULT → config.provider.default
AXIOM_PROVIDER_ANTHROPIC_API_KEY → config.provider.anthropic.apiKey
AXIOM_SPEC_DIR → config.spec.dir
```

## 数据结构

### 配置文件格式 (JSON)

```json
{
  "provider": {
    "default": "anthropic",
    "anthropic": {
      "apiKey": "sk-..."
    }
  },
  "agent": {
    "default": "orchestrator"
  },
  "spec": {
    "dir": "specs",
    "progressFile": "progress/PROGRESS.md"
  },
  "growth": {
    "enabled": true,
    "autoRecord": true
  }
}
```

### Markdown Frontmatter 格式

```markdown
---
name: example-skill
description: 示例技能
enabled: true
---

# Skill 内容

技能的具体实现...
```

## 依赖关系

- SPEC-00: 项目初始化（需要项目结构）
- Zod v4（配置验证）
