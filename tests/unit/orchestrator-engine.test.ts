import { describe, expect, it } from 'vitest';

import {
  OrchestratorEngine,
  OrchestratorValidationError,
  WorkflowBuilder,
  WorkflowValidator,
  WorkflowStatusTracker,
  WorkflowLifecycleManager,
  type Plan,
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

/**
 * Builds a deterministic, structurally rich `Plan` fixture for
 * Milestone 3 translation tests. Every field is fixed so that
 * repeated calls produce deep-equal `Plan` values.
 */
function buildPlanFixture(): Plan {
  return {
    planId: 'plan-1',
    goalId: 'goal-1',
    status: 'approved',
    metadata: {
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
      createdBy: 'actor-1',
      revision: 3,
      labels: ['milestone-3', 'fixture'],
    },
    steps: [
      {
        stepId: 'step-1',
        title: 'Analyze requirements',
        description: 'Gather and analyze requirements',
        type: 'analysis',
        status: 'completed',
        taskIds: ['task-1', 'task-2'],
      },
      {
        stepId: 'step-2',
        title: 'Implement feature',
        description: 'Implement the requested feature',
        type: 'implementation',
        status: 'in-progress',
        taskIds: ['task-3'],
        dependsOnStepIds: ['step-1'],
      },
    ],
    tasks: [
      {
        taskId: 'task-1',
        stepId: 'step-1',
        title: 'Interview stakeholders',
        description: 'Collect requirements from stakeholders',
        status: 'completed',
        assignee: 'analyst-1',
      },
      {
        taskId: 'task-2',
        stepId: 'step-1',
        title: 'Document findings',
        description: 'Write up the requirements document',
        status: 'completed',
      },
      {
        taskId: 'task-3',
        stepId: 'step-2',
        title: 'Write implementation',
        description: 'Implement the feature code',
        status: 'in-progress',
        assignee: 'engineer-1',
      },
    ],
    dependencies: [
      {
        dependencyId: 'dep-1',
        type: 'sequential',
        sourceId: 'step-1',
        targetId: 'step-2',
        reason: 'Implementation requires completed analysis',
      },
      {
        dependencyId: 'dep-2',
        type: 'requires',
        sourceId: 'task-3',
        targetId: 'task-1',
      },
    ],
    constraints: [],
  };
}

/**
 * Builds a deterministic, structurally valid `Workflow` fixture for
 * Milestone 4-6 tests, derived from `buildPlanFixture()` via
 * `WorkflowBuilder` (Milestone 3), so it always reflects a real,
 * structurally correct translation output.
 */
function buildWorkflowFixture(): Workflow {
  return new WorkflowBuilder().build(buildPlanFixture());
}

/**
 * Builds a `Workflow` fixture with a deliberately rich mix of step
 * and task statuses, for Milestone 5 status-reporting tests. Derived
 * from `buildWorkflowFixture()` so all IDs and references remain
 * valid.
 */
function buildStatusRichWorkflowFixture(): Workflow {
  const base = buildWorkflowFixture();

  return {
    ...base,
    steps: [
      { ...base.steps[0], status: 'completed' },
      { ...base.steps[1], status: 'in-progress' },
    ],
    tasks: [
      { ...base.tasks[0], status: 'completed' },
      { ...base.tasks[1], status: 'failed' },
      { ...base.tasks[2], status: 'pending' },
    ],
  };
}

/**
 * Builds a `Workflow` fixture with a specific top-level `status`, for
 * Milestone 6 lifecycle transition tests. Derived from
 * `buildWorkflowFixture()` so all IDs, steps, tasks, and dependencies
 * remain valid and unrelated to the transition being tested.
 */
function buildWorkflowWithStatus(status: WorkflowStatus): Workflow {
  return { ...buildWorkflowFixture(), status };
}

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
      completedSteps: 1,
      pendingSteps: 1,
      runningSteps: 1,
      failedSteps: 0,
      cancelledSteps: 0,
      totalTasks: 5,
      completedTasks: 2,
      pendingTasks: 2,
      runningTasks: 1,
      failedTasks: 0,
      cancelledTasks: 0,
      dependencyCount: 2,
    };

    expect(summary.totalSteps).toBe(3);
    expect(summary.totalTasks).toBe(5);
    expect(summary.dependencyCount).toBe(2);
  });
});

describe('Orchestrator Engine Milestone 3 — WorkflowBuilder', () => {
  it('translates a valid Plan into a Workflow', () => {
    const builder = new WorkflowBuilder();
    const plan = buildPlanFixture();

    const workflow = builder.build(plan);

    expect(workflow.workflowId).toBe('workflow-plan-1');
    expect(workflow.planId).toBe('plan-1');
    expect(workflow.status).toBe('pending');
    expect(workflow.steps).toHaveLength(2);
    expect(workflow.tasks).toHaveLength(3);
    expect(workflow.dependencies).toHaveLength(2);
  });

  it('preserves all step, task, and dependency IDs', () => {
    const builder = new WorkflowBuilder();
    const plan = buildPlanFixture();

    const workflow = builder.build(plan);

    expect(workflow.steps.map((step) => step.stepId)).toEqual(['step-1', 'step-2']);
    expect(workflow.tasks.map((task) => task.taskId)).toEqual(['task-1', 'task-2', 'task-3']);
    expect(workflow.dependencies.map((dependency) => dependency.dependencyId)).toEqual(['dep-1', 'dep-2']);
  });

  it('preserves step, task, and dependency ordering exactly as in the input Plan', () => {
    const builder = new WorkflowBuilder();
    const plan = buildPlanFixture();

    const workflow = builder.build(plan);

    expect(workflow.steps.map((step) => step.stepId)).toEqual(plan.steps.map((step) => step.stepId));
    expect(workflow.tasks.map((task) => task.taskId)).toEqual(plan.tasks.map((task) => task.taskId));
    expect(workflow.dependencies.map((dependency) => dependency.dependencyId)).toEqual(
      plan.dependencies.map((dependency) => dependency.dependencyId),
    );
  });

  it('preserves step dependsOnStepIds and dependency source/target relationships', () => {
    const builder = new WorkflowBuilder();
    const plan = buildPlanFixture();

    const workflow = builder.build(plan);

    const step2 = workflow.steps.find((step) => step.stepId === 'step-2');
    expect(step2?.dependsOnStepIds).toEqual(['step-1']);

    const dep1 = workflow.dependencies.find((dependency) => dependency.dependencyId === 'dep-1');
    expect(dep1?.sourceId).toBe('step-1');
    expect(dep1?.targetId).toBe('step-2');
    expect(dep1?.type).toBe('sequential');

    const dep2 = workflow.dependencies.find((dependency) => dependency.dependencyId === 'dep-2');
    expect(dep2?.sourceId).toBe('task-3');
    expect(dep2?.targetId).toBe('task-1');
    expect(dep2?.type).toBe('requires');
  });

  it('translates every Planner DependencyType into the identical WorkflowDependencyType', () => {
    const builder = new WorkflowBuilder();
    const types: readonly WorkflowDependencyType[] = ['blocks', 'requires', 'related', 'sequential', 'parallel'];

    const plan: Plan = {
      ...buildPlanFixture(),
      dependencies: types.map((type, index) => ({
        dependencyId: `dep-${index}`,
        type,
        sourceId: 'step-1',
        targetId: 'step-2',
      })),
    };

    const workflow = builder.build(plan);

    expect(workflow.dependencies.map((dependency) => dependency.type)).toEqual(types);
  });

  it('produces deterministic output for identical input', () => {
    const builder = new WorkflowBuilder();
    const plan = buildPlanFixture();

    const first = builder.build(plan);
    const second = builder.build(buildPlanFixture());

    expect(first).toEqual(second);
  });

  it('never mutates the input Plan', () => {
    const builder = new WorkflowBuilder();
    const plan = buildPlanFixture();
    const snapshot = JSON.parse(JSON.stringify(plan));

    builder.build(plan);

    expect(plan).toEqual(snapshot);
  });

  it('rejects a null or undefined Plan with OrchestratorValidationError', () => {
    const builder = new WorkflowBuilder();

    expect(() => builder.build(null as unknown as Plan)).toThrow(OrchestratorValidationError);
    expect(() => builder.build(undefined as unknown as Plan)).toThrow(OrchestratorValidationError);
  });

  it('rejects a Plan missing planId with OrchestratorValidationError', () => {
    const builder = new WorkflowBuilder();
    const plan = { ...buildPlanFixture(), planId: '' };

    expect(() => builder.build(plan)).toThrow(OrchestratorValidationError);
  });

  it('rejects a Plan missing metadata with OrchestratorValidationError', () => {
    const builder = new WorkflowBuilder();
    const plan = { ...buildPlanFixture(), metadata: undefined as unknown as Plan['metadata'] };

    expect(() => builder.build(plan)).toThrow(OrchestratorValidationError);
  });

  it('rejects a Plan with a non-array steps field with OrchestratorValidationError', () => {
    const builder = new WorkflowBuilder();
    const plan = { ...buildPlanFixture(), steps: undefined as unknown as Plan['steps'] };

    expect(() => builder.build(plan)).toThrow(OrchestratorValidationError);
  });

  it('rejects a Plan with a non-array tasks field with OrchestratorValidationError', () => {
    const builder = new WorkflowBuilder();
    const plan = { ...buildPlanFixture(), tasks: undefined as unknown as Plan['tasks'] };

    expect(() => builder.build(plan)).toThrow(OrchestratorValidationError);
  });

  it('rejects a Plan with a non-array dependencies field with OrchestratorValidationError', () => {
    const builder = new WorkflowBuilder();
    const plan = { ...buildPlanFixture(), dependencies: undefined as unknown as Plan['dependencies'] };

    expect(() => builder.build(plan)).toThrow(OrchestratorValidationError);
  });
});

describe('Orchestrator Engine Milestone 3 — orchestrate()', () => {
  it('returns a Workflow for a valid request', async () => {
    const engine = new OrchestratorEngine();
    const plan = buildPlanFixture();

    const workflow = await engine.orchestrate({ plan });

    expect(workflow.workflowId).toBe('workflow-plan-1');
    expect(workflow.planId).toBe('plan-1');
    expect(workflow.steps).toHaveLength(2);
    expect(workflow.tasks).toHaveLength(3);
    expect(workflow.dependencies).toHaveLength(2);
  });

  it('produces deterministic output for identical input', async () => {
    const engine = new OrchestratorEngine();

    const first = await engine.orchestrate({ plan: buildPlanFixture() });
    const second = await engine.orchestrate({ plan: buildPlanFixture() });

    expect(first).toEqual(second);
  });

  it('rejects a request missing a plan with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.orchestrate({ plan: undefined as unknown as Plan }),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('rejects a null request with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.orchestrate(null as unknown as Parameters<typeof engine.orchestrate>[0]),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('leaves the runtime lifecycle contract unchanged in Milestone 3', async () => {
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

describe('Orchestrator Engine Milestone 4 — WorkflowValidator', () => {
  it('accepts a valid Workflow', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();

    const result = validator.validate(workflow);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.workflowId).toBe(workflow.workflowId);
  });

  it('detects duplicate stepId values', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const duplicated: Workflow = {
      ...workflow,
      steps: [workflow.steps[0], { ...workflow.steps[1], stepId: workflow.steps[0].stepId }],
    };

    const result = validator.validate(duplicated);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_ID' && issue.field.includes('stepId'))).toBe(
      true,
    );
  });

  it('detects duplicate taskId values', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const duplicated: Workflow = {
      ...workflow,
      tasks: workflow.tasks.map((task, index) =>
        index === 1 ? { ...task, taskId: workflow.tasks[0].taskId } : task,
      ),
    };

    const result = validator.validate(duplicated);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_ID' && issue.field.includes('taskId'))).toBe(
      true,
    );
  });

  it('detects invalid metadata (missing createdBy, non-numeric revision, bad timestamp)', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const invalid: Workflow = {
      ...workflow,
      metadata: {
        ...workflow.metadata,
        createdBy: '',
        revision: Number.NaN,
        createdAt: 'not-a-timestamp',
      },
    };

    const result = validator.validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'metadata.createdBy')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'metadata.revision')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'metadata.createdAt')).toBe(true);
  });

  it('detects invalid WorkflowStatus, WorkflowPriority, and WorkflowExecutionMode enum values', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const invalid = {
      ...workflow,
      status: 'not-a-status',
      priority: 'not-a-priority',
      executionMode: 'not-a-mode',
    } as unknown as Workflow;

    const result = validator.validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'status' && issue.code === 'INVALID_ENUM_VALUE')).toBe(
      true,
    );
    expect(result.issues.some((issue) => issue.field === 'priority' && issue.code === 'INVALID_ENUM_VALUE')).toBe(
      true,
    );
    expect(
      result.issues.some((issue) => issue.field === 'executionMode' && issue.code === 'INVALID_ENUM_VALUE'),
    ).toBe(true);
  });

  it('detects invalid step and task status enum values', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const invalid: Workflow = {
      ...workflow,
      steps: [{ ...workflow.steps[0], status: 'not-a-status' as unknown as WorkflowStepStatus }, workflow.steps[1]],
      tasks: [
        { ...workflow.tasks[0], status: 'not-a-status' as unknown as WorkflowTaskStatus },
        ...workflow.tasks.slice(1),
      ],
    };

    const result = validator.validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'steps[0].status')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'tasks[0].status')).toBe(true);
  });

  it('detects duplicate dependencies (same type, sourceId, and targetId)', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const duplicated: Workflow = {
      ...workflow,
      dependencies: [...workflow.dependencies, { ...workflow.dependencies[0], dependencyId: 'dep-duplicate' }],
    };

    const result = validator.validate(duplicated);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_DEPENDENCY')).toBe(true);
  });

  it('detects self-dependencies', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const selfDependency: Workflow = {
      ...workflow,
      dependencies: [
        ...workflow.dependencies,
        { dependencyId: 'dep-self', type: 'related', sourceId: 'step-1', targetId: 'step-1' },
      ],
    };

    const result = validator.validate(selfDependency);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'SELF_DEPENDENCY')).toBe(true);
  });

  it('detects dependencies referencing unknown step/task IDs', () => {
    const validator = new WorkflowValidator();
    const workflow = buildWorkflowFixture();
    const invalid: Workflow = {
      ...workflow,
      dependencies: [
        ...workflow.dependencies,
        { dependencyId: 'dep-missing', type: 'related', sourceId: 'step-missing', targetId: 'task-missing' },
      ],
    };

    const result = validator.validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'UNKNOWN_REFERENCE' && issue.field.includes('sourceId'))).toBe(
      true,
    );
    expect(result.issues.some((issue) => issue.code === 'UNKNOWN_REFERENCE' && issue.field.includes('targetId'))).toBe(
      true,
    );
  });

  it('throws OrchestratorValidationError for malformed input (null, undefined, non-object)', () => {
    const validator = new WorkflowValidator();

    expect(() => validator.validate(null as unknown as Workflow)).toThrow(OrchestratorValidationError);
    expect(() => validator.validate(undefined as unknown as Workflow)).toThrow(OrchestratorValidationError);
    expect(() => validator.validate('not-an-object' as unknown as Workflow)).toThrow(OrchestratorValidationError);
  });

  it('produces deterministic output for identical input', () => {
    const validator = new WorkflowValidator();

    const first = validator.validate(buildWorkflowFixture());
    const second = validator.validate(buildWorkflowFixture());

    expect(first).toEqual(second);
  });
});

describe('Orchestrator Engine Milestone 4 — executeWorkflow()', () => {
  it('returns a valid WorkflowValidationResult for a valid Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowFixture();

    const result = await engine.executeWorkflow({ workflow });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.workflowId).toBe(workflow.workflowId);
  });

  it('returns an invalid WorkflowValidationResult for a structurally invalid Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowFixture();
    const invalid: Workflow = { ...workflow, workflowId: '' };

    const result = await engine.executeWorkflow({ workflow: invalid });

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('rejects a malformed request (missing workflow) with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.executeWorkflow({ workflow: undefined as unknown as Workflow }),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('rejects a null request with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.executeWorkflow(null as unknown as Parameters<typeof engine.executeWorkflow>[0]),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('leaves orchestrate() unchanged in Milestone 4', async () => {
    const engine = new OrchestratorEngine();
    const plan = buildPlanFixture();

    const workflow = await engine.orchestrate({ plan });

    expect(workflow.workflowId).toBe('workflow-plan-1');
    expect(workflow.planId).toBe('plan-1');
  });
});

describe('Orchestrator Engine Milestone 5 — WorkflowStatusTracker', () => {
  it('computes a correct summary for a valid Workflow', () => {
    const tracker = new WorkflowStatusTracker();
    const workflow = buildStatusRichWorkflowFixture();

    const summary = tracker.summarize(workflow);

    expect(summary.workflowId).toBe(workflow.workflowId);
    expect(summary.status).toBe(workflow.status);
    expect(summary.totalSteps).toBe(2);
    expect(summary.totalTasks).toBe(3);
    expect(summary.dependencyCount).toBe(workflow.dependencies.length);
  });

  it('computes correct step status counts', () => {
    const tracker = new WorkflowStatusTracker();
    const workflow = buildStatusRichWorkflowFixture();

    const summary = tracker.summarize(workflow);

    // steps: [completed, in-progress]
    expect(summary.completedSteps).toBe(1);
    expect(summary.runningSteps).toBe(1);
    expect(summary.pendingSteps).toBe(0);
    expect(summary.failedSteps).toBe(0);
    expect(summary.cancelledSteps).toBe(0);
  });

  it('computes correct task status counts', () => {
    const tracker = new WorkflowStatusTracker();
    const workflow = buildStatusRichWorkflowFixture();

    const summary = tracker.summarize(workflow);

    // tasks: [completed, failed, pending]
    expect(summary.completedTasks).toBe(1);
    expect(summary.failedTasks).toBe(1);
    expect(summary.pendingTasks).toBe(1);
    expect(summary.runningTasks).toBe(0);
    expect(summary.cancelledTasks).toBe(0);
  });

  it('classifies every WorkflowStepStatus value deterministically', () => {
    const tracker = new WorkflowStatusTracker();
    const base = buildWorkflowFixture();
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

    const workflow: Workflow = {
      ...base,
      steps: statuses.map((status, index) => ({
        stepId: `step-${index}`,
        title: 'Step',
        description: 'Step',
        status,
        taskIds: [],
      })),
      tasks: [],
      dependencies: [],
    };

    const summary = tracker.summarize(workflow);

    expect(summary.totalSteps).toBe(8);
    expect(summary.pendingSteps).toBe(3); // pending, ready, blocked
    expect(summary.runningSteps).toBe(1); // in-progress
    expect(summary.completedSteps).toBe(1); // completed
    expect(summary.failedSteps).toBe(1); // failed
    expect(summary.cancelledSteps).toBe(2); // skipped, cancelled
  });

  it('classifies every WorkflowTaskStatus value deterministically', () => {
    const tracker = new WorkflowStatusTracker();
    const base = buildWorkflowFixture();
    const statuses: readonly WorkflowTaskStatus[] = [
      'pending',
      'ready',
      'in-progress',
      'blocked',
      'completed',
      'failed',
      'cancelled',
    ];

    const workflow: Workflow = {
      ...base,
      steps: [],
      tasks: statuses.map((status, index) => ({
        taskId: `task-${index}`,
        stepId: 'step-x',
        title: 'Task',
        description: 'Task',
        status,
      })),
      dependencies: [],
    };

    const summary = tracker.summarize(workflow);

    expect(summary.totalTasks).toBe(7);
    expect(summary.pendingTasks).toBe(3); // pending, ready, blocked
    expect(summary.runningTasks).toBe(1); // in-progress
    expect(summary.completedTasks).toBe(1); // completed
    expect(summary.failedTasks).toBe(1); // failed
    expect(summary.cancelledTasks).toBe(1); // cancelled
  });

  it('computes the correct dependencyCount', () => {
    const tracker = new WorkflowStatusTracker();
    const workflow = buildWorkflowFixture();

    const summary = tracker.summarize(workflow);

    expect(summary.dependencyCount).toBe(2);
  });

  it('produces deterministic output for identical input', () => {
    const tracker = new WorkflowStatusTracker();

    const first = tracker.summarize(buildStatusRichWorkflowFixture());
    const second = tracker.summarize(buildStatusRichWorkflowFixture());

    expect(first).toEqual(second);
  });

  it('never mutates the input Workflow', () => {
    const tracker = new WorkflowStatusTracker();
    const workflow = buildStatusRichWorkflowFixture();
    const snapshot = JSON.parse(JSON.stringify(workflow));

    tracker.summarize(workflow);

    expect(workflow).toEqual(snapshot);
  });

  it('rejects malformed input (null, undefined, non-object) with OrchestratorValidationError', () => {
    const tracker = new WorkflowStatusTracker();

    expect(() => tracker.summarize(null as unknown as Workflow)).toThrow(OrchestratorValidationError);
    expect(() => tracker.summarize(undefined as unknown as Workflow)).toThrow(OrchestratorValidationError);
    expect(() => tracker.summarize('not-an-object' as unknown as Workflow)).toThrow(OrchestratorValidationError);
  });
});

describe('Orchestrator Engine Milestone 5 — getWorkflowStatus()', () => {
  it('returns a correct WorkflowSummary for a valid Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildStatusRichWorkflowFixture();

    const summary = await engine.getWorkflowStatus({ workflow });

    expect(summary.workflowId).toBe(workflow.workflowId);
    expect(summary.totalSteps).toBe(2);
    expect(summary.totalTasks).toBe(3);
    expect(summary.dependencyCount).toBe(workflow.dependencies.length);
  });

  it('rejects a malformed request (missing workflow) with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.getWorkflowStatus({ workflow: undefined as unknown as Workflow }),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('rejects a null request with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.getWorkflowStatus(null as unknown as Parameters<typeof engine.getWorkflowStatus>[0]),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('produces deterministic output for identical input', async () => {
    const engine = new OrchestratorEngine();

    const first = await engine.getWorkflowStatus({ workflow: buildStatusRichWorkflowFixture() });
    const second = await engine.getWorkflowStatus({ workflow: buildStatusRichWorkflowFixture() });

    expect(first).toEqual(second);
  });

  it('never mutates the supplied Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildStatusRichWorkflowFixture();
    const snapshot = JSON.parse(JSON.stringify(workflow));

    await engine.getWorkflowStatus({ workflow });

    expect(workflow).toEqual(snapshot);
  });

  it('leaves orchestrate() and executeWorkflow() unchanged in Milestone 5', async () => {
    const engine = new OrchestratorEngine();
    const plan = buildPlanFixture();

    const workflow = await engine.orchestrate({ plan });
    expect(workflow.workflowId).toBe('workflow-plan-1');

    const validationResult = await engine.executeWorkflow({ workflow });
    expect(validationResult.valid).toBe(true);
  });

  it('leaves the runtime lifecycle contract unchanged in Milestone 5', async () => {
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

describe('Orchestrator Engine Milestone 6 — WorkflowLifecycleManager', () => {
  describe('pause()', () => {
    it('transitions a running workflow to paused', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');

      const result = manager.pause(workflow);

      expect(result.status).toBe('paused');
    });

    it('increments revision by exactly 1 when pausing a running workflow', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');
      const originalRevision = workflow.metadata.revision;

      const result = manager.pause(workflow);

      expect(result.metadata.revision).toBe(originalRevision + 1);
    });

    it.each<WorkflowStatus>(['pending', 'paused', 'completed', 'failed', 'cancelled'])(
      'leaves status and revision unchanged when pausing a %s workflow',
      (status) => {
        const manager = new WorkflowLifecycleManager();
        const workflow = buildWorkflowWithStatus(status);

        const result = manager.pause(workflow);

        expect(result.status).toBe(status);
        expect(result.metadata.revision).toBe(workflow.metadata.revision);
      },
    );

    it('never mutates the input workflow', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');
      const snapshot = JSON.parse(JSON.stringify(workflow));

      manager.pause(workflow);

      expect(workflow).toEqual(snapshot);
    });

    it('preserves createdAt, createdBy, IDs, steps, tasks, and dependencies', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');

      const result = manager.pause(workflow);

      expect(result.workflowId).toBe(workflow.workflowId);
      expect(result.planId).toBe(workflow.planId);
      expect(result.metadata.createdAt).toBe(workflow.metadata.createdAt);
      expect(result.metadata.createdBy).toBe(workflow.metadata.createdBy);
      expect(result.steps).toEqual(workflow.steps);
      expect(result.tasks).toEqual(workflow.tasks);
      expect(result.dependencies).toEqual(workflow.dependencies);
    });

    it('returns a new object, not the same reference', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');

      const result = manager.pause(workflow);

      expect(result).not.toBe(workflow);
    });

    it('produces deterministic output for identical input', () => {
      const manager = new WorkflowLifecycleManager();

      const first = manager.pause(buildWorkflowWithStatus('running'));
      const second = manager.pause(buildWorkflowWithStatus('running'));

      expect(first).toEqual(second);
    });

    it('rejects malformed input (null, undefined, non-object) with OrchestratorValidationError', () => {
      const manager = new WorkflowLifecycleManager();

      expect(() => manager.pause(null as unknown as Workflow)).toThrow(OrchestratorValidationError);
      expect(() => manager.pause(undefined as unknown as Workflow)).toThrow(OrchestratorValidationError);
      expect(() => manager.pause('not-an-object' as unknown as Workflow)).toThrow(OrchestratorValidationError);
    });
  });

  describe('resume()', () => {
    it('transitions a paused workflow to running', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('paused');

      const result = manager.resume(workflow);

      expect(result.status).toBe('running');
    });

    it('increments revision by exactly 1 when resuming a paused workflow', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('paused');
      const originalRevision = workflow.metadata.revision;

      const result = manager.resume(workflow);

      expect(result.metadata.revision).toBe(originalRevision + 1);
    });

    it.each<WorkflowStatus>(['pending', 'running', 'completed', 'failed', 'cancelled'])(
      'leaves status and revision unchanged when resuming a %s workflow',
      (status) => {
        const manager = new WorkflowLifecycleManager();
        const workflow = buildWorkflowWithStatus(status);

        const result = manager.resume(workflow);

        expect(result.status).toBe(status);
        expect(result.metadata.revision).toBe(workflow.metadata.revision);
      },
    );

    it('never mutates the input workflow', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('paused');
      const snapshot = JSON.parse(JSON.stringify(workflow));

      manager.resume(workflow);

      expect(workflow).toEqual(snapshot);
    });

    it('preserves createdAt, createdBy, IDs, steps, tasks, and dependencies', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('paused');

      const result = manager.resume(workflow);

      expect(result.workflowId).toBe(workflow.workflowId);
      expect(result.planId).toBe(workflow.planId);
      expect(result.metadata.createdAt).toBe(workflow.metadata.createdAt);
      expect(result.metadata.createdBy).toBe(workflow.metadata.createdBy);
      expect(result.steps).toEqual(workflow.steps);
      expect(result.tasks).toEqual(workflow.tasks);
      expect(result.dependencies).toEqual(workflow.dependencies);
    });

    it('returns a new object, not the same reference', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('paused');

      const result = manager.resume(workflow);

      expect(result).not.toBe(workflow);
    });

    it('produces deterministic output for identical input', () => {
      const manager = new WorkflowLifecycleManager();

      const first = manager.resume(buildWorkflowWithStatus('paused'));
      const second = manager.resume(buildWorkflowWithStatus('paused'));

      expect(first).toEqual(second);
    });

    it('rejects malformed input (null, undefined, non-object) with OrchestratorValidationError', () => {
      const manager = new WorkflowLifecycleManager();

      expect(() => manager.resume(null as unknown as Workflow)).toThrow(OrchestratorValidationError);
      expect(() => manager.resume(undefined as unknown as Workflow)).toThrow(OrchestratorValidationError);
      expect(() => manager.resume('not-an-object' as unknown as Workflow)).toThrow(OrchestratorValidationError);
    });
  });

  describe('cancel()', () => {
    it.each<WorkflowStatus>(['pending', 'running', 'paused', 'failed'])(
      'transitions an active (%s) workflow to cancelled',
      (status) => {
        const manager = new WorkflowLifecycleManager();
        const workflow = buildWorkflowWithStatus(status);

        const result = manager.cancel(workflow);

        expect(result.status).toBe('cancelled');
      },
    );

    it.each<WorkflowStatus>(['pending', 'running', 'paused', 'failed'])(
      'increments revision by exactly 1 when cancelling an active (%s) workflow',
      (status) => {
        const manager = new WorkflowLifecycleManager();
        const workflow = buildWorkflowWithStatus(status);
        const originalRevision = workflow.metadata.revision;

        const result = manager.cancel(workflow);

        expect(result.metadata.revision).toBe(originalRevision + 1);
      },
    );

    it('leaves status and revision unchanged when cancelling an already completed workflow', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('completed');

      const result = manager.cancel(workflow);

      expect(result.status).toBe('completed');
      expect(result.metadata.revision).toBe(workflow.metadata.revision);
    });

    it('leaves status and revision unchanged when cancelling an already cancelled workflow', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('cancelled');

      const result = manager.cancel(workflow);

      expect(result.status).toBe('cancelled');
      expect(result.metadata.revision).toBe(workflow.metadata.revision);
    });

    it('never mutates the input workflow', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');
      const snapshot = JSON.parse(JSON.stringify(workflow));

      manager.cancel(workflow);

      expect(workflow).toEqual(snapshot);
    });

    it('preserves createdAt, createdBy, IDs, steps, tasks, and dependencies', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');

      const result = manager.cancel(workflow);

      expect(result.workflowId).toBe(workflow.workflowId);
      expect(result.planId).toBe(workflow.planId);
      expect(result.metadata.createdAt).toBe(workflow.metadata.createdAt);
      expect(result.metadata.createdBy).toBe(workflow.metadata.createdBy);
      expect(result.steps).toEqual(workflow.steps);
      expect(result.tasks).toEqual(workflow.tasks);
      expect(result.dependencies).toEqual(workflow.dependencies);
    });

    it('returns a new object, not the same reference', () => {
      const manager = new WorkflowLifecycleManager();
      const workflow = buildWorkflowWithStatus('running');

      const result = manager.cancel(workflow);

      expect(result).not.toBe(workflow);
    });

    it('produces deterministic output for identical input', () => {
      const manager = new WorkflowLifecycleManager();

      const first = manager.cancel(buildWorkflowWithStatus('running'));
      const second = manager.cancel(buildWorkflowWithStatus('running'));

      expect(first).toEqual(second);
    });

    it('rejects malformed input (null, undefined, non-object) with OrchestratorValidationError', () => {
      const manager = new WorkflowLifecycleManager();

      expect(() => manager.cancel(null as unknown as Workflow)).toThrow(OrchestratorValidationError);
      expect(() => manager.cancel(undefined as unknown as Workflow)).toThrow(OrchestratorValidationError);
      expect(() => manager.cancel('not-an-object' as unknown as Workflow)).toThrow(OrchestratorValidationError);
    });
  });
});

describe('Orchestrator Engine Milestone 6 — pauseWorkflow()', () => {
  it('returns a new Workflow with status paused for a running workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('running');

    const result = await engine.pauseWorkflow({ workflow });

    expect(result.status).toBe('paused');
    expect(result.metadata.revision).toBe(workflow.metadata.revision + 1);
  });

  it('leaves status unchanged for a non-running workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('pending');

    const result = await engine.pauseWorkflow({ workflow });

    expect(result.status).toBe('pending');
    expect(result.metadata.revision).toBe(workflow.metadata.revision);
  });

  it('rejects a malformed request (missing workflow) with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.pauseWorkflow({ workflow: undefined as unknown as Workflow }),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('rejects a null request with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.pauseWorkflow(null as unknown as Parameters<typeof engine.pauseWorkflow>[0]),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('produces deterministic output for identical input', async () => {
    const engine = new OrchestratorEngine();

    const first = await engine.pauseWorkflow({ workflow: buildWorkflowWithStatus('running') });
    const second = await engine.pauseWorkflow({ workflow: buildWorkflowWithStatus('running') });

    expect(first).toEqual(second);
  });

  it('never mutates the supplied Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('running');
    const snapshot = JSON.parse(JSON.stringify(workflow));

    await engine.pauseWorkflow({ workflow });

    expect(workflow).toEqual(snapshot);
  });
});

describe('Orchestrator Engine Milestone 6 — resumeWorkflow()', () => {
  it('returns a new Workflow with status running for a paused workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('paused');

    const result = await engine.resumeWorkflow({ workflow });

    expect(result.status).toBe('running');
    expect(result.metadata.revision).toBe(workflow.metadata.revision + 1);
  });

  it('leaves status unchanged for a non-paused workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('pending');

    const result = await engine.resumeWorkflow({ workflow });

    expect(result.status).toBe('pending');
    expect(result.metadata.revision).toBe(workflow.metadata.revision);
  });

  it('rejects a malformed request (missing workflow) with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.resumeWorkflow({ workflow: undefined as unknown as Workflow }),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('rejects a null request with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.resumeWorkflow(null as unknown as Parameters<typeof engine.resumeWorkflow>[0]),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('produces deterministic output for identical input', async () => {
    const engine = new OrchestratorEngine();

    const first = await engine.resumeWorkflow({ workflow: buildWorkflowWithStatus('paused') });
    const second = await engine.resumeWorkflow({ workflow: buildWorkflowWithStatus('paused') });

    expect(first).toEqual(second);
  });

  it('never mutates the supplied Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('paused');
    const snapshot = JSON.parse(JSON.stringify(workflow));

    await engine.resumeWorkflow({ workflow });

    expect(workflow).toEqual(snapshot);
  });
});

describe('Orchestrator Engine Milestone 6 — cancelWorkflow()', () => {
  it('returns a new Workflow with status cancelled for an active workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('running');

    const result = await engine.cancelWorkflow({ workflow });

    expect(result.status).toBe('cancelled');
    expect(result.metadata.revision).toBe(workflow.metadata.revision + 1);
  });

  it('leaves status unchanged for an already completed workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('completed');

    const result = await engine.cancelWorkflow({ workflow });

    expect(result.status).toBe('completed');
    expect(result.metadata.revision).toBe(workflow.metadata.revision);
  });

  it('leaves status unchanged for an already cancelled workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('cancelled');

    const result = await engine.cancelWorkflow({ workflow });

    expect(result.status).toBe('cancelled');
    expect(result.metadata.revision).toBe(workflow.metadata.revision);
  });

  it('rejects a malformed request (missing workflow) with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.cancelWorkflow({ workflow: undefined as unknown as Workflow }),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('rejects a null request with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.cancelWorkflow(null as unknown as Parameters<typeof engine.cancelWorkflow>[0]),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('produces deterministic output for identical input', async () => {
    const engine = new OrchestratorEngine();

    const first = await engine.cancelWorkflow({ workflow: buildWorkflowWithStatus('running') });
    const second = await engine.cancelWorkflow({ workflow: buildWorkflowWithStatus('running') });

    expect(first).toEqual(second);
  });

  it('never mutates the supplied Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowWithStatus('running');
    const snapshot = JSON.parse(JSON.stringify(workflow));

    await engine.cancelWorkflow({ workflow });

    expect(workflow).toEqual(snapshot);
  });

  it('leaves orchestrate(), executeWorkflow(), and getWorkflowStatus() unchanged in Milestone 6', async () => {
    const engine = new OrchestratorEngine();
    const plan = buildPlanFixture();

    const workflow = await engine.orchestrate({ plan });
    expect(workflow.workflowId).toBe('workflow-plan-1');

    const validationResult = await engine.executeWorkflow({ workflow });
    expect(validationResult.valid).toBe(true);

    const summary = await engine.getWorkflowStatus({ workflow });
    expect(summary.workflowId).toBe(workflow.workflowId);
  });

  it('leaves the runtime lifecycle contract unchanged in Milestone 6', async () => {
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
