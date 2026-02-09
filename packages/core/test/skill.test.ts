import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Skill } from '../src/skill'

describe('Skill 系统', () => {
  let testDir: string

  beforeEach(() => {
    // 创建临时测试目录
    testDir = join(tmpdir(), `skill-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })

    // 重置注册表
    Skill.reset()
  })

  afterEach(() => {
    // 清理测试目录
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  describe('parseSkillMd', () => {
    test('解析完整的 SKILL.md', () => {
      const content = `---
name: test-skill
description: 测试技能
author: test
---

# 技能内容

这是技能的具体内容。`

      const result = Skill.parseSkillMd(content)

      expect(result.frontmatter.name).toBe('test-skill')
      expect(result.frontmatter.description).toBe('测试技能')
      expect(result.frontmatter.author).toBe('test')
      expect(result.body).toContain('# 技能内容')
      expect(result.body).toContain('这是技能的具体内容。')
    })

    test('解析没有 frontmatter 的文件', () => {
      const content = '# 纯内容\n\n这是没有 frontmatter 的文件。'
      const result = Skill.parseSkillMd(content)

      expect(result.frontmatter.name).toBe('')
      expect(result.frontmatter.description).toBe('')
      expect(result.body).toBe(content)
    })

    test('解析包含数组的 frontmatter', () => {
      const content = `---
name: skill-with-array
description: 包含数组的技能
tags:
  - tag1
  - tag2
  - tag3
---

Body content`

      const result = Skill.parseSkillMd(content)

      expect(result.frontmatter.tags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    test('解析包含 boolean 和 number 的 frontmatter', () => {
      const content = `---
name: typed-skill
description: 包含多种类型的技能
enabled: true
version: 1.5
count: 42
---

Content`

      const result = Skill.parseSkillMd(content)

      expect(result.frontmatter.enabled).toBe(true)
      expect(result.frontmatter.version).toBe(1.5)
      expect(result.frontmatter.count).toBe(42)
    })
  })

  describe('scanDir', () => {
    test('扫描包含 SKILL.md 的目录', async () => {
      // 创建测试文件
      const skillDir = join(testDir, 'skills', 'my-skill')
      mkdirSync(skillDir, { recursive: true })

      const skillContent = `---
name: my-skill
description: 我的技能
---

技能内容`

      writeFileSync(join(skillDir, 'SKILL.md'), skillContent, 'utf-8')

      const skills = await Skill.scanDir(join(testDir, 'skills'), 'project')

      expect(skills).toHaveLength(1)
      expect(skills[0]?.name).toBe('my-skill')
      expect(skills[0]?.description).toBe('我的技能')
      expect(skills[0]?.source).toBe('project')
      expect(skills[0]?.content).toContain('技能内容')
    })

    test('扫描多层嵌套的目录', async () => {
      // 创建多个技能
      const skill1Dir = join(testDir, 'skills', 'category1', 'skill1')
      const skill2Dir = join(testDir, 'skills', 'category2', 'skill2')

      mkdirSync(skill1Dir, { recursive: true })
      mkdirSync(skill2Dir, { recursive: true })

      writeFileSync(
        join(skill1Dir, 'SKILL.md'),
        '---\nname: skill1\ndescription: 技能1\n---\n内容1',
        'utf-8',
      )
      writeFileSync(
        join(skill2Dir, 'SKILL.md'),
        '---\nname: skill2\ndescription: 技能2\n---\n内容2',
        'utf-8',
      )

      const skills = await Skill.scanDir(join(testDir, 'skills'), 'user')

      expect(skills).toHaveLength(2)
      expect(skills.map((s) => s.name).sort()).toEqual(['skill1', 'skill2'])
    })

    test('扫描不存在的目录返回空数组', async () => {
      const skills = await Skill.scanDir(join(testDir, 'nonexistent'), 'project')
      expect(skills).toEqual([])
    })

    test('忽略没有必需字段的 SKILL.md', async () => {
      const skillDir = join(testDir, 'invalid-skill')
      mkdirSync(skillDir, { recursive: true })

      // 缺少 description
      writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: invalid\n---\n内容', 'utf-8')

      const skills = await Skill.scanDir(testDir, 'project')
      expect(skills).toEqual([])
    })
  })

  describe('getByName', () => {
    test('根据名称查找 skill', () => {
      const skills: Skill.Info[] = [
        {
          name: 'skill1',
          description: 'desc1',
          source: 'project',
          filePath: '/path/1',
          content: 'content1',
        },
        {
          name: 'skill2',
          description: 'desc2',
          source: 'user',
          filePath: '/path/2',
          content: 'content2',
        },
      ]

      const found = Skill.getByName(skills, 'skill2')
      expect(found?.name).toBe('skill2')
      expect(found?.description).toBe('desc2')
    })

    test('查找不存在的 skill 返回 undefined', () => {
      const skills: Skill.Info[] = []
      const found = Skill.getByName(skills, 'nonexistent')
      expect(found).toBeUndefined()
    })
  })

  describe('formatForPrompt', () => {
    test('格式化 skill 列表为 XML', () => {
      const skills: Skill.Info[] = [
        {
          name: 'skill1',
          description: 'First skill',
          source: 'project',
          filePath: '/path/1',
          content: 'content1',
        },
        {
          name: 'skill2',
          description: 'Second skill',
          source: 'user',
          filePath: '/path/2',
          content: 'content2',
        },
      ]

      const formatted = Skill.formatForPrompt(skills)

      expect(formatted).toContain('<available_skills>')
      expect(formatted).toContain('</available_skills>')
      expect(formatted).toContain('<skill>')
      expect(formatted).toContain('</skill>')
      expect(formatted).toContain('<name>skill1</name>')
      expect(formatted).toContain('<description>First skill</description>')
      expect(formatted).toContain('<name>skill2</name>')
      expect(formatted).toContain('<description>Second skill</description>')
    })

    test('空列表返回空字符串', () => {
      const formatted = Skill.formatForPrompt([])
      expect(formatted).toBe('')
    })

    test('转义 XML 特殊字符', () => {
      const skills: Skill.Info[] = [
        {
          name: 'test<>&"\'',
          description: 'Contains <special> & "characters"',
          source: 'project',
          filePath: '/path',
          content: 'content',
        },
      ]

      const formatted = Skill.formatForPrompt(skills)

      expect(formatted).toContain('&lt;')
      expect(formatted).toContain('&gt;')
      expect(formatted).toContain('&amp;')
      expect(formatted).toContain('&quot;')
      expect(formatted).toContain('&apos;')
      expect(formatted).not.toContain('<special>')
    })
  })

  describe('注册表功能', () => {
    test('注册和获取 skill', () => {
      const skill: Skill.Info = {
        name: 'test-skill',
        description: 'Test',
        source: 'project',
        filePath: '/path',
        content: 'content',
      }

      Skill.register(skill)

      const found = Skill.get('test-skill')
      expect(found).toEqual(skill)
    })

    test('列出所有已注册的 skill', () => {
      const skill1: Skill.Info = {
        name: 'skill1',
        description: 'Desc1',
        source: 'project',
        filePath: '/path1',
        content: 'content1',
      }
      const skill2: Skill.Info = {
        name: 'skill2',
        description: 'Desc2',
        source: 'user',
        filePath: '/path2',
        content: 'content2',
      }

      Skill.register(skill1)
      Skill.register(skill2)

      const all = Skill.list()
      expect(all).toHaveLength(2)
      expect(all.map((s) => s.name).sort()).toEqual(['skill1', 'skill2'])
    })

    test('重置注册表', () => {
      const skill: Skill.Info = {
        name: 'test',
        description: 'Test',
        source: 'project',
        filePath: '/path',
        content: 'content',
      }

      Skill.register(skill)
      expect(Skill.list()).toHaveLength(1)

      Skill.reset()
      expect(Skill.list()).toHaveLength(0)
    })

    test('注册同名 skill 会覆盖', () => {
      const skill1: Skill.Info = {
        name: 'duplicate',
        description: 'First',
        source: 'project',
        filePath: '/path1',
        content: 'content1',
      }
      const skill2: Skill.Info = {
        name: 'duplicate',
        description: 'Second',
        source: 'user',
        filePath: '/path2',
        content: 'content2',
      }

      Skill.register(skill1)
      Skill.register(skill2)

      const found = Skill.get('duplicate')
      expect(found?.description).toBe('Second')
      expect(Skill.list()).toHaveLength(1)
    })
  })

  describe('scanProjectSkills', () => {
    test('扫描 .axiom/skill 目录', async () => {
      const skillDir = join(testDir, '.axiom', 'skill', 'my-skill')
      mkdirSync(skillDir, { recursive: true })

      writeFileSync(
        join(skillDir, 'SKILL.md'),
        '---\nname: project-skill\ndescription: 项目技能\n---\n内容',
        'utf-8',
      )

      const skills = await Skill.scanProjectSkills(testDir)

      expect(skills).toHaveLength(1)
      expect(skills[0]?.name).toBe('project-skill')
      expect(skills[0]?.source).toBe('project')
    })

    test('支持多个项目级目录', async () => {
      // 在 .axiom/skill 创建一个
      const axiomSkillDir = join(testDir, '.axiom', 'skill', 'skill1')
      mkdirSync(axiomSkillDir, { recursive: true })
      writeFileSync(
        join(axiomSkillDir, 'SKILL.md'),
        '---\nname: skill1\ndescription: Skill 1\n---\n内容',
        'utf-8',
      )

      // 在 .opencode/skill 创建一个
      const opencodeSkillDir = join(testDir, '.opencode', 'skill', 'skill2')
      mkdirSync(opencodeSkillDir, { recursive: true })
      writeFileSync(
        join(opencodeSkillDir, 'SKILL.md'),
        '---\nname: skill2\ndescription: Skill 2\n---\n内容',
        'utf-8',
      )

      const skills = await Skill.scanProjectSkills(testDir)

      expect(skills).toHaveLength(2)
      expect(skills.map((s) => s.name).sort()).toEqual(['skill1', 'skill2'])
    })
  })

  describe('loadAll', () => {
    test('加载项目级和用户级 skill', async () => {
      // 创建项目级 skill
      const projectSkillDir = join(testDir, '.axiom', 'skill', 'project-skill')
      mkdirSync(projectSkillDir, { recursive: true })
      writeFileSync(
        join(projectSkillDir, 'SKILL.md'),
        '---\nname: project-skill\ndescription: 项目技能\n---\n内容',
        'utf-8',
      )

      const skills = await Skill.loadAll(testDir)

      // 至少应该有项目级的 skill
      const projectSkills = skills.filter((s) => s.source === 'project')
      expect(projectSkills).toHaveLength(1)
      expect(projectSkills[0]?.name).toBe('project-skill')
    })
  })

  describe('Zod schema 验证', () => {
    test('Info schema 验证有效数据', () => {
      const data = {
        name: 'test',
        description: 'Test skill',
        source: 'project' as const,
        filePath: '/path/to/skill',
        content: 'Skill content',
      }

      const result = Skill.Info.parse(data)
      expect(result).toEqual(data)
    })

    test('Info schema 拒绝无效的 source', () => {
      const data = {
        name: 'test',
        description: 'Test',
        source: 'invalid',
        filePath: '/path',
        content: 'content',
      }

      expect(() => Skill.Info.parse(data)).toThrow()
    })

    test('Info schema 拒绝缺少必需字段', () => {
      const data = {
        name: 'test',
        description: 'Test',
        // 缺少 source, filePath, content
      }

      expect(() => Skill.Info.parse(data)).toThrow()
    })
  })
})
