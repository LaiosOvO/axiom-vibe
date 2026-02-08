# SPEC-F06: 验收测试系统 — 设计文档

> 状态: 待设计

## 技术方案

### 测试执行流程

```
Acceptance.runForSpec(specId)
     ↓
解析 spec 中的验收标准
     ↓
├─ 运行单元测试（runUnit）
├─ 运行集成测试（runIntegration）
└─ 运行 E2E 测试（runE2E）
     ↓
收集测试结果
     ↓
生成测试报告
     ↓
更新 spec 状态
```

### 浏览器自动化

使用 Playwright 提供浏览器控制能力：

```typescript
// 内部实现
import { chromium } from 'playwright';

let browser: Browser;
let page: Page;

export namespace BrowserTest {
  export async function open(url: string) {
    if (!browser) browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto(url);
  }

  export async function click(selector: string) {
    await page.click(selector);
  }

  // ...其他方法
}
```

## 接口设计

### Acceptance 命名空间

```typescript
export namespace Acceptance {
  // 测试结果类型
  export interface TestResult {
    total: number;
    passed: number;
    failed: number;
    errors: string[];
  }

  export interface AcceptanceResult {
    specId: string;
    unitTests?: TestResult;
    integrationTests?: TestResult;
    e2eTests?: TestResult;
    overall: 'passed' | 'partial' | 'failed';
  }

  // 验收标准解析
  export function parseFromSpec(specContent: string): AcceptanceCriteria;

  // 测试执行
  export function runForSpec(specId: string): Promise<AcceptanceResult>;
  export function runUnit(testFile: string, cases?: string[]): Promise<TestResult>;
  export function runIntegration(testFile: string): Promise<TestResult>;
  export function runE2E(e2eSpec: E2ESpec): Promise<TestResult>;

  // 报告生成
  export function generateReport(result: AcceptanceResult): {
    markdown: string;
    overall: 'passed' | 'partial' | 'failed';
  };
}
```

### BrowserTest 命名空间

```typescript
export namespace BrowserTest {
  // 浏览器控制
  export function open(url: string): Promise<void>;
  export function close(): Promise<void>;

  // 页面操作
  export function snapshot(): Promise<string>;
  export function click(selector: string): Promise<void>;
  export function fill(selector: string, value: string): Promise<void>;
  export function waitFor(text: string, timeout?: number): Promise<void>;

  // 数据获取
  export function screenshot(path: string): Promise<void>;
  export function getConsoleMessages(): Promise<ConsoleMessage[]>;
}
```

### E2ESpec 定义

```typescript
interface E2ESpec {
  name: string;
  type: 'browser';
  url: string;
  steps: string[];
}
```

## 数据结构

### AcceptanceCriteria

```typescript
interface AcceptanceCriteria {
  unitTests: {
    file: string;
    cases: string[];
  }[];
  integrationTests: {
    file: string;
    cases: string[];
  }[];
  e2eTests: E2ESpec[];
}
```

### 测试报告格式

```markdown
# 验收测试报告: SPEC-F01

## 测试统计

| 类型 | 通过 | 失败 | 总计 |
|------|------|------|------|
| 单元测试 | 12 | 0 | 12 |
| 集成测试 | 3 | 0 | 3 |
| E2E 测试 | 1 | 1 | 2 |

## 失败项

- ❌ E2E: 进度页面更新延迟超过 5 秒

## 结论

🟡 部分通过，需修复 E2E 问题
```

## 依赖关系

- M1 完成（工具系统）
- SPEC-F01: Spec 引擎（读取 spec、更新状态）
- Playwright（浏览器自动化）
