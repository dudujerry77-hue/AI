import { describe, expect, it } from 'vitest';
import {
  ContextEngine,
  createContextManager,
  createProjectContext,
  createSessionContext,
  createTaskContext,
  createPhaseContext,
  createUserContext,
  createEngineContext,
  createInMemoryContextStorage,
} from '../../engines/context/src';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

describe('ContextEngine — Milestone 1 (Framework Contract)', () => {
  describe('runtime lifecycle', () => {
    it('starts in the created state and transitions through the full lifecycle', async () => {
      const engine = new ContextEngine();

      expect(engine.getState()).toBe('created');

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');

      await engine.start();
      expect(engine.getState()).toBe('running');

      await engine.stop();
      expect(engine.getState()).toBe('stopped');
    });

    it('allows re-initialization after stop', async () => {
      const engine = new ContextEngine();

      await engine.initialize();
      await engine.start();
      await engine.stop();

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');

      await engine.start();
      expect(engine.getState()).toBe('running');

      await engine.stop();
      expect(engine.getState()).toBe('stopped');
    });

    it('is safe to call stop() more than once', async () => {
      const engine = new ContextEngine();

      await engine.initialize();
      await engine.start();
      await engine.stop();

      await expect(engine.stop()).resolves.not.toThrow();
      expect(engine.getState()).toBe('stopped');
    });
  });

  describe('health', () => {
    it('reports healthy status through every lifecycle stage', async () => {
      const engine = new ContextEngine();

      await engine.initialize();
      expect((await engine.health()).status).toBe('healthy');

      await engine.start();
      expect((await engine.health()).status).toBe('healthy');

      await engine.stop();
      expect((await engine.health()).status).toBe('healthy');
    });
  });

  describe('metadata', () => {
    it('reports the expected identity fields', () => {
      const engine = new ContextEngine();
      const metadata = engine.metadata();

      expect(metadata.id).toBe('context-engine');
      expect(metadata.name).toBe('Context Engine');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.contractVersion).toBe(ENGINE_API_CONTRACT_VERSION);
    });

    it('advertises no capabilities in Milestone 1 (no repository text grounds any Context Engine business method)', () => {
      const engine = new ContextEngine();
      expect(engine.metadata().capabilities).toEqual([]);
    });

    it('allows overriding id, name, and version via options', () => {
      const engine = new ContextEngine({ id: 'custom-id', name: 'Custom Name', version: '2.0.0' });
      const metadata = engine.metadata();

      expect(metadata.id).toBe('custom-id');
      expect(metadata.name).toBe('Custom Name');
      expect(metadata.version).toBe('2.0.0');
    });
  });

  describe('version, contractVersion, getState', () => {
    it('version() matches metadata().version', () => {
      const engine = new ContextEngine();
      expect(engine.version()).toBe(engine.metadata().version);
    });

    it('contractVersion() matches the shared contract constant', () => {
      const engine = new ContextEngine();
      expect(engine.contractVersion()).toBe(ENGINE_API_CONTRACT_VERSION);
    });

    it('getState() reflects the current lifecycle state', async () => {
      const engine = new ContextEngine();
      expect(engine.getState()).toBe('created');

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');
    });
  });

  describe('public API surface (Milestone 1 boundary)', () => {
    it('exposes no business methods beyond the shared lifecycle contract', () => {
      const engine = new ContextEngine();

      // Any of these existing would indicate a business method was
      // added without explicit grounding in architecture.md or the
      // Phase 013 specification.
      expect((engine as unknown as Record<string, unknown>).createSnapshot).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).setProjectContext).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).save).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).load).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).serialize).toBeUndefined();
    });
  });
});

describe('Context Engine', () => {
  it('creates immutable snapshots and tracks versioned state', () => {
    const manager = createContextManager({
      project: createProjectContext({ id: 'project-1', name: 'Titan AI' }),
      session: createSessionContext({ id: 'session-1', name: 'primary-session' }),
      task: createTaskContext({ id: 'task-1', name: 'phase-setup' }),
      phase: createPhaseContext({ id: 'phase-1', name: 'Phase 005' }),
      user: createUserContext({ id: 'user-1', name: 'Operator' }),
      engine: createEngineContext({ id: 'engine-1', name: 'context' }),
    });

    const snapshot = manager.createSnapshot();

    expect(snapshot.version).toBe('1.0.0');
    expect(snapshot.project?.name).toBe('Titan AI');
    expect(snapshot.session?.name).toBe('primary-session');
    expect(snapshot.task?.name).toBe('phase-setup');
    expect(snapshot.phase?.name).toBe('Phase 005');
    expect(snapshot.user?.name).toBe('Operator');
    expect(snapshot.engine?.name).toBe('context');

    expect(() => {
      (snapshot.project as { name: string }).name = 'mutated';
    }).toThrow();
  });

  it('serializes and deserializes context snapshots', () => {
    const manager = createContextManager({
      project: createProjectContext({ id: 'project-2', name: 'Titan AI' }),
    });

    const serialized = manager.serialize();
    const restored = createContextManager(JSON.parse(serialized));

    expect(restored.createSnapshot().project?.id).toBe('project-2');
    expect(restored.createSnapshot().project?.version).toBe('1.0.0');
  });

  it('saves and loads context through an adapter', () => {
    const storage = createInMemoryContextStorage();
    const manager = createContextManager({
      project: createProjectContext({ id: 'project-3', name: 'Runtime' }),
    });

    manager.save(storage);
    const loaded = createContextManager();
    loaded.load(storage);

    expect(loaded.createSnapshot().project?.id).toBe('project-3');
  });

  it('updates the runtime context and returns the latest snapshot', () => {
    const manager = createContextManager();

    manager.setProjectContext(createProjectContext({ id: 'project-4', name: 'Updated' }));
    manager.setSessionContext(createSessionContext({ id: 'session-2', name: 'runtime' }));

    const snapshot = manager.createSnapshot();

    expect(snapshot.project?.name).toBe('Updated');
    expect(snapshot.session?.name).toBe('runtime');
  });

  it('updates the task context and returns the latest snapshot', () => {
    const manager = createContextManager();

    manager.setTaskContext(createTaskContext({ id: 'task-5', name: 'implement-feature', status: 'in-progress' }));

    const snapshot = manager.createSnapshot();
    expect(snapshot.task?.id).toBe('task-5');
    expect(snapshot.task?.name).toBe('implement-feature');
    expect(snapshot.task?.status).toBe('in-progress');
  });

  it('updates the phase context and returns the latest snapshot', () => {
    const manager = createContextManager();

    manager.setPhaseContext(createPhaseContext({ id: 'phase-014', name: 'Test Coverage Completion', status: 'in-progress' }));

    const snapshot = manager.createSnapshot();
    expect(snapshot.phase?.id).toBe('phase-014');
    expect(snapshot.phase?.name).toBe('Test Coverage Completion');
    expect(snapshot.phase?.status).toBe('in-progress');
  });

  it('updates the user context and returns the latest snapshot', () => {
    const manager = createContextManager();

    manager.setUserContext(createUserContext({ id: 'user-9', name: 'Reviewer', role: 'reviewer' }));

    const snapshot = manager.createSnapshot();
    expect(snapshot.user?.id).toBe('user-9');
    expect(snapshot.user?.name).toBe('Reviewer');
    expect(snapshot.user?.role).toBe('reviewer');
  });

  it('updates the engine context and returns the latest snapshot', () => {
    const manager = createContextManager();

    manager.setEngineContext(createEngineContext({ id: 'engine-9', name: 'context', status: 'running' }));

    const snapshot = manager.createSnapshot();
    expect(snapshot.engine?.id).toBe('engine-9');
    expect(snapshot.engine?.name).toBe('context');
    expect(snapshot.engine?.status).toBe('running');
  });
});
