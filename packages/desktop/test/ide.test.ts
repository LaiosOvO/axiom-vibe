import { describe, expect, test } from 'bun:test'
import { IdeConfig } from '../src/ide/index'

describe('IdeConfig.ProductInfo', () => {
  test('getDefaultProduct 返回默认产品信息', () => {
    const product = IdeConfig.getDefaultProduct('0.1.0')
    expect(product.name).toBe('Axiom IDE')
    expect(product.version).toBe('0.1.0')
    expect(product.applicationName).toBe('axiom-ide')
    expect(product.dataFolderName).toBe('.axiom-ide')
    expect(product.licenseName).toBe('MIT')
  })

  test('ProductInfo.parse 验证有效产品信息', () => {
    const product = IdeConfig.ProductInfo.parse({
      name: 'Custom IDE',
      version: '1.0.0',
      applicationName: 'custom-ide',
      dataFolderName: '.custom-ide',
      licenseName: 'Apache-2.0',
    })
    expect(product.name).toBe('Custom IDE')
    expect(product.version).toBe('1.0.0')
  })

  test('ProductInfo.parse 使用默认值', () => {
    const product = IdeConfig.ProductInfo.parse({
      version: '2.0.0',
    })
    expect(product.name).toBe('Axiom IDE')
    expect(product.applicationName).toBe('axiom-ide')
    expect(product.dataFolderName).toBe('.axiom-ide')
    expect(product.licenseName).toBe('MIT')
    expect(product.version).toBe('2.0.0')
  })

  test('ProductInfo.parse 支持可选的 extensionGallery', () => {
    const product = IdeConfig.ProductInfo.parse({
      version: '1.0.0',
      extensionGallery: {
        serviceUrl: 'https://example.com/api',
        itemUrl: 'https://example.com/item',
      },
    })
    expect(product.extensionGallery).toBeDefined()
    expect(product.extensionGallery?.serviceUrl).toBe('https://example.com/api')
  })
})

describe('IdeConfig.BuildConfig', () => {
  test('BuildConfig.parse 验证有效构建配置', () => {
    const config = IdeConfig.BuildConfig.parse({
      target: 'linux',
      arch: 'x64',
    })
    expect(config.target).toBe('linux')
    expect(config.arch).toBe('x64')
    expect(config.quality).toBe('stable')
    expect(config.obfuscate).toBe(false)
  })

  test('BuildConfig.parse 拒绝无效 target', () => {
    expect(() => {
      IdeConfig.BuildConfig.parse({
        target: 'invalid',
        arch: 'x64',
      })
    }).toThrow()
  })

  test('BuildConfig.parse 拒绝无效 arch', () => {
    expect(() => {
      IdeConfig.BuildConfig.parse({
        target: 'linux',
        arch: 'invalid',
      })
    }).toThrow()
  })

  test('BuildConfig.parse 支持 insider 质量', () => {
    const config = IdeConfig.BuildConfig.parse({
      target: 'darwin',
      arch: 'arm64',
      quality: 'insider',
    })
    expect(config.quality).toBe('insider')
  })
})

describe('IdeConfig.generateProductJson', () => {
  test('generateProductJson 返回正确格式', () => {
    const product = IdeConfig.getDefaultProduct('0.1.0')
    const json = IdeConfig.generateProductJson(product)

    expect(json).toHaveProperty('nameShort', 'Axiom IDE')
    expect(json).toHaveProperty('nameLong', 'Axiom IDE - AI Coding IDE')
    expect(json).toHaveProperty('applicationName', 'axiom-ide')
    expect(json).toHaveProperty('dataFolderName', '.axiom-ide')
    expect(json).toHaveProperty('version', '0.1.0')
    expect(json).toHaveProperty('license', 'MIT')
  })

  test('generateProductJson 包含 extensionGallery 当存在时', () => {
    const product = IdeConfig.ProductInfo.parse({
      version: '1.0.0',
      extensionGallery: {
        serviceUrl: 'https://api.example.com',
        itemUrl: 'https://item.example.com',
      },
    })
    const json = IdeConfig.generateProductJson(product)

    expect(json).toHaveProperty('extensionGallery')
    const gallery = json as Record<string, unknown>
    expect((gallery.extensionGallery as Record<string, unknown>).serviceUrl).toBe(
      'https://api.example.com',
    )
  })

  test('generateProductJson 不包含 extensionGallery 当不存在时', () => {
    const product = IdeConfig.getDefaultProduct('1.0.0')
    const json = IdeConfig.generateProductJson(product)

    expect(json).not.toHaveProperty('extensionGallery')
  })
})

describe('IdeConfig.getBuildTargets', () => {
  test('getBuildTargets 返回所有平台和架构组合', () => {
    const targets = IdeConfig.getBuildTargets()

    expect(targets.length).toBe(6)

    const platforms = new Set(targets.map((t) => t.target))
    expect(platforms.size).toBe(3)
    expect(platforms.has('linux')).toBe(true)
    expect(platforms.has('darwin')).toBe(true)
    expect(platforms.has('win32')).toBe(true)

    const archs = new Set(targets.map((t) => t.arch))
    expect(archs.size).toBe(2)
    expect(archs.has('x64')).toBe(true)
    expect(archs.has('arm64')).toBe(true)
  })

  test('getBuildTargets 返回正确的目标组合', () => {
    const targets = IdeConfig.getBuildTargets()

    const targetMap = new Map(targets.map((t) => [`${t.target}-${t.arch}`, t]))

    expect(targetMap.has('linux-x64')).toBe(true)
    expect(targetMap.has('linux-arm64')).toBe(true)
    expect(targetMap.has('darwin-x64')).toBe(true)
    expect(targetMap.has('darwin-arm64')).toBe(true)
    expect(targetMap.has('win32-x64')).toBe(true)
    expect(targetMap.has('win32-arm64')).toBe(true)
  })

  test('getBuildTargets 返回默认质量和混淆设置', () => {
    const targets = IdeConfig.getBuildTargets()

    for (const target of targets) {
      expect(target.quality).toBe('stable')
      expect(target.obfuscate).toBe(false)
    }
  })
})
