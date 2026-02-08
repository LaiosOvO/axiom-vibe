import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

let baseDir = ''

export namespace Storage {
  export class StorageNotFoundError extends Error {
    constructor(key: string[]) {
      super(`Storage key not found: ${key.join('/')}`)
      this.name = 'StorageNotFoundError'
    }
  }

  export function init(dir: string): void {
    baseDir = dir
  }

  export function reset(): void {
    baseDir = ''
  }

  function keyToPath(key: string[]): string {
    return `${join(baseDir, ...key)}.json`
  }

  export async function write<T>(key: string[], data: T): Promise<void> {
    const filePath = keyToPath(key)
    const dir = dirname(filePath)

    await mkdir(dir, { recursive: true })
    const json = JSON.stringify(data, null, 2)
    await writeFile(filePath, json, 'utf-8')
  }

  export async function read<T>(key: string[]): Promise<T> {
    const filePath = keyToPath(key)

    try {
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as T
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageNotFoundError(key)
      }
      throw error
    }
  }

  export async function remove(key: string[]): Promise<void> {
    const filePath = keyToPath(key)

    try {
      await unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return
      }
      throw error
    }
  }

  export async function exists(key: string[]): Promise<boolean> {
    const filePath = keyToPath(key)

    try {
      await stat(filePath)
      return true
    } catch {
      return false
    }
  }

  export async function list(prefix: string[]): Promise<string[][]> {
    const dirPath = join(baseDir, ...prefix)
    const results: string[][] = []

    async function scan(currentPath: string, currentPrefix: string[]): Promise<void> {
      try {
        const entries = await readdir(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.isDirectory()) {
            await scan(join(currentPath, entry.name), [...currentPrefix, entry.name])
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            const keyPart = entry.name.slice(0, -5)
            results.push([...currentPrefix, keyPart])
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return
        }
        throw error
      }
    }

    await scan(dirPath, prefix)
    return results
  }
}
