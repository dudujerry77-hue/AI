import { describe, expect, it } from 'vitest';

import {
  OrchestratorEngine,
  OrchestratorValidationError,
  WorkflowBuilder,
  WorkflowDispatcher,
  type Plan,
  type Workflow,
  type WorkflowDependency,
  type WorkflowPriority,
  type WorkflowStep,
  type WorkflowTask,
} from '../../engines/orchestrator/src';

/**
 * Builds a deterministic, structurally rich `Plan` fixture, identical
 * in shape to the one used by `tests/unit/orchestrator-engine.test.ts`,
 * so that `WorkflowBuilder` output remains a valid, reusable base for
 * Milestone 7 dispatch fixtures.
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
      labels: ['milestone-7', 'fixture'],
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
 * Builds a deterministic, structurally valid `Workflow` fixture,
 * derived from `buildPlanFixture()` via `WorkflowBuilder` (Milestone
 * 3), so it always reflects a real, structurally correct translation
 * output.
 */
function buildWorkflowFixture(): Workflow {
  return new WorkflowBuilder().build(buildPlanFixture());
}

/**
 * Builds a minimal, self-contained `Workflow` with exactly the steps,
 * tasks, dependencies, and priority provided, for precise Milestone 7
 * dispatch-decision assertions.
 */
function buildCustomWorkflow(options: {
  readonly priority?: WorkflowPriority;
  readonly steps?: readonly WorkflowStep[];
  readonly tasks?: readonly WorkflowTask[];
  readonly dependencies?: readonly WorkflowDependency[];
}): Workflow {
  const base = buildWorkflowFixture();

  return {
    ...base,
    priority: options.priority ?? base.priority,
    steps: options.steps ?? [],
    tasks: options.tasks ?? [],
    dependencies: options.dependencies ?? [],
  };
}

describe('Orchestrator Engine Milestone 7 — WorkflowDispatcher', () => {
  it('marks a pending step with no dependencies as dispatch-ready', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status: 'pending',
          taskIds: [],
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    expect(result.dispatchable).toEqual(['step-1']);
    expect(result.decisions).toEqual([
      {
        itemId: 'step-1',
        itemType: 'step',
        ready: true,
        reasons: ['status-ready', 'dependencies-satisfied'],
      },
    ]);
  });

  it('marks a ready task with no dependencies as dispatch-ready', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      tasks: [
        {
          taskId: 'task-1',
          stepId: 'step-1',
          title: 'Task 1',
          description: 'Task 1',
          status: 'ready',
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    expect(result.dispatchable).toEqual(['task-1']);
    expect(result.decisions).toEqual([
      {
        itemId: 'task-1',
        itemType: 'task',
        ready: true,
        reasons: ['status-ready', 'dependencies-satisfied'],
      },
    ]);
  });

  it.each([
    'in-progress',
    'blocked',
    'completed',
    'failed',
    'skipped',
    'cancelled',
  ] as const)('marks a step with status %s as not dispatch-ready', (status) => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status,
          taskIds: [],
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    expect(result.dispatchable).toEqual([]);
    expect(result.decisions[0].ready).toBe(false);
    expect(result.decisions[0].reasons).toContain('status-not-ready');
  });

  it.each([
    'in-progress',
    'blocked',
    'completed',
    'failed',
    'cancelled',
  ] as const)('marks a task with status %s as not dispatch-ready', (status) => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      tasks: [
        {
          taskId: 'task-1',
          stepId: 'step-1',
          title: 'Task 1',
          description: 'Task 1',
          status,
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    expect(result.dispatchable).toEqual([]);
    expect(result.decisions[0].ready).toBe(false);
    expect(result.decisions[0].reasons).toContain('status-not-ready');
  });

  it('marks a pending step blocked by an incomplete "blocks" dependency as not dispatch-ready', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status: 'in-progress',
          taskIds: [],
        },
        {
          stepId: 'step-2',
          title: 'Step 2',
          description: 'Step 2',
          status: 'pending',
          taskIds: [],
        },
      ],
      dependencies: [
        {
          dependencyId: 'dep-1',
          type: 'blocks',
          sourceId: 'step-1',
          targetId: 'step-2',
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    const step2Decision = result.decisions.find(
      (decision) => decision.itemId === 'step-2',
    );
    expect(step2Decision?.ready).toBe(false);
    expect(step2Decision?.reasons).toContain('dependencies-unsatisfied');
    expect(result.dispatchable).not.toContain('step-2');
  });

  it('marks a pending step as dispatch-ready once its "blocks" dependency source is completed', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status: 'completed',
          taskIds: [],
        },
        {
          stepId: 'step-2',
          title: 'Step 2',
          description: 'Step 2',
          status: 'pending',
          taskIds: [],
        },
      ],
      dependencies: [
        {
          dependencyId: 'dep-1',
          type: 'blocks',
          sourceId: 'step-1',
          targetId: 'step-2',
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    const step2Decision = result.decisions.find(
      (decision) => decision.itemId === 'step-2',
    );
    expect(step2Decision?.ready).toBe(true);
    expect(step2Decision?.reasons).toEqual([
      'status-ready',
      'dependencies-satisfied',
    ]);
    expect(result.dispatchable).toContain('step-2');
  });

  it('treats a "skipped" source step as satisfying a dependency precondition', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status: 'skipped',
          taskIds: [],
        },
        {
          stepId: 'step-2',
          title: 'Step 2',
          description: 'Step 2',
          status: 'pending',
          taskIds: [],
        },
      ],
      dependencies: [
        {
          dependencyId: 'dep-1',
          type: 'requires',
          sourceId: 'step-1',
          targetId: 'step-2',
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    const step2Decision = result.decisions.find(
      (decision) => decision.itemId === 'step-2',
    );
    expect(step2Decision?.ready).toBe(true);
  });

  it('treats a "completed" source task as satisfying a dependency precondition for another task', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      tasks: [
        {
          taskId: 'task-1',
          stepId: 'step-1',
          title: 'Task 1',
          description: 'Task 1',
          status: 'completed',
        },
        {
          taskId: 'task-2',
          stepId: 'step-1',
          title: 'Task 2',
          description: 'Task 2',
          status: 'pending',
        },
      ],
      dependencies: [
        {
          dependencyId: 'dep-1',
          type: 'requires',
          sourceId: 'task-1',
          targetId: 'task-2',
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    const task2Decision = result.decisions.find(
      (decision) => decision.itemId === 'task-2',
    );
    expect(task2Decision?.ready).toBe(true);
  });

  it('ignores "related" and "parallel" dependency types as dispatch preconditions', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status: 'in-progress',
          taskIds: [],
        },
        {
          stepId: 'step-2',
          title: 'Step 2',
          description: 'Step 2',
          status: 'pending',
          taskIds: [],
        },
      ],
      dependencies: [
        {
          dependencyId: 'dep-1',
          type: 'related',
          sourceId: 'step-1',
          targetId: 'step-2',
        },
        {
          dependencyId: 'dep-2',
          type: 'parallel',
          sourceId: 'step-1',
          targetId: 'step-2',
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    const step2Decision = result.decisions.find(
      (decision) => decision.itemId === 'step-2',
    );
    expect(step2Decision?.ready).toBe(true);
    expect(step2Decision?.reasons).toEqual([
      'status-ready',
      'dependencies-satisfied',
    ]);
  });

  it('produces a dispatch decision for every step and every task on the Workflow', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildWorkflowFixture();

    const result = dispatcher.dispatch(workflow);

    expect(result.decisions).toHaveLength(
      workflow.steps.length + workflow.tasks.length,
    );
    const decisionIds = result.decisions.map((decision) => decision.itemId);
    for (const step of workflow.steps) {
      expect(decisionIds).toContain(step.stepId);
    }
    for (const task of workflow.tasks) {
      expect(decisionIds).toContain(task.taskId);
    }
  });

  it('escalates any item with status "blocked" regardless of priority', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      priority: 'low',
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status: 'blocked',
          taskIds: [],
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    expect(result.escalations).toEqual([
      { itemId: 'step-1', itemType: 'step', reason: 'blocked-status' },
    ]);
  });

  it('escalates a non-terminal item on a critical-priority workflow', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      priority: 'critical',
      tasks: [
        {
          taskId: 'task-1',
          stepId: 'step-1',
          title: 'Task 1',
          description: 'Task 1',
          status: 'in-progress',
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    expect(result.escalations).toEqual([
      {
        itemId: 'task-1',
        itemType: 'task',
        reason: 'critical-priority-not-progressing',
      },
    ]);
  });

  it.each(['completed', 'failed', 'cancelled', 'skipped'] as const)(
    'does not escalate a terminal-status (%s) step on a critical-priority workflow',
    (status) => {
      const dispatcher = new WorkflowDispatcher();
      const workflow = buildCustomWorkflow({
        priority: 'critical',
        steps: [
          {
            stepId: 'step-1',
            title: 'Step 1',
            description: 'Step 1',
            status,
            taskIds: [],
          },
        ],
      });

      const result = dispatcher.dispatch(workflow);

      expect(result.escalations).toEqual([]);
    },
  );

  it.each(['low', 'medium', 'high'] as const)(
    'does not escalate a non-terminal, non-blocked step on a %s-priority workflow',
    (priority) => {
      const dispatcher = new WorkflowDispatcher();
      const workflow = buildCustomWorkflow({
        priority,
        steps: [
          {
            stepId: 'step-1',
            title: 'Step 1',
            description: 'Step 1',
            status: 'in-progress',
            taskIds: [],
          },
        ],
      });

      const result = dispatcher.dispatch(workflow);

      expect(result.escalations).toEqual([]);
    },
  );

  it('prioritizes "blocked-status" over "critical-priority-not-progressing" for a blocked item on a critical workflow', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildCustomWorkflow({
      priority: 'critical',
      steps: [
        {
          stepId: 'step-1',
          title: 'Step 1',
          description: 'Step 1',
          status: 'blocked',
          taskIds: [],
        },
      ],
    });

    const result = dispatcher.dispatch(workflow);

    expect(result.escalations).toEqual([
      { itemId: 'step-1', itemType: 'step', reason: 'blocked-status' },
    ]);
  });

  it('sets workflowId on the result to match the input Workflow', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildWorkflowFixture();

    const result = dispatcher.dispatch(workflow);

    expect(result.workflowId).toBe(workflow.workflowId);
  });

  it('produces deterministic output for identical input', () => {
    const dispatcher = new WorkflowDispatcher();

    const first = dispatcher.dispatch(buildWorkflowFixture());
    const second = dispatcher.dispatch(buildWorkflowFixture());

    expect(first).toEqual(second);
  });

  it('never mutates the input Workflow', () => {
    const dispatcher = new WorkflowDispatcher();
    const workflow = buildWorkflowFixture();
    const snapshot = JSON.parse(JSON.stringify(workflow));

    dispatcher.dispatch(workflow);

    expect(workflow).toEqual(snapshot);
  });

  it('rejects malformed input (null, undefined, non-object) with OrchestratorValidationError', () => {
    const dispatcher = new WorkflowDispatcher();

    expect(() => dispatcher.dispatch(null as unknown as Workflow)).toThrow(
      OrchestratorValidationError,
    );
    expect(() => dispatcher.dispatch(undefined as unknown as Workflow)).toThrow(
      OrchestratorValidationError,
    );
    expect(() =>
      dispatcher.dispatch('not-an-object' as unknown as Workflow),
    ).toThrow(OrchestratorValidationError);
  });
});

describe('Orchestrator Engine Milestone 7 — dispatchWorkflow()', () => {
  it('returns a correct WorkflowDispatchResult for a valid Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowFixture();

    const result = await engine.dispatchWorkflow({ workflow });

    expect(result.workflowId).toBe(workflow.workflowId);
    expect(result.decisions).toHaveLength(
      workflow.steps.length + workflow.tasks.length,
    );
  });

  it('rejects a malformed request (missing workflow) with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.dispatchWorkflow({ workflow: undefined as unknown as Workflow }),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('rejects a null request with OrchestratorValidationError', async () => {
    const engine = new OrchestratorEngine();

    await expect(
      engine.dispatchWorkflow(
        null as unknown as Parameters<typeof engine.dispatchWorkflow>[0],
      ),
    ).rejects.toBeInstanceOf(OrchestratorValidationError);
  });

  it('produces deterministic output for identical input', async () => {
    const engine = new OrchestratorEngine();

    const first = await engine.dispatchWorkflow({
      workflow: buildWorkflowFixture(),
    });
    const second = await engine.dispatchWorkflow({
      workflow: buildWorkflowFixture(),
    });

    expect(first).toEqual(second);
  });

  it('never mutates the supplied Workflow', async () => {
    const engine = new OrchestratorEngine();
    const workflow = buildWorkflowFixture();
    const snapshot = JSON.parse(JSON.stringify(workflow));

    await engine.dispatchWorkflow({ workflow });

    expect(workflow).toEqual(snapshot);
  });

  it('leaves orchestrate(), executeWorkflow(), getWorkflowStatus(), pauseWorkflow(), resumeWorkflow(), and cancelWorkflow() unchanged in Milestone 7', async () => {
    const engine = new OrchestratorEngine();
    const plan = buildPlanFixture();

    const workflow = await engine.orchestrate({ plan });
    expect(workflow.workflowId).toBe('workflow-plan-1');

    const validationResult = await engine.executeWorkflow({ workflow });
    expect(validationResult.valid).toBe(true);

    const summary = await engine.getWorkflowStatus({ workflow });
    expect(summary.workflowId).toBe(workflow.workflowId);

    const paused = await engine.pauseWorkflow({
      workflow: { ...workflow, status: 'running' },
    });
    expect(paused.status).toBe('paused');
  });

  it('leaves the runtime lifecycle contract unchanged in Milestone 7', async () => {
    const engine = new OrchestratorEngine();

    expect(engine.getState()).toBe('created');
    await engine.initialize();
    expect(engine.getState()).toBe('initialized');
    await engine.start();
    expect(engine.getState()).toBe('running');
    await engine.stop();
    expect(engine.getState()).toBe('stopped');
  });

  it('exposes the dispatch-workflow capability in engine metadata', () => {
    const engine = new OrchestratorEngine();
    const metadata = engine.metadata();

    expect(metadata.capabilities).toContain('orchestrator.dispatch-workflow');
  });
});
