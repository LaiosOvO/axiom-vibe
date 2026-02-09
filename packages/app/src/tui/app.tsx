import { render, useKeyboard, useTerminalDimensions } from '@opentui/solid'
import { Match, Switch } from 'solid-js'
import { RouteProvider, useRoute } from './context/route'
import { Home } from './routes/home'
import { SessionView } from './routes/session'

// TUI 入口函数
export function tui(input: { onExit?: () => Promise<void> }) {
  return new Promise<void>((resolve) => {
    render(
      () => (
        <RouteProvider>
          <App
            onExit={async () => {
              await input.onExit?.()
              resolve()
            }}
          />
        </RouteProvider>
      ),
      {
        exitOnCtrlC: false,
      },
    )
  })
}

// 主应用组件
function App(props: { onExit: () => Promise<void> }) {
  const { route } = useRoute()
  const dimensions = useTerminalDimensions()

  return (
    <box width={dimensions().width} height={dimensions().height} backgroundColor="#0a0a0a">
      <Switch>
        <Match when={route().type === 'home'}>
          <Home onExit={props.onExit} />
        </Match>
        <Match when={route().type === 'session'}>
          <SessionView onExit={props.onExit} />
        </Match>
      </Switch>
    </box>
  )
}
