# SPEC-C04: 独立 IDE

> 里程碑: M3 | 优先级: P2 | 状态: ⚪ 待开始 | 依赖: C03

## 目标

实现 IDE Fork 的配置管理和构建元数据。基于 VSCode/Code-OSS 的 fork 方案，嵌入 Axiom 引擎作为内置功能。

## 需求

### R1: IdeConfig 命名空间（packages/desktop 共用）

```typescript
export namespace IdeConfig {
  export const ProductInfo = z.object({
    name: z.string().default('Axiom IDE'),
    version: z.string(),
    applicationName: z.string().default('axiom-ide'),
    dataFolderName: z.string().default('.axiom-ide'),
    licenseName: z.string().default('MIT'),
    iconPath: z.string().optional(),
    extensionGallery: z.object({
      serviceUrl: z.string(),
      itemUrl: z.string(),
    }).optional(),
  })
  export type ProductInfo = z.infer<typeof ProductInfo>

  export const BuildConfig = z.object({
    target: z.enum(['linux', 'darwin', 'win32']),
    arch: z.enum(['x64', 'arm64']),
    quality: z.enum(['stable', 'insider']).default('stable'),
    obfuscate: z.boolean().default(false),
  })
  export type BuildConfig = z.infer<typeof BuildConfig>

  export function getDefaultProduct(version: string): ProductInfo;
  export function generateProductJson(info: ProductInfo): object;
  export function getBuildTargets(): BuildConfig[];
}
```

## 验收场景

### 场景 1: 默认产品信息
- **当** getDefaultProduct('0.1.0')
- **那么** name 为 'Axiom IDE'，version 为 '0.1.0'

### 场景 2: 生成 product.json
- **当** generateProductJson 传入 ProductInfo
- **那么** 返回符合 VSCode product.json 格式的对象

### 场景 3: 构建目标列表
- **当** getBuildTargets()
- **那么** 返回至少包含 linux-x64, darwin-arm64 等目标

### 场景 4: Schema 验证
- **当** BuildConfig.parse({ target: 'invalid', arch: 'x64' })
- **那么** 抛出验证错误
