# Deep Research + Ref — 技术设计

## ref/ 目录结构

```
ref/
├── repos/           # clone 下来的项目
│   └── <name>/
├── <name>/          # 生成的参考文档
│   ├── summary.md
│   ├── structure.md
│   └── modules.md
└── index.md         # 所有参考项目索引
```

## 核心流程

```
cloneProject() → analyzeStructure() → analyzeFiles() → generateModuleMapping() → saveRefDocument()
```

## API 设计

| 函数 | 说明 |
|------|------|
| `initRefDir()` | 创建 ref/ 目录 |
| `cloneProject()` | git clone 到 ref/repos/ |
| `analyzeStructure()` | 分析目录树 |
| `analyzeFiles()` | 提取文件 export 信息 |
| `generateModuleMapping()` | 功能 → 文件映射 |
| `generateRefDocument()` | 生成完整参考文档 |
| `saveRefDocument()` | 保存为 markdown |
| `searchRef()` | 搜索参考文档 |

## 决策

1. 用 `Bun.spawn(['git', 'clone'])` 执行真实 clone
2. 文件分析基于正则匹配 export 语句（不依赖 AST 解析器）
3. 参考文档纯 markdown 格式
