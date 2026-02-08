# SPEC-F02: Deep Research 深度研究 — 设计文档

> 状态: 待设计

## 技术方案

### 研究流程架构

```
用户输入需求
     ↓
DeepResearch.clarify() — 澄清需求（对话）
     ↓
DeepResearch.searchCompetitors() — Web 搜索竞品
     ↓
DeepResearch.searchGitHub() — GitHub 搜索仓库
     ↓
DeepResearch.analyzeRepos() — 深度分析仓库
     ↓
DeepResearch.generateSummary() — 生成总结文档
     ↓
保存到 ref/<topic>/
```

### 仓库分析策略

对每个仓库：
1. 读取 README.md（提取功能、安装、使用说明）
2. 分析目录结构（识别架构模式）
3. 读取 package.json / go.mod / Cargo.toml（识别依赖）
4. 评估活跃度（最后提交时间、issue/PR 数）
5. 提取核心代码示例

## 接口设计

### DeepResearch 命名空间

```typescript
export namespace DeepResearch {
  // 需求澄清
  export function clarify(userInput: string): Promise<{
    systemType: string;
    topic: string;
    tech: string[];
    constraints: string[];
  }>;

  // 解析研究请求
  export function parseRequest(input: string): {
    topic: string;
    keywords: string[];
  };

  // 生成搜索查询
  export function generateQueries(opts: {
    systemType: string;
    topic: string;
    tech: string[];
  }): {
    github: string[];
    web: string[];
  };

  // 搜索竞品
  export function searchCompetitors(query: string): Promise<CompetitorInfo[]>;

  // 搜索 GitHub 仓库
  export function searchGitHub(query: string): Promise<RepoInfo[]>;

  // 分析仓库
  export function analyzeRepo(repoUrl: string): Promise<RepoReport>;

  // 解析仓库报告
  export function parseRepoReport(data: any): RepoReport;

  // 生成总结文档
  export function generateSummary(reports: RepoReport[]): string;

  // 保存结果到 ref/
  export function saveResults(topic: string, results: ResearchResults): Promise<void>;
}
```

### 数据结构

```typescript
interface ResearchResults {
  topic: string;
  summary: string;
  repos: RepoReport[];
  competitors: CompetitorInfo[];
}

interface RepoReport {
  name: string;
  url: string;
  stars: number;
  language: string;
  lastUpdated: string;
  description: string;
  techStack: string[];
  architecture: string;
  pros: string[];
  cons: string[];
  keyFeatures: string[];
  codeExamples: string[];
}

interface CompetitorInfo {
  name: string;
  url: string;
  description: string;
  pricing: string;
  keyFeatures: string[];
}
```

## 数据结构

### 目录结构

```
ref/
├── tui-framework/
│   ├── summary.md
│   ├── repos/
│   │   ├── charmbracelet-bubbletea.md
│   │   ├── vadimdemedes-ink.md
│   │   └── ...
│   └── competitors/
│       ├── warp-terminal.md
│       └── ...
```

### summary.md 格式

```markdown
# TUI 框架 — 研究总结

## 竞品对比

| 产品 | 语言 | Stars | 优势 | 劣势 |
|------|------|-------|------|------|
| ... | ... | ... | ... | ... |

## 推荐方案

基于研究，推荐使用...

## 参考仓库

- [charmbracelet/bubbletea](./repos/charmbracelet-bubbletea.md) - Go TUI 框架
- ...
```

## 依赖关系

- M1 完成（工具系统、GitHub 搜索）
- SPEC-F03: GitHub 搜索接口
