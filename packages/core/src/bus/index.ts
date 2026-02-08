import type { z } from 'zod'

type BusEventDef<T> = {
  name: string
  // biome-ignore lint/suspicious/noExplicitAny: ZodType 需要这些泛型参数
  schema: z.ZodType<T, any, any>
}

type Handler<T> = (data: T) => void

export namespace BusEvent {
  export function define<S extends z.ZodType>(name: string, schema: S): BusEventDef<z.infer<S>> {
    return { name, schema } as BusEventDef<z.infer<S>>
  }
}

// biome-ignore lint/suspicious/noExplicitAny: 需要存储不同类型的 handler
const subscribers = new Map<string, Set<Handler<any>>>()

export namespace Bus {
  export function subscribe<T>(event: BusEventDef<T>, handler: Handler<T>): () => void {
    if (!subscribers.has(event.name)) {
      subscribers.set(event.name, new Set())
    }
    const handlers = subscribers.get(event.name)
    if (handlers) {
      handlers.add(handler)
    }
    return () => {
      const handlers = subscribers.get(event.name)
      if (handlers) {
        handlers.delete(handler)
      }
    }
  }

  export function publish<T>(event: BusEventDef<T>, data: T): void {
    event.schema.parse(data)
    const handlers = subscribers.get(event.name)
    if (handlers) {
      for (const handler of handlers) {
        handler(data)
      }
    }
  }

  export function subscriberCount<T>(event: BusEventDef<T>): number {
    return subscribers.get(event.name)?.size ?? 0
  }

  export function reset(): void {
    subscribers.clear()
  }
}
