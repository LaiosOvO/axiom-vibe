# SPEC-F03: GitHub 搜索接口

> 里程碑: M2 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: M1

## 目标

实现独立的、可单独测试的 GitHub 搜索模块，支持多种搜索策略、结果过滤和仓库深度分析。

## 需求

### R1: 三层搜索实现

| 层级 | 实现方式 | 适用场景 |
|------|---------|---------|
| gh CLI | 调用本地 `gh search repos` | 已安装 gh 的环境 |
| GitHub REST API | 直接调用 api.github.com | 有 token 的环境 |
| 自定义搜索接口 | 爬取 github.com/search | 无 token 的降级方案 |

### R2: 搜索 API

```typescript
export namespace GitHubSearch {
  export interface SearchOptions {
    query: string;
    language?: string;
    minStars?: number;
    maxAge?: number;      // 天数，过滤太旧的仓库
    sort?: 'stars' | 'updated' | 'relevance';
    limit?: number;
  }

  export interface RepoInfo {
    fullName: string;
    url: string;
    description: string;
    stars: number;
    forks: number;
    language: string;
    lastUpdated: string;
    topics: string[];
    license: string;
    readme?: string;
    directoryStructure?: string[];
    techStack?: string[];
  }

  export async function search(options: SearchOptions): Promise<RepoInfo[]>;
  export async function analyzeRepo(fullName: string): Promise<RepoAnalysis>;
  export async function cloneAndAnalyze(fullName: string, depth?: number): Promise<DeepAnalysis>;
}
```

### R3: 仓库深度分析

对每个仓库进行：
- README 读取和摘要
- 目录结构扫描（最多 2 层）
- package.json / go.mod / Cargo.toml 等依赖文件分析
- 核心源码文件识别（入口文件、主要模块）
- 技术栈自动识别

### R4: 搜索优化

- 结果去重（同一仓库不同搜索词可能重复命中）
- 智能查询扩展（"TUI 框架" → "terminal ui framework", "cli tui", ...）
- 结果缓存（同一查询 24 小时内不重复搜索）

## 验收场景

### 场景 1: 基本搜索

- **当** 搜索 `terminal ui framework`，语言为 `typescript`，最少 100 stars
- **那么** 返回至少 1 个结果，所有结果 stars ≥ 100

### 场景 2: 结果排序

- **当** 按 stars 排序搜索
- **那么** 结果按 stars 降序排列

### 场景 3: 过滤过期仓库

- **当** 设置 maxAge 为 365 天
- **那么** 所有结果的 lastUpdated 在最近一年内

### 场景 4: 仓库深度分析

- **当** 分析仓库 `opencode-ai/opencode`
- **那么** 返回 techStack、architecture、pros/cons

### 场景 5: 查询扩展

- **当** 扩展查询"TUI 框架"
- **那么** 返回多个扩展查询（包含"terminal ui framework"）

### 场景 6: 结果缓存

- **当** 连续两次相同查询
- **那么** 第二次调用从缓存返回（< 50ms）

### 场景 7: 三层降级

- **当** gh CLI 不可用
- **那么** 自动降级到 GitHub REST API 或自定义接口
