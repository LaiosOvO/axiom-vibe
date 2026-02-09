import { minimatch } from 'minimatch'

export namespace Permission {
  /**
   * 权限动作类型
   * - allow: 允许
   * - deny: 拒绝
   * - ask: 需要用户确认
   */
  export type Action = 'allow' | 'deny' | 'ask'

  /**
   * 权限规则
   */
  export interface PermissionRule {
    /** 工具名，* 表示所有工具 */
    tool: string
    /** 可选的参数匹配模式（如文件路径 glob） */
    pattern?: string
    /** 权限动作 */
    action: Action
  }

  /**
   * 工具调用记录（用于 doom loop 检测）
   */
  export interface ToolCallRecord {
    toolName: string
    args: Record<string, unknown>
    timestamp: number
  }

  /**
   * 评估权限（last match wins 原则）
   * @param rules 权限规则列表
   * @param toolName 工具名
   * @param args 工具参数
   * @returns 最终的权限动作
   */
  export function evaluate(
    rules: PermissionRule[],
    toolName: string,
    args?: Record<string, unknown>,
  ): Action {
    let result: Action = 'deny'
    let hasSpecificToolRule = false

    for (const rule of rules) {
      if (rule.tool !== '*' && rule.tool !== toolName) {
        continue
      }

      if (rule.pattern) {
        if (!args || !matchPattern(rule.pattern, args)) {
          continue
        }
        if (rule.tool === toolName) {
          return rule.action
        }
      }

      if (rule.tool === toolName) {
        hasSpecificToolRule = true
        result = rule.action
      } else if (rule.tool === '*' && !hasSpecificToolRule) {
        result = rule.action
      }
    }

    return result
  }

  /**
   * 检查参数是否匹配模式
   * @param pattern glob 模式
   * @param args 工具参数
   * @returns 是否匹配
   */
  function matchPattern(pattern: string, args: Record<string, unknown>): boolean {
    // 提取可能包含路径的参数
    const pathCandidates = [args.filePath, args.path, args.file, args.command].filter(
      (v): v is string => typeof v === 'string',
    )

    if (pathCandidates.length === 0) {
      return false
    }

    // 使用 glob 匹配
    return pathCandidates.some((path) => minimatch(path, pattern))
  }

  /**
   * 合并两组规则（agent 规则 + 用户自定义规则）
   * @param base 基础规则（agent 规则）
   * @param override 覆盖规则（用户自定义）
   * @returns 合并后的规则
   */
  export function merge(base: PermissionRule[], override: PermissionRule[]): PermissionRule[] {
    return [...base, ...override]
  }

  /**
   * 检测 doom loop（同一工具+参数调用 3 次以上）
   * @param history 调用历史
   * @param toolName 工具名
   * @param args 工具参数
   * @returns 是否检测到 doom loop
   */
  export function checkDoomLoop(
    history: ToolCallRecord[],
    toolName: string,
    args?: Record<string, unknown>,
  ): boolean {
    const threshold = 3
    const timeWindow = 60000 // 60 秒

    const now = Date.now()
    const recentCalls = history.filter(
      (record) =>
        record.toolName === toolName &&
        now - record.timestamp < timeWindow &&
        deepEqual(record.args, args || {}),
    )

    return recentCalls.length >= threshold
  }

  /**
   * 深度比较两个对象是否相等
   */
  function deepEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()

    if (keysA.length !== keysB.length) {
      return false
    }

    for (let i = 0; i < keysA.length; i++) {
      if (keysA[i] !== keysB[i]) {
        return false
      }

      const key = keysA[i] as string
      const valA = a[key]
      const valB = b[key]

      if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
        if (!deepEqual(valA as Record<string, unknown>, valB as Record<string, unknown>)) {
          return false
        }
      } else if (valA !== valB) {
        return false
      }
    }

    return true
  }
}
