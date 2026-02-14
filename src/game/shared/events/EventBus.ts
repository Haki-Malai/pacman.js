type Listener<T> = (_payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const existing = this.listeners[event];
    if (existing) {
      existing.add(listener);
      return;
    }

    this.listeners[event] = new Set<Listener<Events[K]>>([listener]);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((listener) => {
      listener(payload);
    });
  }

  clear(): void {
    (Object.keys(this.listeners) as Array<keyof Events>).forEach((event) => {
      this.listeners[event]?.clear();
    });
  }
}
