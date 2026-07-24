import { describe, expect, it } from 'vitest';

import {
  OrchestratorEngine,
  NotImplementedError,
  type Workflow,
  type WorkflowContext,
  type WorkflowDependency,
  type WorkflowDependencyType,
  type WorkflowExecutionMode,
  type WorkflowMetadata,
  type WorkflowPriority,
  type WorkflowResult,
  type WorkflowStatus,
  type WorkflowStep,
  type WorkflowStepStatus,
  type WorkflowSummary,
  type WorkflowTask,
  type WorkflowTaskStatus,
} from '../../engines/orchestrator/src';
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

describe('Orchestrator Engine Milestone 2 — domain model', () => {
  it('constructs a valid WorkflowMetadata value', () => {
    const metadata: WorkflowMetadata = {
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
      createdBy: 'actor-1',
      revision: 1,
      labels: ['milestone-2'],
    };

    expect(metadata.revision).toBe(1);
    expect(metadata.labels).toEqual(['milestone-2']);
  });

  it('constructs a valid WorkflowContext value', () => {
    const context: WorkflowContext = {
      actorId: 'actor-1',
      sessionId: 'session-1',
      phaseId: '009',
      planId: 'plan-1',
      inputs: { key: 'value' },
    };

    expect(context.actorId).toBe('actor-1');
    expect(context.planId).toBe('plan-1');
  });

  it('constructs a valid WorkflowTask value for every WorkflowTaskStatus', () => {
    const statuses: readonly WorkflowTaskStatus[] = [
      'pending',
      'ready',
      'in-progress',
      'blocked',
      'completed',
      'failed',
      'cancelled',
    ];

    for (const status of statuses) {
      const task: WorkflowTask = {
        taskId: `task-${status}`,
        stepId: 'step-1',
        title: 'Task title',
        description: 'Task description',
        status,
      };

      expect(task.status).toBe(status);
    }
  });

  it('constructs a valid WorkflowStep value for every WorkflowStepStatus', () => {
    const statuses: readonly WorkflowStepStatus[] = [
      'pending',
      'ready',
      'in-progress',
      'blocked',
      'completed',
      'failed',
      'skipped',
      'cancelled',
    ];

    for (const status of statuses) {
      const step: WorkflowStep = {
        stepId: `step-${status}`,
        title: 'Step title',
        description: 'Step description',
        status,
        taskIds: ['task-1'],
        dependsOnStepIds: [],
      };

      expect(step.status).toBe(status);
    }
  });

  it('constructs a valid WorkflowDependency value for every WorkflowDependencyType', () => {
    const types: readonly WorkflowDependencyType[] = ['blocks', 'requires', 'related', 'sequential', 'parallel'];

    for (const type of types) {
      const dependency: WorkflowDependency = {
        dependencyId: `dep-${type}`,
        type,
        sourceId: 'step-1',
        targetId: 'step-2',
      };

      expect(dependency.type).toBe(type);
    }
  });

  it('constructs a valid Workflow aggregate for every WorkflowStatus, WorkflowPriority, and WorkflowExecutionMode', () => {
    const statuses: readonly WorkflowStatus[] = ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'];
    const priorities: readonly WorkflowPriority[] = ['low', 'medium', 'high', 'critical'];
    const executionModes: readonly WorkflowExecutionMode[] = ['sequential', 'parallel', 'conditional'];

    for (const status of statuses) {
      for (const priority of priorities) {
        for (const executionMode of executionModes) {
          const workflow: Workflow = {
            workflowId: 'workflow-1',
            planId: 'plan-1',
            status,
            priority,
            executionMode,
            metadata: {
              createdAt: '2026-07-24T00:00:00.000Z',
              updatedAt: '2026-07-24T00:00:00.000Z',
              createdBy: 'actor-1',
              revision: 1,
            },
            steps: [],
            tasks: [],
            dependencies: [],
          };

          expect(workflow.status).toBe(status);
          expect(workflow.priority).toBe(priority);
          expect(workflow.executionMode).toBe(executionMode);
        }
      }
    }
  });

  it('constructs a valid WorkflowResult value', () => {
    const result: WorkflowResult = {
      workflowId: 'workflow-1',
      status: 'completed',
      completedStepIds: ['step-1'],
      failedStepIds: [],
      startedAt: '2026-07-24T00:00:00.000Z',
      completedAt: '2026-07-24T01:00:00.000Z',
    };

    expect(result.status).toBe('completed');
    expect(result.completedStepIds).toEqual(['step-1']);
  });

  it('constructs a valid WorkflowSummary value', () => {
    const summary: WorkflowSummary = {
      workflowId: 'workflow-1',
      status: 'pending',
      totalSteps: 3,
      totalTasks: 5,
      dependencyCount: 2,
    };

    expect(summary.totalSteps).toBe(3);
    expect(summary.totalTasks).toBe(5);
    expect(summary.dependencyCount).toBe(2);
  });
});

describe('Orchestrator Engine Milestone 2 — public API signatures', () => {
  it('accepts an orchestrate request with a typed WorkflowContext', async () => {
    const engine = new OrchestratorEngine();
    const context: WorkflowContext = { actorId: 'actor-1', planId: 'plan-1' };

    await expect(engine.orchestrate({ planId: 'plan-1', context })).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('accepts an executeWorkflow request with a typed WorkflowContext', async () => {
    const engine = new OrchestratorEngine();
    const context: WorkflowContext = { actorId: 'actor-1' };

    await expect(
      engine.executeWorkflow({ workflowId: 'workflow-1', context }),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('still throws NotImplementedError for every Orchestrator public API method in Milestone 2', async () => {
    const engine = new OrchestratorEngine();

    await expect(engine.orchestrate({ planId: 'plan-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.executeWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.pauseWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.resumeWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.cancelWorkflow({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.getWorkflowStatus({ workflowId: 'workflow-1' })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });

  it('leaves the runtime lifecycle contract unchanged in Milestone 2', async () => {
    const engine = new OrchestratorEngine();

    expect(engine.getState()).toBe('created');
    await engine.initialize();
    expect(engine.getState()).toBe('initialized');
    await engine.start();
    expect(engine.getState()).toBe('running');
    await engine.stop();
    expect(engine.getState()).toBe('stopped');
  });
});
