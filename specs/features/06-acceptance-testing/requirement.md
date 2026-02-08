# SPEC-F06: 验收测试系统

> 里程碑: M2 | 优先级: P1 | 状态: ⚪ 待开始 | 依赖: M1, F01

## 目标

实现自动化验收测试：agent 能自己操作浏览器进行 E2E 测试，也能运行单元测试和集成测试，确认功能完成。

## 需求

### R1: 验收标准定义

每个 spec 文件可包含验收标准部分，格式：

```yaml
acceptance:
  unit_tests:
    - file: test/config.test.ts
      cases: ['加载默认配置', '项目级覆盖全局']
  integration_tests:
    - file: test/integration/config-session.test.ts
      cases: ['配置变更影响会话']
  e2e_tests:
    - name: 配置界面测试
      type: browser
      url: http://localhost:4096/settings
      steps:
        - 打开设置页面
        - 修改 Provider 配置
        - 保存并验证生效
```

### R2: 测试执行引擎

```typescript
export namespace Acceptance {
  export async function runForSpec(specId: string): Promise<AcceptanceResult>;
  export async function runUnit(testFile: string, cases?: string[]): Promise<TestResult>;
  export async function runIntegration(testFile: string): Promise<TestResult>;
  export async function runE2E(e2eSpec: E2ESpec): Promise<TestResult>;
}
```

### R3: 浏览器自动化

使用 Playwright（或类 DrissionPage 的方式）进行 E2E 测试：
- Agent 能通过工具操作浏览器
- 支持截图验证
- 支持表单填写、点击、导航
- 支持等待元素出现
- 支持 console log 捕获

```typescript
export namespace BrowserTest {
  export async function open(url: string): Promise<void>;
  export async function snapshot(): Promise<string>;  // 页面快照
  export async function click(selector: string): Promise<void>;
  export async function fill(selector: string, value: string): Promise<void>;
  export async function screenshot(path: string): Promise<void>;
  export async function waitFor(text: string, timeout?: number): Promise<void>;
  export async function getConsoleMessages(): Promise<ConsoleMessage[]>;
}
```

### R4: 验收结果与 Spec 状态联动

- 所有测试通过 → spec 状态自动更新为 `completed`
- 部分测试通过 → spec 状态更新为 `testing`
- 测试结果写入 spec 文件的验收部分

### R5: 测试报告

```
╭──────────────────────────────────────────────╮
│ 📋 验收测试报告: SPEC-F01 Spec 引擎          │
│                                               │
│ 单元测试:    ✅ 12/12 通过                    │
│ 集成测试:    ✅ 3/3 通过                      │
│ E2E 测试:   ⚠️ 1/2 通过                      │
│                                               │
│ 失败项:                                       │
│   ❌ E2E: 进度页面更新延迟超过 5 秒            │
│                                               │
│ 结论: 🟡 部分通过，需修复 E2E 问题            │
╰──────────────────────────────────────────────╯
```

## 验收场景

### 场景 1: 解析验收标准

- **当** 解析 spec 文件中的 acceptance 部分
- **那么** 返回 unitTests、integrationTests、e2eTests

### 场景 2: 运行单元测试

- **当** 运行单元测试文件
- **那么** 返回 total、passed、failed 统计

### 场景 3: 生成测试报告

- **当** 生成测试报告
- **那么** 包含各类测试的统计和失败项

### 场景 4: 验收通过更新状态

- **当** 所有测试通过后运行 `runForSpec`
- **那么** spec 状态更新为 `completed`
