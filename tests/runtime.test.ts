import { describe, expect, it } from 'vitest';

import { BaseEngine } from '../runtime/engine/base';
import { EventBus } from '../runtime/events/event-bus';
import { ConfigurationService } from '../runtime/config/configuration-service';
import { Logger } from '../runtime/logging/logger';
import { HealthMonitor } from '../runtime/health/health-monitor';
import { MetricsCollector } from '../runtime/metrics/metrics';
import { EngineRegistry } from '../runtime/registry/engine-registry';
import { LifecycleManager } from '../runtime/lifecycle/lifecycle-manager';
import { ConfigurationError, InitializationError, RuntimeError } from '../runtime/errors/errors';

describe('Titan runtime infrastructure', () => {
  it('runs a base engine through the lifecycle and emits lifecycle events', async () => {
    const eventBus = new EventBus();
    const logger = new Logger({ service: 'runtime-test' });
    const lifecycleManager = new LifecycleManager({ eventBus, logger });
    const healthMonitor = new HealthMonitor();
    const engine = new BaseEngine({
      id: 'engine-test',
      name: 'Test Engine',
      version: '1.0.0',
      lifecycleManager,
      eventBus,
      logger,
      healthMonitor,
    });

    const events: Array<{ topic: string; state: string }> = [];
    const unsubscribe = eventBus.subscribe<{ topic: string; state: string }>('engine.lifecycle', (payload) => {
      events.push({ topic: payload.topic, state: payload.state });
    });

    await engine.initialize();
    await engine.start();
    await engine.stop();

    expect(engine.getState()).toBe('stopped');
    expect(events.map((event) => event.state)).toEqual(['initialized', 'running', 'stopped']);

    unsubscribe();
  });

  it('registers and resolves engines by id and capability', async () => {
    const registry = new EngineRegistry();
    const engine = new BaseEngine({
      id: 'registry-test',
      name: 'Registry Test Engine',
      version: '1.0.0',
      capabilities: ['observe', 'report'],
    });

    registry.register(engine);

    expect(registry.get('registry-test')).toBe(engine);
    expect(registry.findByCapability('observe')).toEqual([engine]);
  });

  it('validates configuration values and surfaces configuration errors', () => {
    const service = new ConfigurationService()
      .withValue('runtime.port', 8080)
      .withValue('runtime.host', 'localhost');

    expect(service.get<number>('runtime.port')).toBe(8080);
    expect(() => service.getRequired<string>('runtime.secret')).toThrow(ConfigurationError);
  });

  it('writes structured log entries and reports health transitions', () => {
    const logger = new Logger({ service: 'runtime-test' });
    const healthMonitor = new HealthMonitor();

    const entries: Array<Record<string, unknown>> = [];
    logger.onLog((entry) => entries.push(entry as unknown as Record<string, unknown>));

    logger.info('ready', { component: 'health' });
    healthMonitor.markDegraded('warming up');
    healthMonitor.markHealthy('ready');

    const snapshot = healthMonitor.getSnapshot();
    expect(entries[0]).toMatchObject({ message: 'ready', service: 'runtime-test' });
    expect(snapshot.status).toBe('healthy');
    expect(snapshot.ready).toBe(true);
  });

  it('collects metrics and preserves error hierarchy semantics', async () => {
    const metrics = new MetricsCollector();
    const counter = metrics.counter('requests');
    counter.increment(2);

    const snapshot = metrics.snapshot();
    expect(snapshot.counters.requests).toBe(2);

    const error = new InitializationError('Boot failed');
    expect(error).toBeInstanceOf(RuntimeError);
    expect(error.message).toBe('Boot failed');
  });
});
