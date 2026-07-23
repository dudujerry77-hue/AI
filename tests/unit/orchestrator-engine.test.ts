import { describe, expect, it } from 'vitest';

import { OrchestratorEngine, NotImplementedError } from '../../engines/orchestrator/src';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

describe('Orchestrator Engine Milestone 1', () => {
  it('supports the runtime lifecycle contract', async () => {
    const engine = new OrchestratorEngine();

    expect(engine.getState()).toBe('created');

    await engine.initialize();
    expect(engine.getState()).toBe('initialized');

    await engine.start();
    expect(engine.getState()).toBe('running');

    await engine.stop();
    expect(engine.getState()).toBe('stopped');
  });

  it('exposes metadata and runtime contract version', () => {
    const engine = new OrchestratorEngine();
    const metadata = engine.metadata();

    expect(metadata.id).toBe('orchestrator-engine');
    expect(metadata.name).toBe('Orchestrator Engine');
    expect(metadata.version).toBe('1.0.0');
    expect(metadata.contractVersion).toBe(ENGINE_API_CONTRACT_VERSION);
    expect(metadata.capabilities).toEqual([
      'orchestrator.orchestrate',
      'orchestrator.execute-workflow',
      'orchestrator.pause-workflow',
      'orchestrator.resume-workflow',
      'orchestrator.cancel-workflow',
      'orchestrator.get-workflow-status',
    ]);
  });

  it('reports health through the runtime health contract', async () => {
    const engine = new OrchestratorEngine();

    await engine.initialize();
    const initializedHealth = await engine.health();
    expect(initializedHealth.status).toBe('healthy');

    await engine.start();
    const runningHealth = await engine.health();
    expect(runningHealth.status).toBe('healthy');
    expect(runningHealth.ready).toBe(true);

    await engine.stop();
    const stoppedHealth = await engine.health();
    expect(stoppedHealth.status).toBe('healthy');
  });

  it('reports version and contractVersion consistently with metadata', () => {
    const engine = new OrchestratorEngine();

    expect(engine.version()).toBe(engine.metadata().version);
    expect(engine.contractVersion()).toBe(engine.metadata().contractVersion);
    expect(engine.contractVersion()).toBe(ENGINE_API_CONTRACT_VERSION);
  });

  it('defines all six Orchestrator public API methods', () => {
    const engine = new OrchestratorEngine();

    expect(typeof engine.orchestrate).toBe('function');
    expect(typeof engine.executeWorkflow).toBe('function');
    expect(typeof engine.pauseWorkflow).toBe('function');
    expect(typeof engine.resumeWorkflow).toBe('function');
    expect(typeof engine.cancelWorkflow).toBe('function');
    expect(typeof engine.getWorkflowStatus).toBe('function');
  });

  it('throws NotImplementedError for orchestrate', async () => {
    const engine = new OrchestratorEngine();

    await expect(engine.orchestrate({ planId: 'plan-1' })).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('throws NotImplementedError for executeWorkflow', async () => {
    const engine = new OrchestratorEngine();

    await expect(engine.executeWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });

  it('throws NotImplementedError for pauseWorkflow', async () => {
    const engine = new OrchestratorEngine();

    await expect(engine.pauseWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('throws NotImplementedError for resumeWorkflow', async () => {
    const engine = new OrchestratorEngine();

    await expect(engine.resumeWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('throws NotImplementedError for cancelWorkflow', async () => {
    const engine = new OrchestratorEngine();

    await expect(engine.cancelWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('throws NotImplementedError for getWorkflowStatus', async () => {
    const engine = new OrchestratorEngine();

    await expect(engine.getWorkflowStatus({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });
});
