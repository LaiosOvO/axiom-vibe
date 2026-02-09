import { describe, expect, it } from 'bun:test'
import { Agent } from '../src/agent'
import { AgentRunner } from '../src/agent/runner'

describe('AgentRunner', () => {
  it('listAvailable 返回 primary agents', () => {
    const available = AgentRunner.listAvailable()
    expect(available.length).toBeGreaterThan(0)
    // build 和 plan 是 primary
    const ids = available.map((a) => a.id)
    expect(ids).toContain('build')
    expect(ids).toContain('plan')
    // explore 是 subagent，不应该在列表中
    expect(ids).not.toContain('explore')
    // title 和 summary 是 hidden，不应该在列表中
    expect(ids).not.toContain('title')
    expect(ids).not.toContain('summary')
  })

  it('listAvailable 返回的 agent 都是 primary mode', () => {
    const available = AgentRunner.listAvailable()
    for (const agent of available) {
      expect(agent.mode).toBe('primary')
    }
  })

  it('Agent.getAgentDef 返回 build agent', () => {
    const agent = Agent.getAgentDef('build')
    expect(agent).toBeDefined()
    expect(agent!.id).toBe('build')
    expect(agent!.tools.length).toBeGreaterThan(0)
  })

  it('Agent.getAgentDef 返回 undefined 对未知 agent', () => {
    const agent = Agent.getAgentDef('nonexistent')
    expect(agent).toBeUndefined()
  })
})
