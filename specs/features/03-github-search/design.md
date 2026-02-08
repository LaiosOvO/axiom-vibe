# SPEC-F03: GitHub 搜索接口 — 设计文档

> 状态: 待设计

## 技术方案

### 三层搜索降级策略

```
尝试 gh CLI
     ↓ 失败
尝试 GitHub REST API
     ↓ 失败
降级到自定义爬虫
```

### 搜索流程

```
用户输入 SearchOptions
     ↓
查询扩展（可选）
     ↓
检查缓存
     ↓ 未命中
执行搜索（三层降级）
     ↓
结果过滤（minStars, maxAge）
     ↓
结果去重
     ↓
结果排序
     ↓
缓存结果
     ↓
返回 RepoInfo[]
```

## 接口设计

### GitHubSearch 命名空间

```typescript
export namespace GitHubSearch {
  // 搜索选项
  export interface SearchOptions {
    query: string;
    language?: string;
    minStars?: number;
    maxAge?: number;
    sort?: 'stars' | 'updated' | 'relevance';
    limit?: number;
  }

  // 仓库信息
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

  // 仓库分析
  export interface RepoAnalysis {
    fullName: string;
    techStack: string[];
    architecture: string;
    pros: string[];
    cons: string[];
    keyFeatures: string[];
  }

  // 搜索接口
  export function search(options: SearchOptions): Promise<RepoInfo[]>;

  // 仓库分析
  export function analyzeRepo(fullName: string): Promise<RepoAnalysis>;
  export function cloneAndAnalyze(fullName: string, depth?: number): Promise<DeepAnalysis>;

  // 查询扩展
  export function expandQuery(query: string): string[];

  // 三层搜索实现
  export function searchViaGhCli(options: SearchOptions): Promise<RepoInfo[]>;
  export function searchViaRestApi(options: SearchOptions): Promise<RepoInfo[]>;
  export function searchViaCustom(options: SearchOptions): Promise<RepoInfo[]>;
}
```

### 缓存策略

```typescript
interface CacheEntry {
  query: string;
  results: RepoInfo[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时
```

## 数据结构

### gh CLI 输出解析

```bash
gh search repos "terminal ui" --limit 10 --json fullName,description,stargazersCount,updatedAt
```

输出格式：

```json
[
  {
    "fullName": "charmbracelet/bubbletea",
    "description": "A powerful little TUI framework 🏗",
    "stargazersCount": 15234,
    "updatedAt": "2026-02-08T10:30:00Z"
  }
]
```

### GitHub REST API

```
GET https://api.github.com/search/repositories?q={query}

Response:
{
  "items": [
    {
      "full_name": "...",
      "description": "...",
      "stargazers_count": 123,
      ...
    }
  ]
}
```

### 自定义爬虫

爬取 `https://github.com/search?q={query}`，解析 HTML。

## 依赖关系

- M1 完成（工具系统）
- gh CLI（可选）
- GitHub Token（可选）
