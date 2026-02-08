// biome-ignore lint/style/useImportType: z 在 schema 定义中作为值使用
import { z } from 'zod'

export namespace Growth {
  export const PatternEntry = z.object({
    id: z.string(),
    type: z.enum(['preference', 'workflow', 'tool_pattern', 'coding_style']),
    description: z.string(),
    occurrences: z.number(),
    confidence: z.number().min(0).max(1),
    context: z.string(),
    firstSeen: z.number(),
    lastSeen: z.number(),
    adoptedAsSkill: z.string().optional(),
    ignored: z.boolean().default(false),
  })

  export type PatternEntry = z.infer<typeof PatternEntry>

  export const EvolutionSuggestion = z.object({
    patternId: z.string(),
    type: z.enum(['new_skill', 'update_prompt', 'new_shortcut']),
    title: z.string(),
    description: z.string(),
    preview: z.string(),
    confidence: z.number(),
  })

  export type EvolutionSuggestion = z.infer<typeof EvolutionSuggestion>

  const registry = new Map<string, PatternEntry>()
  const descriptionIndex = new Map<string, string>()

  function generatePatternId(): string {
    return `pat_${crypto.randomUUID().slice(0, 8)}`
  }

  export function recordPattern(pattern: {
    type: PatternEntry['type']
    description: string
    confidence: number
    context: string
  }): string {
    const now = Date.now()

    const existingId = descriptionIndex.get(pattern.description)
    if (existingId) {
      const existing = registry.get(existingId)
      if (existing) {
        existing.occurrences += 1
        existing.lastSeen = now
        existing.confidence = pattern.confidence
        return existingId
      }
    }

    const id = generatePatternId()
    const entry: PatternEntry = {
      id,
      type: pattern.type,
      description: pattern.description,
      occurrences: 1,
      confidence: pattern.confidence,
      context: pattern.context,
      firstSeen: now,
      lastSeen: now,
      ignored: false,
    }

    registry.set(id, entry)
    descriptionIndex.set(pattern.description, id)
    return id
  }

  export function getPatterns(filter?: {
    type?: PatternEntry['type']
    minConfidence?: number
  }): PatternEntry[] {
    const patterns = Array.from(registry.values())

    return patterns.filter((p) => {
      if (filter?.type && p.type !== filter.type) {
        return false
      }
      if (filter?.minConfidence && p.confidence < filter.minConfidence) {
        return false
      }
      return true
    })
  }

  export function suggestEvolutions(): EvolutionSuggestion[] {
    const patterns = Array.from(registry.values())

    return patterns
      .filter((p) => p.occurrences >= 3 && p.confidence > 0.7 && !p.ignored)
      .map((p) => ({
        patternId: p.id,
        type: 'new_skill' as const,
        title: `从模式生成 Skill: ${p.description}`,
        description: p.description,
        preview: p.context,
        confidence: p.confidence,
      }))
  }

  export function adoptEvolution(patternId: string, skillName: string): string {
    const pattern = registry.get(patternId)
    if (!pattern) {
      throw new Error(`模式 ${patternId} 不存在`)
    }

    pattern.adoptedAsSkill = skillName

    const skillContent = `---
name: ${skillName}
description: ${pattern.description}
auto: true
---

${pattern.context}`

    return skillContent
  }

  export function ignorePattern(patternId: string): void {
    const pattern = registry.get(patternId)
    if (pattern) {
      pattern.ignored = true
    }
  }

  export function reset(): void {
    registry.clear()
    descriptionIndex.clear()
  }
}
