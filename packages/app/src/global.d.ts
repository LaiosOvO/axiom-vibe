import type { JSX as SolidJSX } from 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      box: {
        children?: import('solid-js').JSX.Element
        width?: number
        height?: number
        flexDirection?: 'row' | 'column'
        gap?: number
        padding?: number
        paddingX?: number
        paddingY?: number
        margin?: number
        marginX?: number
        marginY?: number
        marginTop?: number
        marginBottom?: number
        marginLeft?: number
        marginRight?: number
        backgroundColor?: string
        onMouseUp?: () => void
      }
      text: {
        children?: import('solid-js').JSX.Element
        fg?: string
        bg?: string
        bold?: boolean
        italic?: boolean
        underline?: boolean
        strikethrough?: boolean
        marginLeft?: number
        marginRight?: number
        marginTop?: number
        marginBottom?: number
      }
      scrollbox: {
        children?: import('solid-js').JSX.Element
        height?: number
        width?: number
      }
    }
  }
}
