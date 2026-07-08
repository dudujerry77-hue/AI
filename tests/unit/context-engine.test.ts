import { describe, expect, it } from 'vitest';
import {
  createContextManager,
  createProjectContext,
  createSessionContext,
  createTaskContext,
  createPhaseContext,
  createUserContext,
  createEngineContext,
  createInMemoryContextStorage,
} from '../../engines/context/src';

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
});
