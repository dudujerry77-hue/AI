export interface MetricsSnapshot {
  readonly counters: Record<string, number>;
  readonly gauges: Record<string, number>;
  readonly timers: Record<string, number>;
}

export interface Counter {
  increment(value?: number): void;
}

export interface Metrics {
  counter(name: string): Counter;
  gauge(name: string, value: number): void;
  timer(name: string, value: number): void;
  snapshot(): MetricsSnapshot;
}

export class MetricsCollector implements Metrics {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly timers = new Map<string, number>();

  counter(name: string): Counter {
    return {
      increment: (value = 1) => {
        const current = this.counters.get(name) ?? 0;
        this.counters.set(name, current + value);
      },
    };
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  timer(name: string, value: number): void {
    this.timers.set(name, value);
  }

  snapshot(): MetricsSnapshot {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
      timers: Object.fromEntries(this.timers.entries()),
    };
  }
}
