import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

export namespace Skill {
  /**
   * Skill 定义 schema
   */
  export const Info = z.object({
    name: z.string(),
    description: z.string(),
    source: z.enum(['builtin', 'project', 'user']),
    filePath: z.string(),
    content: z.string(),
  })

  export type Info = z.infer<typeof Info>

  /**
   * SKILL.md frontmatter 定义
   */
  export interface SkillFrontmatter {
    name: string
    description: string
    [key: string]: unknown
  }

  /**
   * 解析 SKILL.md 文件的 frontmatter 和 body
   * @param content - SKILL.md 文件内容
   * @returns 解析后的 frontmatter 和 body
   */
  export function parseSkillMd(content: string): {
    frontmatter: SkillFrontmatter
    body: string
  } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

    if (!match) {
      return {
        frontmatter: { name: '', description: '' },
        body: content,
      }
    }

    const yamlContent = match[1] ?? ''
    const bodyContent = match[2] ?? ''
    const frontmatter = parseSimpleYaml(yamlContent)

    return {
      frontmatter: {
        name: String(frontmatter.name ?? ''),
        description: String(frontmatter.description ?? ''),
        ...frontmatter,
      },
      body: bodyContent,
    }
  }

  /**
   * 简单的 YAML 解析器（支持基本的 key: value 和数组）
   */
  function parseSimpleYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const lines = yaml.split('\n')
    let currentKey: string | null = null
    let currentArray: unknown[] = []

    for (const line of lines) {
      // 处理数组项
      if (line.match(/^\s+-\s+(.+)$/)) {
        const value = line.match(/^\s+-\s+(.+)$/)?.[1]
        if (currentKey && value) {
          currentArray.push(parseValue(value))
        }
        continue
      }

      // 处理键值对
      const kvMatch = line.match(/^([^:]+):\s*(.*)$/)
      if (kvMatch) {
        // 保存上一个数组
        if (currentKey && currentArray.length > 0) {
          result[currentKey] = currentArray
          currentArray = []
        }

        const key = kvMatch[1] ?? ''
        const value = kvMatch[2] ?? ''
        currentKey = key.trim()

        if (value) {
          result[currentKey] = parseValue(value)
          currentKey = null
        }
      }
    }

    // 处理最后一个数组
    if (currentKey && currentArray.length > 0) {
      result[currentKey] = currentArray
    }

    return result
  }

  /**
   * 解析 YAML 值（支持 boolean、number、string）
   */
  function parseValue(value: string): unknown {
    const trimmed = value.trim()

    if (trimmed === 'true') return true
    if (trimmed === 'false') return false

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed)
    }

    // 移除引号
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1)
    }

    return trimmed
  }

  /**
   * 递归扫描目录，查找所有 SKILL.md 文件
   * @param dir - 要扫描的目录路径
   * @param source - skill 来源标识
   * @returns Skill 信息数组
   */
  export async function scanDir(dir: string, source: Info['source']): Promise<Info[]> {
    if (!existsSync(dir)) {
      return []
    }

    const skills: Info[] = []
    const scan = (currentDir: string): void => {
      try {
        const entries = readdirSync(currentDir)

        for (const entry of entries) {
          const fullPath = join(currentDir, entry)
          try {
            const stat = statSync(fullPath)

            if (stat.isDirectory()) {
              scan(fullPath)
            } else if (entry === 'SKILL.md') {
              const content = readFileSync(fullPath, 'utf-8')
              const { frontmatter, body } = parseSkillMd(content)

              if (frontmatter.name && frontmatter.description) {
                skills.push({
                  name: frontmatter.name,
                  description: frontmatter.description,
                  source,
                  filePath: fullPath,
                  content: body,
                })
              }
            }
          } catch {
            // 忽略无法访问的文件/目录
          }
        }
      } catch {
        // 忽略无法读取的目录
      }
    }

    scan(dir)
    return skills
  }

  /**
   * 扫描项目级 skill 目录
   * @param projectRoot - 项目根目录
   * @returns 项目级 Skill 信息数组
   */
  export async function scanProjectSkills(projectRoot: string): Promise<Info[]> {
    const skills: Info[] = []

    // 支持多个可能的项目级 skill 目录
    const possibleDirs = [
      join(projectRoot, '.axiom', 'skill'),
      join(projectRoot, '.opencode', 'skill'),
      join(projectRoot, '.claude', 'skills'),
    ]

    for (const dir of possibleDirs) {
      const found = await scanDir(dir, 'project')
      skills.push(...found)
    }

    return skills
  }

  /**
   * 扫描用户级 skill 目录
   * @returns 用户级 Skill 信息数组
   */
  export async function scanUserSkills(): Promise<Info[]> {
    const skills: Info[] = []

    // 支持多个可能的用户级 skill 目录
    const possibleDirs = [
      join(homedir(), '.config', 'axiom', 'skill'),
      join(homedir(), '.config', 'opencode', 'skill'),
      join(homedir(), '.config', 'claude', 'skills'),
    ]

    for (const dir of possibleDirs) {
      const found = await scanDir(dir, 'user')
      skills.push(...found)
    }

    return skills
  }

  /**
   * 加载所有 skill（项目级 + 用户级）
   * @param projectRoot - 项目根目录
   * @returns 所有 Skill 信息数组
   */
  export async function loadAll(projectRoot: string): Promise<Info[]> {
    const [projectSkills, userSkills] = await Promise.all([
      scanProjectSkills(projectRoot),
      scanUserSkills(),
    ])

    return [...projectSkills, ...userSkills]
  }

  /**
   * 根据名称获取 skill
   * @param skills - Skill 信息数组
   * @param name - skill 名称
   * @returns 匹配的 Skill 信息，如果未找到返回 undefined
   */
  export function getByName(skills: Info[], name: string): Info | undefined {
    return skills.find((skill) => skill.name === name)
  }

  /**
   * 格式化 skill 列表为 system prompt 片段
   * @param skills - Skill 信息数组
   * @returns 格式化的 XML 字符串
   */
  export function formatForPrompt(skills: Info[]): string {
    if (skills.length === 0) {
      return ''
    }

    const skillElements = skills
      .map(
        (skill) => `  <skill>
    <name>${escapeXml(skill.name)}</name>
    <description>${escapeXml(skill.description)}</description>
  </skill>`,
      )
      .join('\n')

    return `<available_skills>
${skillElements}
</available_skills>`
  }

  /**
   * 转义 XML 特殊字符
   */
  function escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Skill 注册表
   */
  const registry = new Map<string, Info>()

  /**
   * 注册一个 skill 到全局注册表
   * @param skill - 要注册的 Skill 信息
   */
  export function register(skill: Info): void {
    registry.set(skill.name, skill)
  }

  /**
   * 从注册表获取 skill
   * @param name - skill 名称
   * @returns 匹配的 Skill 信息，如果未找到返回 undefined
   */
  export function get(name: string): Info | undefined {
    return registry.get(name)
  }

  /**
   * 列出注册表中所有 skill
   * @returns 所有已注册的 Skill 信息数组
   */
  export function list(): Info[] {
    return Array.from(registry.values())
  }

  /**
   * 清空注册表
   */
  export function reset(): void {
    registry.clear()
  }
}
