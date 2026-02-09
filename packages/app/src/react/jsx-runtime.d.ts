import type * as SolidJSX from 'solid-js'

declare global {
  namespace JSX {
    interface IntrinsicElements extends SolidJSX.JSX.IntrinsicElements {}
  }
}

export * from 'solid-js/jsx-runtime'
