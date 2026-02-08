import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Storage } from '../src/storage'

describe('Storage', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'axiom-storage-test-'))
    Storage.reset()
    Storage.init(tempDir)
  })

  afterEach(async () => {
    Storage.reset()
    await rm(tempDir, { recursive: true, force: true })
  })

  test('写入和读取数据', async () => {
    const testData = { name: 'Alice', age: 30 }
    const key = ['user', 'alice']

    await Storage.write(key, testData)
    const result = await Storage.read(key)

    expect(result).toEqual(testData)
  })

  test('删除数据后读取抛出错误', async () => {
    const testData = { value: 42 }
    const key = ['data', 'test']

    await Storage.write(key, testData)
    await Storage.remove(key)

    await expect(Storage.read(key)).rejects.toThrow(Storage.StorageNotFoundError)
  })

  test('读取不存在的 key 抛出 StorageNotFoundError', async () => {
    const key = ['nonexistent', 'key']

    await expect(Storage.read(key)).rejects.toThrow(Storage.StorageNotFoundError)
  })

  test('列出前缀下的键', async () => {
    await Storage.write(['session', 'abc123'], { data: 1 })
    await Storage.write(['session', 'def456'], { data: 2 })
    await Storage.write(['session', 'ghi789'], { data: 3 })
    await Storage.write(['user', 'alice'], { data: 4 })

    const sessionKeys = await Storage.list(['session'])

    expect(sessionKeys).toHaveLength(3)
    expect(sessionKeys).toContainEqual(['session', 'abc123'])
    expect(sessionKeys).toContainEqual(['session', 'def456'])
    expect(sessionKeys).toContainEqual(['session', 'ghi789'])
  })

  test('检查存在性', async () => {
    const key = ['test', 'exists']

    expect(await Storage.exists(key)).toBe(false)

    await Storage.write(key, { value: 'test' })
    expect(await Storage.exists(key)).toBe(true)

    await Storage.remove(key)
    expect(await Storage.exists(key)).toBe(false)
  })
})
