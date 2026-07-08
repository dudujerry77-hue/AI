export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export class EventBus {
  private readonly listeners = new Map<string, Set<EventHandler>>();

  subscribe<T = unknown>(topic: string, handler: EventHandler<T>): () => void {
    const handlers = this.listeners.get(topic) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.listeners.set(topic, handlers);

    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(topic);
      }
    };
  }

  async publish<T = unknown>(topic: string, payload: T): Promise<void> {
    const handlers = this.listeners.get(topic);
    if (!handlers || handlers.size === 0) {
      return;
    }

    await Promise.all(Array.from(handlers).map((handler) => Promise.resolve(handler(payload))));
  }
}
