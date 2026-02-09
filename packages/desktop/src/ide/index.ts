import { z } from 'zod'

export namespace IdeConfig {
  export const ProductInfo = z.object({
    name: z.string().default('Axiom IDE'),
    version: z.string(),
    applicationName: z.string().default('axiom-ide'),
    dataFolderName: z.string().default('.axiom-ide'),
    licenseName: z.string().default('MIT'),
    iconPath: z.string().optional(),
    extensionGallery: z
      .object({
        serviceUrl: z.string(),
        itemUrl: z.string(),
      })
      .optional(),
  })
  export type ProductInfo = z.infer<typeof ProductInfo>

  export const BuildConfig = z.object({
    target: z.enum(['linux', 'darwin', 'win32']),
    arch: z.enum(['x64', 'arm64']),
    quality: z.enum(['stable', 'insider']).default('stable'),
    obfuscate: z.boolean().default(false),
  })
  export type BuildConfig = z.infer<typeof BuildConfig>

  export function getDefaultProduct(version: string): ProductInfo {
    return {
      name: 'Axiom IDE',
      version,
      applicationName: 'axiom-ide',
      dataFolderName: '.axiom-ide',
      licenseName: 'MIT',
    }
  }

  export function generateProductJson(info: ProductInfo): object {
    const result: Record<string, unknown> = {
      nameShort: info.name,
      nameLong: `${info.name} - AI Coding IDE`,
      applicationName: info.applicationName,
      dataFolderName: info.dataFolderName,
      version: info.version,
      license: info.licenseName,
    }

    if (info.extensionGallery) {
      result.extensionGallery = info.extensionGallery
    }

    return result
  }

  export function getBuildTargets(): BuildConfig[] {
    const targets: BuildConfig[] = []
    const platforms = ['linux', 'darwin', 'win32'] as const
    const archs = ['x64', 'arm64'] as const

    for (const target of platforms) {
      for (const arch of archs) {
        targets.push({
          target,
          arch,
          quality: 'stable',
          obfuscate: false,
        })
      }
    }

    return targets
  }
}
