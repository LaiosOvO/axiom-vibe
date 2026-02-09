/// <reference types="solid-js" />
import { type ParentComponent, createContext, useContext } from 'solid-js'
import { createSignal } from 'solid-js'

// 路由类型定义
export type Route = { type: 'home' } | { type: 'session'; sessionId: string }

// 路由上下文类型
interface RouteContextValue {
  route: () => Route
  navigate: (route: Route) => void
}

// 创建上下文
const RouteContext = createContext<RouteContextValue>()

// 路由 Provider
export const RouteProvider: ParentComponent = (props) => {
  const [route, setRoute] = createSignal<Route>({ type: 'home' })

  const value: RouteContextValue = {
    route,
    navigate: (newRoute) => setRoute(newRoute),
  }

  return <RouteContext.Provider value={value}>{props.children}</RouteContext.Provider>
}

// 使用路由的 Hook
export function useRoute() {
  const context = useContext(RouteContext)
  if (!context) {
    throw new Error('useRoute 必须在 RouteProvider 内使用')
  }
  return context
}
