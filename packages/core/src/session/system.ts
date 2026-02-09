import { Skill } from '../skill'
import { ToolRegistry } from '../tool'

/**
 * SystemPrompt 命名空间 - 构建 LLM 系统提示词
 */
export namespace SystemPrompt {
  /**
   * 构建配置
   */
  export type BuildOptions = {
    /** 模型名称 */
    model?: string
    /** Agent 名称 */
    agent?: string
    /** 工作目录 */
    cwd?: string
    /** 用户自定义 prompt */
    customPrompt?: string
    /** 已加载的 Skill 列表 */
    skills?: Skill.Info[]
  }

  /**
   * 构建完整的系统提示词
   * @param opts 构建配置
   * @returns 系统提示词数组，每个元素是一个独立的段落
   */
  export function build(opts: BuildOptions = {}): string[] {
    const sections: string[] = []

    // 添加核心段落
    sections.push(header())
    sections.push(tools())
    sections.push(rules())

    // 添加项目上下文
    if (opts.cwd) {
      sections.push(context(opts.cwd))
    }

    // 添加 agent 信息
    if (opts.agent) {
      sections.push(`当前 Agent: ${opts.agent}`)
    }

    // 添加模型信息
    if (opts.model) {
      sections.push(`当前模型: ${opts.model}`)
    }

    if (opts.skills && opts.skills.length > 0) {
      sections.push(Skill.formatForPrompt(opts.skills))
    }

    // 添加自定义 prompt
    if (opts.customPrompt) {
      sections.push(opts.customPrompt)
    }

    return sections
  }

  /**
   * Axiom 身份 + 能力说明
   * @returns 核心身份描述
   */
  export function header(): string {
    return `# Axiom - AI 驱动的编码 Agent 平台

你是 Axiom，一个专业的 AI 编程助手，致力于帮助用户高效完成编码任务。

## 核心能力

- **代码理解与生成** - 理解项目结构，生成高质量代码
- **工具使用** - 使用提供的工具完成文件操作、命令执行等任务
- **问题解决** - 分析问题，提供解决方案并实施
- **最佳实践** - 遵循编码规范和设计模式
- **增量开发** - 采用小步迭代的方式，确保每一步都正确可靠`
  }

  /**
   * 可用工具列表（动态从 ToolRegistry 获取）
   * @returns 工具列表描述
   */
  export function tools(): string {
    const toolList = ToolRegistry.list()
    const toolDescriptions = toolList
      .map((tool) => `- **${tool.name}**: ${tool.description}`)
      .join('\n')

    return `## 可用工具

${toolDescriptions}

**工具使用原则**:
- 优先使用工具而不是直接提供代码片段
- 使用 \`read\` 工具阅读文件后再进行修改
- 使用 \`bash\` 工具运行命令和测试
- 使用 \`edit\` 工具进行精确的文本替换`
  }

  /**
   * 行为规则
   * @returns 核心行为准则
   */
  export function rules(): string {
    return `## 行为规则

1. **准确性优先** - 确保代码正确性，仔细检查语法和逻辑
2. **工具优先** - 优先使用提供的工具进行文件操作和命令执行
3. **中文回复** - 使用简体中文回复，解释清楚你的思路和决策
4. **增量修改** - 进行小步修改，避免一次性大量改动
5. **验证结果** - 修改代码后使用工具验证是否正常工作
6. **保持一致** - 遵循项目现有的代码风格和架构规范
7. **安全意识** - 避免执行危险操作，谨慎处理用户数据
8. **主动沟通** - 遇到不确定的情况主动询问用户`
  }

  /**
   * 项目上下文信息
   * @param cwd 工作目录
   * @returns 项目环境描述
   */
  export function context(cwd: string): string {
    const date = new Date().toDateString()
    const platform = process.platform

    return `## 项目上下文

- **工作目录**: ${cwd}
- **运行平台**: ${platform}
- **当前日期**: ${date}

请在此项目上下文中工作，所有文件路径都相对于工作目录。使用 \`read\` 工具了解项目结构，使用 \`bash\` 工具执行命令。`
  }
}
