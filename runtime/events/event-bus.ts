export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventMetadata {
  readonly eventId: string;
  readonly correlationId: string;
  readonly traceId: string;
  readonly timestamp: string;
  readonly sessionId: string;
  readonly engineId: string;
  readonly phaseId: string;
  readonly version: string;
  readonly eventType: string;
}

export interface EventPublishOptions {
  readonly eventId?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly timestamp?: string;
  readonly sessionId?: string;
  readonly engineId?: string;
  readonly phaseId?: string;
  readonly version?: string;
}

export type EventEnvelope<T = unknown> = EventMetadata & {
  readonly payload: T;
};

const DEFAULT_SESSION_ID = 'runtime-session';
const DEFAULT_ENGINE_ID = 'unknown-engine';
const DEFAULT_PHASE_ID = 'unknown-phase';
const DEFAULT_EVENT_VERSION = '1.0.0';

function generateEventId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  return `evt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

  async publish<T = unknown>(topic: string, payload: T, options: EventPublishOptions = {}): Promise<void> {
    const handlers = this.listeners.get(topic);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const eventId = options.eventId ?? generateEventId();
    const envelope: EventEnvelope<T> = {
      eventId,
      correlationId: options.correlationId ?? eventId,
      traceId: options.traceId ?? options.correlationId ?? eventId,
      timestamp: options.timestamp ?? new Date().toISOString(),
      sessionId: options.sessionId ?? DEFAULT_SESSION_ID,
      engineId: options.engineId ?? (isObjectRecord(payload) && typeof payload.engineId === 'string' ? payload.engineId : DEFAULT_ENGINE_ID),
      phaseId: options.phaseId ?? DEFAULT_PHASE_ID,
      version: options.version ?? DEFAULT_EVENT_VERSION,
      eventType: topic,
      payload,
    };

    const eventForHandlers = isObjectRecord(payload)
      ? ({ ...envelope, ...payload } as unknown as T)
      : (envelope as unknown as T);

    await Promise.all(Array.from(handlers).map((handler) => Promise.resolve(handler(eventForHandlers))));
  }
}
