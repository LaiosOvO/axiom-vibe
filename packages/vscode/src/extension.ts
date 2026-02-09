import * as vscode from 'vscode'
import { VscodePlugin } from './index.js'

/** 全局状态 */
let state: VscodePlugin.ExtensionState
/** WebView 面板实例 */
let panel: vscode.WebviewPanel | undefined

/**
 * 扩展激活入口
 * 当用户首次执行命令或触发激活事件时调用
 */
export function activate(context: vscode.ExtensionContext) {
  // 初始化状态
  state = VscodePlugin.getInitialState({
    serverPort: vscode.workspace.getConfiguration('axiom').get('serverPort'),
    autoStart: vscode.workspace.getConfiguration('axiom').get('autoStart'),
  })

  // 注册所有命令
  const commands = VscodePlugin.getCommands()
  commands.forEach((cmd) => {
    const disposable = vscode.commands.registerCommand(cmd.id, () => {
      handleCommandExecution(cmd.id)
    })
    context.subscriptions.push(disposable)
  })

  // 监听配置变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration('axiom')) {
        state.config = VscodePlugin.Config.parse({
          serverPort: vscode.workspace.getConfiguration('axiom').get('serverPort'),
          autoStart: vscode.workspace.getConfiguration('axiom').get('autoStart'),
        })
        state.serverUrl = `http://127.0.0.1:${state.config.serverPort}`
      }
    }),
  )

  console.log('Axiom 扩展已激活')
}

/**
 * 扩展停用入口
 * 当扩展被禁用或 VSCode 退出时调用
 */
export function deactivate() {
  // 清理面板
  if (panel) {
    panel.dispose()
    panel = undefined
  }
  console.log('Axiom 扩展已停用')
}

/**
 * 处理命令执行
 * @param commandId 命令 ID
 */
function handleCommandExecution(commandId: string) {
  // 更新状态
  const newState = VscodePlugin.handleCommand(state, commandId)
  const panelStateChanged = newState.panelState !== state.panelState
  state = newState

  // 根据状态变化处理面板
  if (panelStateChanged) {
    if (state.panelState === 'visible') {
      showPanel()
    } else if (state.panelState === 'hidden') {
      hidePanel()
    }
  }

  // 特殊命令处理
  if (commandId === 'axiom.newSession') {
    if (panel) {
      // 通过 postMessage 通知 WebView 创建新会话
      panel.webview.postMessage({ type: 'newSession' })
    }
  } else if (commandId === 'axiom.sendMessage') {
    if (panel) {
      // 打开输入框让用户输入消息
      vscode.window.showInputBox({ prompt: '输入消息' }).then((message: string | undefined) => {
        if (message && panel) {
          panel.webview.postMessage({ type: 'sendMessage', message })
        }
      })
    }
  }
}

/**
 * 显示 WebView 面板
 */
function showPanel() {
  const columnToShowIn = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined

  if (panel) {
    // 如果面板已存在，直接显示
    panel.reveal(columnToShowIn)
  } else {
    // 创建新面板
    panel = vscode.window.createWebviewPanel(
      'axiomChat', // viewType
      state.config.panelTitle, // 标题
      columnToShowIn || vscode.ViewColumn.One, // 显示位置
      {
        // WebView 选项
        enableScripts: true, // 允许运行 JavaScript
        retainContextWhenHidden: true, // 隐藏时保留上下文
        localResourceRoots: [], // 限制可访问的本地资源
      },
    )

    // 设置 HTML 内容
    updatePanelContent()

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      panel = undefined
      state.panelState = 'hidden'
    })

    // 监听来自 WebView 的消息
    panel.webview.onDidReceiveMessage((message: unknown) => {
      handleWebviewMessage(message)
    })
  }
}

/**
 * 隐藏 WebView 面板
 */
function hidePanel() {
  if (panel) {
    panel.dispose()
    panel = undefined
  }
}

/**
 * 更新面板内容
 */
function updatePanelContent() {
  if (!panel) return

  // 使用 VscodePlugin 生成 HTML
  const html = VscodePlugin.generateWebViewHtml(state)
  panel.webview.html = enhanceWebviewHtml(html)
}

/**
 * 增强 WebView HTML - 添加消息处理和 SSE 连接
 * @param baseHtml 基础 HTML
 */
function enhanceWebviewHtml(baseHtml: string): string {
  // 在 </body> 前插入 JavaScript 代码
  const script = `
  <script>
    const vscode = acquireVsCodeApi();
    let eventSource;

    // 连接到 Axiom 服务器
    function connectToServer() {
      const serverUrl = '${state.serverUrl}';
      
      // 尝试 SSE 连接
      eventSource = new EventSource(serverUrl + '/events');
      
      eventSource.onopen = () => {
        console.log('已连接到 Axiom 服务器');
        document.querySelector('.status').textContent = '已连接到 Axiom 服务器';
        document.querySelector('#input-area input').disabled = false;
        document.querySelector('#input-area button').disabled = false;
      };
      
      eventSource.onerror = () => {
        console.log('连接失败');
        document.querySelector('.status').textContent = '未连接 - 请启动 Axiom 服务器';
        document.querySelector('#input-area input').disabled = true;
        document.querySelector('#input-area button').disabled = true;
        eventSource.close();
      };
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        addMessage(data.role, data.content);
      };
    }

    // 添加消息到界面
    function addMessage(role, content) {
      const messagesDiv = document.getElementById('messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + role;
      messageDiv.textContent = content;
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // 发送消息
    function sendMessage(message) {
      if (!message.trim()) return;
      
      addMessage('user', message);
      
      // 发送到服务器
      fetch('${state.serverUrl}/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      }).catch(err => {
        console.error('发送失败:', err);
        addMessage('system', '发送失败: ' + err.message);
      });
      
      document.querySelector('#input-area input').value = '';
    }

    // 处理来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'newSession') {
        document.getElementById('messages').innerHTML = '<div class="status">已连接到 Axiom 服务器</div>';
      } else if (message.type === 'sendMessage') {
        sendMessage(message.message);
      }
    });

    // 绑定事件
    document.addEventListener('DOMContentLoaded', () => {
      const input = document.querySelector('#input-area input');
      const button = document.querySelector('#input-area button');
      
      button.addEventListener('click', () => {
        sendMessage(input.value);
      });
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage(input.value);
        }
      });
      
      // 连接服务器
      connectToServer();
    });
  </script>
  `

  return baseHtml.replace('</body>', `${script}</body>`)
}

/**
 * 处理来自 WebView 的消息
 * @param message 消息对象
 */
function handleWebviewMessage(message: unknown) {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    console.log('收到无效消息:', message)
    return
  }

  const msg = message as { type: string; message?: string }
  switch (msg.type) {
    case 'error':
      vscode.window.showErrorMessage(`Axiom 错误: ${msg.message}`)
      break
    case 'info':
      vscode.window.showInformationMessage(msg.message || '')
      break
    default:
      console.log('收到未知消息:', msg)
  }
}
