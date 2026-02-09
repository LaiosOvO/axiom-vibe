import { describe, expect, it } from 'bun:test'
import { Permission } from '../src/permission'

describe('Permission.evaluate', () => {
  it('should allow when tool matches and action is allow', () => {
    const rules: Permission.PermissionRule[] = [{ tool: 'read', action: 'allow' }]

    const result = Permission.evaluate(rules, 'read')
    expect(result).toBe('allow')
  })

  it('should deny when tool matches and action is deny', () => {
    const rules: Permission.PermissionRule[] = [{ tool: 'write', action: 'deny' }]

    const result = Permission.evaluate(rules, 'write')
    expect(result).toBe('deny')
  })

  it('should ask when tool matches and action is ask', () => {
    const rules: Permission.PermissionRule[] = [{ tool: 'bash', action: 'ask' }]

    const result = Permission.evaluate(rules, 'bash')
    expect(result).toBe('ask')
  })

  it('should use wildcard * to match all tools', () => {
    const rules: Permission.PermissionRule[] = [{ tool: '*', action: 'allow' }]

    expect(Permission.evaluate(rules, 'read')).toBe('allow')
    expect(Permission.evaluate(rules, 'write')).toBe('allow')
    expect(Permission.evaluate(rules, 'bash')).toBe('allow')
  })

  it('should apply last match wins rule', () => {
    const rules: Permission.PermissionRule[] = [
      { tool: '*', action: 'allow' },
      { tool: 'write', action: 'deny' },
    ]

    expect(Permission.evaluate(rules, 'read')).toBe('allow')
    expect(Permission.evaluate(rules, 'write')).toBe('deny')
  })

  it('should apply last match wins with multiple rules', () => {
    const rules: Permission.PermissionRule[] = [
      { tool: 'bash', action: 'deny' },
      { tool: 'bash', action: 'ask' },
      { tool: 'bash', action: 'allow' },
    ]

    const result = Permission.evaluate(rules, 'bash')
    expect(result).toBe('allow')
  })

  it('should default to deny when no rules match', () => {
    const rules: Permission.PermissionRule[] = [{ tool: 'read', action: 'allow' }]

    const result = Permission.evaluate(rules, 'write')
    expect(result).toBe('deny')
  })

  it('should match pattern with filePath', () => {
    const rules: Permission.PermissionRule[] = [
      { tool: 'write', pattern: '*.md', action: 'allow' },
      { tool: 'write', action: 'deny' },
    ]

    expect(Permission.evaluate(rules, 'write', { filePath: 'README.md' })).toBe('allow')
    expect(Permission.evaluate(rules, 'write', { filePath: 'index.ts' })).toBe('deny')
  })

  it('should match pattern with path', () => {
    const rules: Permission.PermissionRule[] = [
      { tool: 'edit', pattern: 'src/**/*.ts', action: 'allow' },
      { tool: 'edit', action: 'deny' },
    ]

    expect(Permission.evaluate(rules, 'edit', { path: 'src/index.ts' })).toBe('allow')
    expect(Permission.evaluate(rules, 'edit', { path: 'src/util/helper.ts' })).toBe('allow')
    expect(Permission.evaluate(rules, 'edit', { path: 'test/foo.ts' })).toBe('deny')
  })

  it('should match complex glob patterns', () => {
    const rules: Permission.PermissionRule[] = [
      { tool: 'bash', pattern: 'rm -rf *', action: 'deny' },
      { tool: 'bash', action: 'ask' },
    ]

    expect(Permission.evaluate(rules, 'bash', { command: 'rm -rf /' })).toBe('deny')
    expect(Permission.evaluate(rules, 'bash', { command: 'ls -la' })).toBe('ask')
  })

  it('should handle opencode plan agent rules', () => {
    const rules: Permission.PermissionRule[] = [
      { tool: 'write', pattern: '*.md', action: 'allow' },
      { tool: 'write', action: 'deny' },
      { tool: 'edit', pattern: '*.md', action: 'allow' },
      { tool: 'edit', action: 'deny' },
      { tool: '*', action: 'allow' },
    ]

    expect(Permission.evaluate(rules, 'write', { filePath: 'plan.md' })).toBe('allow')
    expect(Permission.evaluate(rules, 'write', { filePath: 'index.ts' })).toBe('deny')
    expect(Permission.evaluate(rules, 'edit', { filePath: 'README.md' })).toBe('allow')
    expect(Permission.evaluate(rules, 'edit', { filePath: 'src/index.ts' })).toBe('deny')
    expect(Permission.evaluate(rules, 'read', { filePath: 'any.ts' })).toBe('allow')
  })
})

describe('Permission.merge', () => {
  it('should merge base and override rules', () => {
    const base: Permission.PermissionRule[] = [{ tool: '*', action: 'allow' }]

    const override: Permission.PermissionRule[] = [{ tool: 'bash', action: 'ask' }]

    const merged = Permission.merge(base, override)
    expect(merged.length).toBe(2)
    expect(merged).toContainEqual({ tool: '*', action: 'allow' })
    expect(merged).toContainEqual({ tool: 'bash', action: 'ask' })
  })

  it('should preserve order for last match wins', () => {
    const base: Permission.PermissionRule[] = [{ tool: 'write', action: 'allow' }]

    const override: Permission.PermissionRule[] = [{ tool: 'write', action: 'deny' }]

    const merged = Permission.merge(base, override)
    expect(Permission.evaluate(merged, 'write')).toBe('deny')
  })
})

describe('Permission.checkDoomLoop', () => {
  it('should detect doom loop with 3+ identical calls', () => {
    const history: Permission.ToolCallRecord[] = [
      { toolName: 'bash', args: { command: 'ls' }, timestamp: Date.now() },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: Date.now() },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: Date.now() },
    ]

    const result = Permission.checkDoomLoop(history, 'bash', { command: 'ls' })
    expect(result).toBe(true)
  })

  it('should not detect doom loop with less than 3 calls', () => {
    const history: Permission.ToolCallRecord[] = [
      { toolName: 'bash', args: { command: 'ls' }, timestamp: Date.now() },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: Date.now() },
    ]

    const result = Permission.checkDoomLoop(history, 'bash', { command: 'ls' })
    expect(result).toBe(false)
  })

  it('should not detect doom loop with different args', () => {
    const history: Permission.ToolCallRecord[] = [
      { toolName: 'bash', args: { command: 'ls' }, timestamp: Date.now() },
      { toolName: 'bash', args: { command: 'pwd' }, timestamp: Date.now() },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: Date.now() },
    ]

    const result = Permission.checkDoomLoop(history, 'bash', { command: 'ls' })
    expect(result).toBe(false)
  })

  it('should not detect doom loop with different tools', () => {
    const history: Permission.ToolCallRecord[] = [
      { toolName: 'read', args: { path: 'a.ts' }, timestamp: Date.now() },
      { toolName: 'write', args: { path: 'a.ts' }, timestamp: Date.now() },
      { toolName: 'read', args: { path: 'a.ts' }, timestamp: Date.now() },
    ]

    const result = Permission.checkDoomLoop(history, 'read', { path: 'a.ts' })
    expect(result).toBe(false)
  })

  it('should ignore old calls outside time window', () => {
    const now = Date.now()
    const history: Permission.ToolCallRecord[] = [
      { toolName: 'bash', args: { command: 'ls' }, timestamp: now - 120000 },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: now - 5000 },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: now },
    ]

    const result = Permission.checkDoomLoop(history, 'bash', { command: 'ls' })
    expect(result).toBe(false)
  })

  it('should detect doom loop within time window', () => {
    const now = Date.now()
    const history: Permission.ToolCallRecord[] = [
      { toolName: 'bash', args: { command: 'ls' }, timestamp: now - 30000 },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: now - 20000 },
      { toolName: 'bash', args: { command: 'ls' }, timestamp: now },
    ]

    const result = Permission.checkDoomLoop(history, 'bash', { command: 'ls' })
    expect(result).toBe(true)
  })
})
