import { beforeEach, describe, expect, it } from 'bun:test'
import { McpServer } from '../src/mcp'

describe('McpServer', () => {
  beforeEach(() => {
    McpServer.reset()
  })

  it('注册本地 MCP 后 get 有值', () => {
    const config = {
      type: 'local' as const,
      command: ['node', 'server.js'],
    }
    McpServer.register('mem', config)
    const info = McpServer.get('mem')
    expect(info).toBeDefined()
    expect(info?.name).toBe('mem')
    expect(info?.config.type).toBe('local')
    expect(info?.status).toBe('disconnected')
    expect(info?.toolCount).toBe(0)
  })

  it('注册远程 MCP 后 get 有值', () => {
    const config = {
      type: 'remote' as const,
      url: 'http://localhost:3000',
    }
    McpServer.register('api', config)
    const info = McpServer.get('api')
    expect(info).toBeDefined()
    expect(info?.name).toBe('api')
    expect(info?.config.type).toBe('remote')
    expect(info?.status).toBe('disconnected')
    expect(info?.toolCount).toBe(0)
  })

  it('列出全部 MCP', () => {
    McpServer.register('mem', {
      type: 'local' as const,
      command: ['node', 'server.js'],
    })
    McpServer.register('api', {
      type: 'remote' as const,
      url: 'http://localhost:3000',
    })
    const list = McpServer.list()
    expect(list).toHaveLength(2)
    expect(list.map((i) => i.name)).toContain('mem')
    expect(list.map((i) => i.name)).toContain('api')
  })

  it('更新状态后 status 变化', () => {
    McpServer.register('mem', {
      type: 'local' as const,
      command: ['node', 'server.js'],
    })
    McpServer.updateStatus('mem', 'connecting')
    let info = McpServer.get('mem')
    expect(info?.status).toBe('connecting')

    McpServer.updateStatus('mem', 'connected')
    info = McpServer.get('mem')
    expect(info?.status).toBe('connected')
  })

  it('错误状态包含 error 字段', () => {
    McpServer.register('mem', {
      type: 'local' as const,
      command: ['node', 'server.js'],
    })
    McpServer.updateStatus('mem', 'error', 'Connection failed')
    const info = McpServer.get('mem')
    expect(info?.status).toBe('error')
    expect(info?.error).toBe('Connection failed')
  })

  it('删除后 get 返回 undefined', () => {
    McpServer.register('mem', {
      type: 'local' as const,
      command: ['node', 'server.js'],
    })
    expect(McpServer.get('mem')).toBeDefined()
    McpServer.remove('mem')
    expect(McpServer.get('mem')).toBeUndefined()
  })

  it('Schema 验证 discriminatedUnion 正确区分 local/remote', () => {
    const localConfig = {
      type: 'local' as const,
      command: ['node', 'server.js'],
    }
    const remoteConfig = {
      type: 'remote' as const,
      url: 'http://localhost:3000',
    }

    McpServer.register('local-mcp', localConfig)
    McpServer.register('remote-mcp', remoteConfig)

    const localInfo = McpServer.get('local-mcp')
    const remoteInfo = McpServer.get('remote-mcp')

    expect(localInfo?.config.type).toBe('local')
    expect('command' in localInfo!.config).toBe(true)
    expect('url' in localInfo!.config).toBe(false)

    expect(remoteInfo?.config.type).toBe('remote')
    expect('url' in remoteInfo!.config).toBe(true)
    expect('command' in remoteInfo!.config).toBe(false)
  })
})
