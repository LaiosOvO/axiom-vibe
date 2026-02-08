import { beforeEach, describe, expect, it } from 'bun:test'
import { Growth } from '../src/growth'

describe('Growth', () => {
  beforeEach(() => {
    Growth.reset()
  })

  it('记录新模式 — recordPattern 返回 ID（pat_xxx 格式）', () => {
    const patternId = Growth.recordPattern({
      type: 'preference',
      description: '喜欢使用 TypeScript',
      confidence: 0.9,
      context: '在多个项目中观察到',
    })

    expect(patternId).toBeDefined()
    expect(typeof patternId).toBe('string')
    expect(patternId).toMatch(/^pat_/)
  })

  it('重复模式累加 — 相同 description 的模式 occurrences 增加', () => {
    const desc = '喜欢使用 TypeScript'
    const id1 = Growth.recordPattern({
      type: 'preference',
      description: desc,
      confidence: 0.9,
      context: '第一次观察',
    })

    const id2 = Growth.recordPattern({
      type: 'preference',
      description: desc,
      confidence: 0.95,
      context: '第二次观察',
    })

    expect(id1).toBe(id2)

    const patterns = Growth.getPatterns()
    expect(patterns).toHaveLength(1)
    expect(patterns[0]?.occurrences).toBe(2)
    expect(patterns[0]?.lastSeen).toBeGreaterThanOrEqual(patterns[0]?.firstSeen ?? 0)
  })

  it('过滤模式 — getPatterns 支持 type 和 minConfidence 过滤', () => {
    Growth.recordPattern({
      type: 'preference',
      description: '模式1',
      confidence: 0.9,
      context: 'ctx1',
    })

    Growth.recordPattern({
      type: 'workflow',
      description: '模式2',
      confidence: 0.7,
      context: 'ctx2',
    })

    Growth.recordPattern({
      type: 'tool_pattern',
      description: '模式3',
      confidence: 0.5,
      context: 'ctx3',
    })

    const allPatterns = Growth.getPatterns()
    expect(allPatterns).toHaveLength(3)

    const preferencePatterns = Growth.getPatterns({ type: 'preference' })
    expect(preferencePatterns).toHaveLength(1)
    expect(preferencePatterns[0]?.type).toBe('preference')

    const highConfidence = Growth.getPatterns({ minConfidence: 0.8 })
    expect(highConfidence).toHaveLength(1)
    expect(highConfidence[0]?.confidence).toBe(0.9)

    const filtered = Growth.getPatterns({ type: 'workflow', minConfidence: 0.6 })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.type).toBe('workflow')
  })

  it('不达阈值无建议 — occurrences < 3 时 suggestEvolutions 返回空', () => {
    Growth.recordPattern({
      type: 'preference',
      description: '模式1',
      confidence: 0.9,
      context: 'ctx1',
    })

    Growth.recordPattern({
      type: 'preference',
      description: '模式1',
      confidence: 0.9,
      context: 'ctx1',
    })

    const suggestions = Growth.suggestEvolutions()
    expect(suggestions).toHaveLength(0)
  })

  it('达阈值生成建议 — occurrences >= 3 + confidence > 0.7 时有建议', () => {
    const patternId = Growth.recordPattern({
      type: 'preference',
      description: '喜欢使用 TypeScript',
      confidence: 0.9,
      context: '在多个项目中观察到',
    })

    Growth.recordPattern({
      type: 'preference',
      description: '喜欢使用 TypeScript',
      confidence: 0.85,
      context: '再次观察',
    })

    Growth.recordPattern({
      type: 'preference',
      description: '喜欢使用 TypeScript',
      confidence: 0.88,
      context: '第三次观察',
    })

    const suggestions = Growth.suggestEvolutions()
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.patternId).toBe(patternId)
    expect(suggestions[0]?.type).toBe('new_skill')
    expect(suggestions[0]?.title).toBeDefined()
    expect(suggestions[0]?.description).toBeDefined()
    expect(suggestions[0]?.preview).toBeDefined()
    expect(suggestions[0]?.confidence).toBeGreaterThan(0.7)
  })

  it('采纳生成 Skill — adoptEvolution 返回 markdown skill 内容', () => {
    const patternId = Growth.recordPattern({
      type: 'coding_style',
      description: '使用 2 空格缩进',
      confidence: 0.95,
      context: '在所有项目中一致使用',
    })

    Growth.recordPattern({
      type: 'coding_style',
      description: '使用 2 空格缩进',
      confidence: 0.95,
      context: '再次观察',
    })

    Growth.recordPattern({
      type: 'coding_style',
      description: '使用 2 空格缩进',
      confidence: 0.95,
      context: '第三次观察',
    })

    const skillContent = Growth.adoptEvolution(patternId, 'typescript-style-guide')

    expect(skillContent).toBeDefined()
    expect(typeof skillContent).toBe('string')
    expect(skillContent).toContain('---')
    expect(skillContent).toContain('name: typescript-style-guide')
    expect(skillContent).toContain('description: 使用 2 空格缩进')
    expect(skillContent).toContain('auto: true')
    expect(skillContent).toContain('在所有项目中一致使用')

    const patterns = Growth.getPatterns()
    const adopted = patterns.find((p: Growth.PatternEntry) => p.id === patternId)
    expect(adopted?.adoptedAsSkill).toBe('typescript-style-guide')
  })

  it('忽略后不再建议 — ignorePattern 后 suggestEvolutions 不含该模式', () => {
    const patternId = Growth.recordPattern({
      type: 'preference',
      description: '模式1',
      confidence: 0.9,
      context: 'ctx1',
    })

    Growth.recordPattern({
      type: 'preference',
      description: '模式1',
      confidence: 0.9,
      context: 'ctx1',
    })

    Growth.recordPattern({
      type: 'preference',
      description: '模式1',
      confidence: 0.9,
      context: 'ctx1',
    })

    let suggestions = Growth.suggestEvolutions()
    expect(suggestions).toHaveLength(1)

    Growth.ignorePattern(patternId)

    suggestions = Growth.suggestEvolutions()
    expect(suggestions).toHaveLength(0)

    const patterns = Growth.getPatterns()
    const ignored = patterns.find((p: Growth.PatternEntry) => p.id === patternId)
    expect(ignored?.ignored).toBe(true)
  })

  it('重置 — reset 后 getPatterns 返回空', () => {
    Growth.recordPattern({
      type: 'preference',
      description: '模式1',
      confidence: 0.9,
      context: 'ctx1',
    })

    Growth.recordPattern({
      type: 'workflow',
      description: '模式2',
      confidence: 0.8,
      context: 'ctx2',
    })

    expect(Growth.getPatterns()).toHaveLength(2)

    Growth.reset()

    expect(Growth.getPatterns()).toHaveLength(0)
  })
})
