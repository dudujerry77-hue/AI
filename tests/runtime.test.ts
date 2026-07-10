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
import type { LegacyTitanEngine } from '../runtime/engine/types';
import { ENGINE_API_CONTRACT_VERSION } from '../runtime/engine/types';
import type {
  AuthenticationProvider,
  AuthorizationProvider,
  AuditLogger,
  PermissionChecker,
  SecretProvider,
} from '../runtime/security/interfaces';

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

    const events: Array<{
      topic: string;
      state: string;
      eventId: string;
      correlationId: string;
      traceId: string;
      timestamp: string;
      sessionId: string;
      engineId: string;
      phaseId: string;
      version: string;
      eventType: string;
    }> = [];
    const unsubscribe = eventBus.subscribe<{
      topic: string;
      state: string;
      eventId: string;
      correlationId: string;
      traceId: string;
      timestamp: string;
      sessionId: string;
      engineId: string;
      phaseId: string;
      version: string;
      eventType: string;
    }>('engine.lifecycle', (payload) => {
      events.push({
        topic: payload.topic,
        state: payload.state,
        eventId: payload.eventId,
        correlationId: payload.correlationId,
        traceId: payload.traceId,
        timestamp: payload.timestamp,
        sessionId: payload.sessionId,
        engineId: payload.engineId,
        phaseId: payload.phaseId,
        version: payload.version,
        eventType: payload.eventType,
      });
    });

    await engine.initialize();
    await engine.start();
    await engine.stop();

    expect(engine.getState()).toBe('stopped');
    expect(engine.metadata().id).toBe('engine-test');
    expect(engine.contractVersion()).toBe(ENGINE_API_CONTRACT_VERSION);
    expect(events.map((event) => event.state)).toEqual(['initialized', 'running', 'stopped']);
    expect(events.every((event) => event.eventId.length > 0)).toBe(true);
    expect(events.every((event) => event.correlationId.length > 0)).toBe(true);
    expect(events.every((event) => event.traceId.length > 0)).toBe(true);
    expect(events.every((event) => event.timestamp.length > 0)).toBe(true);
    expect(events.every((event) => event.sessionId.length > 0)).toBe(true);
    expect(events.every((event) => event.engineId.length > 0)).toBe(true);
    expect(events.every((event) => event.phaseId.length > 0)).toBe(true);
    expect(events.every((event) => event.version.length > 0)).toBe(true);
    expect(events.every((event) => event.eventType === 'engine.lifecycle')).toBe(true);

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

  it('preserves registry compatibility for legacy metadata-property engines', async () => {
    const registry = new EngineRegistry();

    const legacyEngine: LegacyTitanEngine = {
      metadata: {
        id: 'legacy-engine',
        name: 'Legacy Engine',
        version: '0.9.0',
        capabilities: ['legacy'],
      },
      async initialize() {
        return;
      },
      async start() {
        return;
      },
      async stop() {
        return;
      },
      async health() {
        return { status: 'healthy', ready: true, timestamp: new Date().toISOString() };
      },
      getState() {
        return 'initialized';
      },
      version() {
        return '0.9.0';
      },
    };

    registry.register(legacyEngine);

    expect(registry.get('legacy-engine')).toBe(legacyEngine);
    expect(registry.findByCapability('legacy')).toEqual([legacyEngine]);
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

  it('rejects initialization when engine contract version is unsupported', async () => {
    const lifecycleManager = new LifecycleManager({ supportedContractVersions: ['2.0.0'] });
    const engine = new BaseEngine({
      id: 'contract-test',
      name: 'Contract Test Engine',
      version: '1.0.0',
      contractVersion: ENGINE_API_CONTRACT_VERSION,
      lifecycleManager,
    });

    await expect(engine.initialize()).rejects.toThrow(InitializationError);
  });

  it('accepts runtime security interfaces as injectable dependencies', async () => {
    const authenticationProvider: AuthenticationProvider = {
      async authenticate() {
        return { authenticated: true, actorId: 'actor-1', method: 'test' };
      },
    };

    const authorizationProvider: AuthorizationProvider = {
      async authorize() {
        return { allowed: true };
      },
    };

    const auditLogger: AuditLogger = {
      async log() {
        return;
      },
    };

    const permissionChecker: PermissionChecker = {
      async hasPermission() {
        return true;
      },
    };

    const secretProvider: SecretProvider = {
      async getSecret() {
        return 'secret-value';
      },
      async hasSecret() {
        return true;
      },
    };

    const engine = new BaseEngine({
      id: 'security-contract-test',
      name: 'Security Contract Test Engine',
      version: '1.0.0',
      authenticationProvider,
      authorizationProvider,
      auditLogger,
      permissionChecker,
      secretProvider,
    });

    expect(engine.metadata().id).toBe('security-contract-test');
    await expect(engine.initialize()).resolves.toBeUndefined();
    await expect(engine.start()).resolves.toBeUndefined();
    await expect(engine.stop()).resolves.toBeUndefined();
  });

  it('supports event metadata envelope while preserving object payload fields', async () => {
    const eventBus = new EventBus();

    let captured:
      | {
          foo: string;
          eventId: string;
          correlationId: string;
          traceId: string;
          timestamp: string;
          sessionId: string;
          engineId: string;
          phaseId: string;
          version: string;
          eventType: string;
          payload: { foo: string; engineId: string };
        }
      | undefined;

    const unsubscribe = eventBus.subscribe<{
      foo: string;
      eventId: string;
      correlationId: string;
      traceId: string;
      timestamp: string;
      sessionId: string;
      engineId: string;
      phaseId: string;
      version: string;
      eventType: string;
      payload: { foo: string; engineId: string };
    }>('titan.engine.custom.event', (event) => {
      captured = event;
    });

    await eventBus.publish(
      'titan.engine.custom.event',
      { foo: 'bar', engineId: 'engine-custom' },
      {
        correlationId: 'corr-1',
        traceId: 'trace-1',
        sessionId: 'session-1',
        phaseId: 'phase-3.5',
        version: '2.0.0',
      },
    );

    expect(captured).toBeDefined();
    expect(captured?.foo).toBe('bar');
    expect(captured?.eventId.length).toBeGreaterThan(0);
    expect(captured?.correlationId).toBe('corr-1');
    expect(captured?.traceId).toBe('trace-1');
    expect(captured?.timestamp.length).toBeGreaterThan(0);
    expect(captured?.sessionId).toBe('session-1');
    expect(captured?.engineId).toBe('engine-custom');
    expect(captured?.phaseId).toBe('phase-3.5');
    expect(captured?.version).toBe('2.0.0');
    expect(captured?.eventType).toBe('titan.engine.custom.event');
    expect(captured?.payload.foo).toBe('bar');

    unsubscribe();
  });
});
