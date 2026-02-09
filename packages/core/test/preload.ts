import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 测试隔离工具 - 提供临时目录和环境清理功能
 */

/**
 * 创建临时测试目录
 * @returns 临时目录路径
 */
export async function createTempDir(): Promise<string> {
  const prefix = join(tmpdir(), 'axiom-test-')
  return await mkdtemp(prefix)
}

/**
 * 清理临时目录
 * @param path 要清理的目录路径
 */
export async function cleanupTempDir(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true })
  } catch (error) {
    // 忽略清理错误
  }
}

/**
 * 保存原始环境变量并清除敏感 API Keys
 * 用于确保测试不会意外调用真实 LLM API
 */
export function clearApiKeys(): Record<string, string | undefined> {
  const original: Record<string, string | undefined> = {}
  const apiKeys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'GROQ_API_KEY',
    'MISTRAL_API_KEY',
    'XAI_API_KEY',
    'DEEPSEEK_API_KEY',
    'TOGETHER_API_KEY',
    'FIREWORKS_API_KEY',
    'OPENROUTER_API_KEY',
  ]

  for (const key of apiKeys) {
    original[key] = process.env[key]
    delete process.env[key]
  }

  return original
}

/**
 * 恢复环境变量
 * @param original 原始环境变量
 */
export function restoreApiKeys(original: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(original)) {
    if (value !== undefined) {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }
}

/**
 * 创建测试用的临时文件
 * @param dir 目录路径
 * @param filename 文件名
 * @param content 文件内容
 */
export async function createTestFile(
  dir: string,
  filename: string,
  content: string,
): Promise<string> {
  const filepath = join(dir, filename)
  await Bun.write(filepath, content)
  return filepath
}
