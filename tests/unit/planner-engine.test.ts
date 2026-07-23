import { describe, expect, it } from 'vitest';

import {
  PlannerEngine,
  GoalAnalyzer,
  GoalDecomposer,
  PlanValidator,
  PlanOptimizer,
  PlanEstimator,
  PlanExplainer,
  NotImplementedError,
  PlanningValidationError,
  type Goal,
  type Plan,
  type PlannerCreatePlanRequest,
  type PlannerValidatePlanRequest,
  type PlannerEstimatePlanRequest,
  type PlannerExplainPlanRequest,
  type PlanningContext,
} from '../../engines/planner/src';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';


type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? ((<T>() => T extends B ? 1 : 2) extends (<T>() => T extends A ? 1 : 2) ? true : false)
    : false;

type Expect<T extends true> = T;

const sampleContext: PlanningContext = {
  actorId: 'planner-user-1',
  sessionId: 'session-1',
  phaseId: '008',
  assumptions: ['scope is milestone 2 types only'],
  inputs: { source: 'unit-test' },
};

const sampleGoal: Goal = {
  goalId: 'goal-1',
  title: 'Planner Milestone 2 Domain Model',
  description: 'Define planner domain types only',
  type: 'feature',
  priority: 'high',
  status: 'ready',
  createdAt: '2026-07-10T00:00:00.000Z',
  updatedAt: '2026-07-10T00:00:00.000Z',
  tags: ['planner', 'types'],
};

const samplePlan: Plan = {
  planId: 'plan-1',
  goalId: sampleGoal.goalId,
  status: 'draft',
  metadata: {
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
    createdBy: 'planner-user-1',
    revision: 1,
    labels: ['milestone-2'],
  },
  steps: [
    {
      stepId: 'step-1',
      title: 'Model Definition',
      description: 'Define immutable planner domain model types',
      type: 'design',
      status: 'pending',
      taskIds: ['task-1'],
    },
  ],
  tasks: [
    {
      taskId: 'task-1',
      stepId: 'step-1',
      title: 'Create planner domain types',
      description: 'Add planner model/type definitions',
      status: 'pending',
    },
  ],
  dependencies: [
    {
      dependencyId: 'dep-1',
      type: 'requires',
      sourceId: 'task-1',
      targetId: 'step-1',
      reason: 'task must complete before step review',
    },
  ],
  constraints: [
    {
      constraintId: 'constraint-1',
      type: 'compliance',
      description: 'No planning logic in milestone 2',
      required: true,
      value: true,
    },
  ],
};

describe('Planner Engine Milestone 1', () => {
  it('supports the runtime lifecycle contract', async () => {
    const engine = new PlannerEngine();

    expect(engine.getState()).toBe('created');

    await engine.initialize();
    expect(engine.getState()).toBe('initialized');

    await engine.start();
    expect(engine.getState()).toBe('running');

    await engine.stop();
    expect(engine.getState()).toBe('stopped');
  });

  it('exposes metadata and runtime contract version', () => {
    const engine = new PlannerEngine();
    const metadata = engine.metadata();

    expect(metadata.id).toBe('planner-engine');
    expect(metadata.name).toBe('Planner Engine');
    expect(metadata.version).toBe('1.0.0');
    expect(metadata.contractVersion).toBe(ENGINE_API_CONTRACT_VERSION);
    expect(metadata.capabilities).toEqual([
      'planner.create-plan',
      'planner.validate-plan',
      'planner.optimize-plan',
      'planner.estimate-plan',
      'planner.explain-plan',
      'planner.cancel-plan',
    ]);
  });

  it('reports health through the runtime health contract', async () => {
    const engine = new PlannerEngine();

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

  it('defines Planner API methods', () => {
    const engine = new PlannerEngine();

    expect(typeof engine.createPlan).toBe('function');
    expect(typeof engine.validatePlan).toBe('function');
    expect(typeof engine.optimizePlan).toBe('function');
    expect(typeof engine.estimatePlan).toBe('function');
    expect(typeof engine.explainPlan).toBe('function');
    expect(typeof engine.cancelPlan).toBe('function');
  });

  it('exports planner domain models and allows typed construction examples', () => {
    const createRequest: PlannerCreatePlanRequest = {
      goal: sampleGoal,
      context: sampleContext,
    };
    const validateRequest: PlannerValidatePlanRequest = {
      plan: samplePlan,
      context: sampleContext,
    };
    const estimateRequest: PlannerEstimatePlanRequest = {
      plan: samplePlan,
      context: sampleContext,
    };
    const explainRequest: PlannerExplainPlanRequest = {
      plan: samplePlan,
      context: sampleContext,
    };

    expect(createRequest.goal.goalId).toBe('goal-1');
    expect(validateRequest.plan.planId).toBe('plan-1');
    expect(estimateRequest.plan.constraints[0].type).toBe('compliance');
    expect(explainRequest.context?.actorId).toBe('planner-user-1');
  });

  it('uses domain model-based method signatures for planner APIs', () => {
    const createSignatureCheck: Expect<
      IsEqual<Parameters<PlannerEngine['createPlan']>[0], PlannerCreatePlanRequest>
    > = true;
    const validateSignatureCheck: Expect<
      IsEqual<Parameters<PlannerEngine['validatePlan']>[0], PlannerValidatePlanRequest>
    > = true;
    const estimateSignatureCheck: Expect<
      IsEqual<Parameters<PlannerEngine['estimatePlan']>[0], PlannerEstimatePlanRequest>
    > = true;
    const explainSignatureCheck: Expect<
      IsEqual<Parameters<PlannerEngine['explainPlan']>[0], PlannerExplainPlanRequest>
    > = true;

    expect(createSignatureCheck).toBe(true);
    expect(validateSignatureCheck).toBe(true);
    expect(estimateSignatureCheck).toBe(true);
    expect(explainSignatureCheck).toBe(true);
  });

  it('returns stub behavior by throwing NotImplementedError for cancelPlan', async () => {
    const engine = new PlannerEngine();

    await expect(engine.cancelPlan({ planId: 'plan-1', reason: 'test' })).rejects.toBeInstanceOf(NotImplementedError);
  });
});

describe('GoalAnalyzer (Milestone 3)', () => {
  it('marks a fully valid goal as valid with no issues', () => {
    const analyzer = new GoalAnalyzer();
    const result = analyzer.analyze(sampleGoal);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.goalId).toBe(sampleGoal.goalId);
  });

  it('is deterministic: analyzing the same goal repeatedly yields the same result', () => {
    const analyzer = new GoalAnalyzer();
    const first = analyzer.analyze(sampleGoal);
    const second = analyzer.analyze(sampleGoal);

    expect(second).toEqual(first);
  });

  it('reports required-field issues for missing fields', () => {
    const analyzer = new GoalAnalyzer();
    const invalidGoal = {
      ...sampleGoal,
      goalId: '',
      title: '',
    } as Goal;

    const result = analyzer.analyze(invalidGoal);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'goalId' && issue.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'title' && issue.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
  });

  it('reports invalid-enum-value issues for bad type/priority/status', () => {
    const analyzer = new GoalAnalyzer();
    const invalidGoal = {
      ...sampleGoal,
      type: 'not-a-real-type',
      priority: 'not-a-real-priority',
      status: 'not-a-real-status',
    } as unknown as Goal;

    const result = analyzer.analyze(invalidGoal);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'type' && issue.code === 'INVALID_ENUM_VALUE')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'priority' && issue.code === 'INVALID_ENUM_VALUE')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'status' && issue.code === 'INVALID_ENUM_VALUE')).toBe(true);
  });

  it('reports invalid-timestamp issues for malformed createdAt/updatedAt', () => {
    const analyzer = new GoalAnalyzer();
    const invalidGoal = {
      ...sampleGoal,
      createdAt: 'not-a-timestamp',
      updatedAt: 'also-not-a-timestamp',
    } as Goal;

    const result = analyzer.analyze(invalidGoal);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'createdAt' && issue.code === 'INVALID_TIMESTAMP')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'updatedAt' && issue.code === 'INVALID_TIMESTAMP')).toBe(true);
  });

  it('reports a timestamp-order issue when updatedAt precedes createdAt', () => {
    const analyzer = new GoalAnalyzer();
    const invalidGoal: Goal = {
      ...sampleGoal,
      createdAt: '2026-07-10T12:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    };

    const result = analyzer.analyze(invalidGoal);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'updatedAt' && issue.code === 'TIMESTAMP_ORDER_INVALID')).toBe(true);
  });
});

describe('GoalDecomposer (Milestone 3)', () => {
  it('deterministically decomposes a goal into a fixed static plan shape', () => {
    const decomposer = new GoalDecomposer();
    const plan = decomposer.decompose(sampleGoal);

    expect(plan.goalId).toBe(sampleGoal.goalId);
    expect(plan.status).toBe('draft');
    expect(plan.steps).toHaveLength(5);
    expect(plan.tasks).toHaveLength(5);
    expect(plan.steps.map((step) => step.stepId)).toEqual([
      'step-analysis',
      'step-design',
      'step-implementation',
      'step-validation',
      'step-documentation',
    ]);
    expect(plan.tasks.map((task) => task.taskId)).toEqual([
      'task-analysis',
      'task-design',
      'task-implementation',
      'task-validation',
      'task-documentation',
    ]);
  });

  it('produces sequential dependencies between consecutive steps and task-requires-step edges', () => {
    const decomposer = new GoalDecomposer();
    const plan = decomposer.decompose(sampleGoal);

    const sequentialDeps = plan.dependencies.filter((dependency) => dependency.type === 'sequential');
    const requiresDeps = plan.dependencies.filter((dependency) => dependency.type === 'requires');

    expect(sequentialDeps).toHaveLength(4);
    expect(requiresDeps).toHaveLength(5);
    expect(sequentialDeps[0]).toMatchObject({
      sourceId: 'step-analysis',
      targetId: 'step-design',
    });
  });

  it('is deterministic: decomposing the same goal repeatedly yields an identical plan shape', () => {
    const decomposer = new GoalDecomposer();
    const first = decomposer.decompose(sampleGoal);
    const second = decomposer.decompose(sampleGoal);

    expect(second).toEqual(first);
  });

  it('performs no scheduling, execution, or optimization: all steps/tasks start pending', () => {
    const decomposer = new GoalDecomposer();
    const plan = decomposer.decompose(sampleGoal);

    expect(plan.steps.every((step) => step.status === 'pending')).toBe(true);
    expect(plan.tasks.every((task) => task.status === 'pending')).toBe(true);
  });
});

describe('PlannerEngine.createPlan (Milestone 3)', () => {
  it('returns a deterministic Plan for a valid goal', async () => {
    const engine = new PlannerEngine();

    const plan = await engine.createPlan({ goal: sampleGoal, context: sampleContext });

    expect(plan.goalId).toBe(sampleGoal.goalId);
    expect(plan.steps).toHaveLength(5);
    expect(plan.tasks).toHaveLength(5);
  });

  it('produces the same Plan shape across repeated calls for the same goal', async () => {
    const engine = new PlannerEngine();

    const first = await engine.createPlan({ goal: sampleGoal, context: sampleContext });
    const second = await engine.createPlan({ goal: sampleGoal, context: sampleContext });

    expect(second).toEqual(first);
  });

  it('throws PlanningValidationError for an invalid goal and does not return a Plan', async () => {
    const engine = new PlannerEngine();
    const invalidGoal = {
      ...sampleGoal,
      title: '',
      type: 'not-a-real-type',
    } as unknown as Goal;

    await expect(engine.createPlan({ goal: invalidGoal, context: sampleContext })).rejects.toBeInstanceOf(
      PlanningValidationError,
    );
  });
});

describe('PlanValidator (Milestone 4)', () => {
  it('marks a fully valid plan as valid with no issues', () => {
    const validator = new PlanValidator();
    const result = validator.validate(samplePlan);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.planId).toBe(samplePlan.planId);
  });

  it('reports a missing planId', () => {
    const validator = new PlanValidator();
    const invalidPlan = { ...samplePlan, planId: '' } as Plan;

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'planId' && issue.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
  });

  it('reports a missing goalId', () => {
    const validator = new PlanValidator();
    const invalidPlan = { ...samplePlan, goalId: '' } as Plan;

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'goalId' && issue.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
  });

  it('reports an invalid plan status', () => {
    const validator = new PlanValidator();
    const invalidPlan = { ...samplePlan, status: 'not-a-real-status' } as unknown as Plan;

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'status' && issue.code === 'INVALID_ENUM_VALUE')).toBe(true);
  });

  it('reports duplicate step IDs', () => {
    const validator = new PlanValidator();
    const invalidPlan: Plan = {
      ...samplePlan,
      steps: [...samplePlan.steps, { ...samplePlan.steps[0] }],
    };

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_ID' && issue.field.startsWith('steps['))).toBe(true);
  });

  it('reports duplicate task IDs', () => {
    const validator = new PlanValidator();
    const invalidPlan: Plan = {
      ...samplePlan,
      tasks: [...samplePlan.tasks, { ...samplePlan.tasks[0] }],
    };

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_ID' && issue.field.startsWith('tasks['))).toBe(true);
  });

  it('reports invalid metadata', () => {
    const validator = new PlanValidator();
    const invalidPlan: Plan = {
      ...samplePlan,
      metadata: {
        ...samplePlan.metadata,
        createdAt: 'not-a-timestamp',
        createdBy: '',
        revision: 0,
      },
    };

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'metadata.createdAt' && issue.code === 'INVALID_TIMESTAMP')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'metadata.createdBy' && issue.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'metadata.revision' && issue.code === 'INVALID_FIELD_VALUE')).toBe(true);
  });

  it('reports a dependency referencing unknown IDs', () => {
    const validator = new PlanValidator();
    const invalidPlan: Plan = {
      ...samplePlan,
      dependencies: [
        {
          dependencyId: 'dep-unknown',
          type: 'requires',
          sourceId: 'task-does-not-exist',
          targetId: 'step-does-not-exist',
        },
      ],
    };

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'dependencies[0].sourceId' && issue.code === 'UNKNOWN_REFERENCE')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'dependencies[0].targetId' && issue.code === 'UNKNOWN_REFERENCE')).toBe(true);
  });

  it('reports a duplicate dependency', () => {
    const validator = new PlanValidator();
    const invalidPlan: Plan = {
      ...samplePlan,
      dependencies: [
        ...samplePlan.dependencies,
        {
          dependencyId: 'dep-2',
          type: 'requires',
          sourceId: 'task-1',
          targetId: 'step-1',
        },
      ],
    };

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_DEPENDENCY')).toBe(true);
  });

  it('rejects a self-dependency', () => {
    const validator = new PlanValidator();
    const invalidPlan: Plan = {
      ...samplePlan,
      dependencies: [
        {
          dependencyId: 'dep-self',
          type: 'related',
          sourceId: 'step-1',
          targetId: 'step-1',
        },
      ],
    };

    const result = validator.validate(invalidPlan);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'SELF_DEPENDENCY')).toBe(true);
  });

  it('throws PlanningValidationError for malformed input (null, undefined, non-object)', () => {
    const validator = new PlanValidator();

    expect(() => validator.validate(null as unknown as Plan)).toThrow(PlanningValidationError);
    expect(() => validator.validate(undefined as unknown as Plan)).toThrow(PlanningValidationError);
    expect(() => validator.validate('not-an-object' as unknown as Plan)).toThrow(PlanningValidationError);
  });

  it('is deterministic: validating the same plan repeatedly yields the same result', () => {
    const validator = new PlanValidator();
    const first = validator.validate(samplePlan);
    const second = validator.validate(samplePlan);

    expect(second).toEqual(first);
  });
});

describe('PlannerEngine.validatePlan (Milestone 4)', () => {
  it('delegates to PlanValidator and returns a valid PlanValidationResult for a valid plan', async () => {
    const engine = new PlannerEngine();

    const result = await engine.validatePlan({ plan: samplePlan, context: sampleContext });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.planId).toBe(samplePlan.planId);
  });

  it('returns issues for an invalid plan instead of throwing', async () => {
    const engine = new PlannerEngine();
    const invalidPlan = { ...samplePlan, planId: '' } as Plan;

    const result = await engine.validatePlan({ plan: invalidPlan, context: sampleContext });

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('still allows createPlan to work unchanged', async () => {
    const engine = new PlannerEngine();

    const plan = await engine.createPlan({ goal: sampleGoal, context: sampleContext });

    expect(plan.goalId).toBe(sampleGoal.goalId);
    expect(plan.steps).toHaveLength(5);
    expect(plan.tasks).toHaveLength(5);
  });
});

const unorderedPlan: Plan = {
  planId: 'plan-unordered',
  goalId: 'goal-unordered',
  status: 'draft',
  metadata: {
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
    createdBy: 'planner-user-1',
    revision: 1,
    labels: [],
  },
  steps: [
    {
      stepId: 'step-b',
      title: 'Step B',
      description: 'Second step',
      type: 'design',
      status: 'pending',
      taskIds: ['task-b2', 'task-b1', 'task-b1'],
    },
    {
      stepId: 'step-a',
      title: 'Step A',
      description: 'First step',
      type: 'analysis',
      status: 'pending',
      taskIds: ['task-a1'],
      dependsOnStepIds: [],
    },
  ],
  tasks: [
    {
      taskId: 'task-b1',
      stepId: 'step-b',
      title: 'Task B1',
      description: 'First task of step B',
      status: 'pending',
    },
    {
      taskId: 'task-a1',
      stepId: 'step-a',
      title: 'Task A1',
      description: 'First task of step A',
      status: 'pending',
    },
    {
      taskId: 'task-b2',
      stepId: 'step-b',
      title: 'Task B2',
      description: 'Second task of step B',
      status: 'pending',
    },
  ],
  dependencies: [
    {
      dependencyId: 'dep-2',
      type: 'requires',
      sourceId: 'task-b1',
      targetId: 'step-b',
    },
    {
      dependencyId: 'dep-1',
      type: 'sequential',
      sourceId: 'step-a',
      targetId: 'step-b',
    },
  ],
  constraints: [],
};

const unorderedPlanWithDuplicateDependency: Plan = {
  ...unorderedPlan,
  dependencies: [
    ...unorderedPlan.dependencies,
    {
      dependencyId: 'dep-1-duplicate',
      type: 'sequential',
      sourceId: 'step-a',
      targetId: 'step-b',
    },
  ],
};

describe('PlanOptimizer (Milestone 5)', () => {
  it('returns a new, valid, optimized Plan for a valid plan', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(samplePlan);

    expect(optimized.planId).toBe(samplePlan.planId);
    expect(optimized.goalId).toBe(samplePlan.goalId);
    expect(optimized).not.toBe(samplePlan);
  });

  it('is deterministic: optimizing the same plan repeatedly yields the same result', () => {
    const optimizer = new PlanOptimizer();
    const first = optimizer.optimize(samplePlan);
    const second = optimizer.optimize(samplePlan);

    expect(second).toEqual(first);
  });

  it('never mutates the original Plan', () => {
    const optimizer = new PlanOptimizer();
    const originalSnapshot = JSON.parse(JSON.stringify(samplePlan));

    optimizer.optimize(samplePlan);

    expect(samplePlan).toEqual(originalSnapshot);
  });

  it('preserves all step, task, and dependency IDs', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(unorderedPlan);

    const originalStepIds = new Set(unorderedPlan.steps.map((step) => step.stepId));
    const optimizedStepIds = new Set(optimized.steps.map((step) => step.stepId));
    expect(optimizedStepIds).toEqual(originalStepIds);

    const originalTaskIds = new Set(unorderedPlan.tasks.map((task) => task.taskId));
    const optimizedTaskIds = new Set(optimized.tasks.map((task) => task.taskId));
    expect(optimizedTaskIds).toEqual(originalTaskIds);
  });

  it('removes duplicate dependencies (same type + sourceId + targetId)', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(unorderedPlanWithDuplicateDependency);

    const sequentialAtoB = optimized.dependencies.filter(
      (dependency) =>
        dependency.type === 'sequential' && dependency.sourceId === 'step-a' && dependency.targetId === 'step-b',
    );

    expect(sequentialAtoB).toHaveLength(1);
    expect(optimized.dependencies).toHaveLength(2);
  });

  it('normalizes dependency ordering deterministically', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(unorderedPlan);

    expect(optimized.dependencies.map((dependency) => dependency.dependencyId)).toEqual([
      'dep-2',
      'dep-1',
    ]);
  });

  it('is deterministic and produces a validator-passing Plan for the deduplicated dependency case', () => {
    const optimizer = new PlanOptimizer();
    const validator = new PlanValidator();
    const optimized = optimizer.optimize(unorderedPlanWithDuplicateDependency);

    const result = validator.validate(optimized);
    expect(result.valid).toBe(true);
  });

  it('normalizes step ordering deterministically by stepId', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(unorderedPlan);

    expect(optimized.steps.map((step) => step.stepId)).toEqual(['step-a', 'step-b']);
  });

  it('normalizes task ordering deterministically by taskId', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(unorderedPlan);

    expect(optimized.tasks.map((task) => task.taskId)).toEqual(['task-a1', 'task-b1', 'task-b2']);
  });

  it('deduplicates and sorts taskIds within a step', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(unorderedPlan);

    const stepB = optimized.steps.find((step) => step.stepId === 'step-b');
    expect(stepB?.taskIds).toEqual(['task-b1', 'task-b2']);
  });

  it('removes redundant empty collections (empty labels, empty dependsOnStepIds)', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(unorderedPlan);

    expect(optimized.metadata.labels).toBeUndefined();

    const stepA = optimized.steps.find((step) => step.stepId === 'step-a');
    expect(stepA?.dependsOnStepIds).toBeUndefined();
  });

  it('increments metadata.revision by exactly 1 and preserves createdAt/createdBy', () => {
    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(samplePlan);

    expect(optimized.metadata.revision).toBe(samplePlan.metadata.revision + 1);
    expect(optimized.metadata.createdAt).toBe(samplePlan.metadata.createdAt);
    expect(optimized.metadata.createdBy).toBe(samplePlan.metadata.createdBy);
  });
});

describe('PlannerEngine.optimizePlan (Milestone 5)', () => {
  it('validates the plan, then delegates to PlanOptimizer and returns the optimized Plan', async () => {
    const engine = new PlannerEngine();

    const optimized = await engine.optimizePlan({ plan: unorderedPlan });

    expect(optimized.steps.map((step) => step.stepId)).toEqual(['step-a', 'step-b']);
    expect(optimized.tasks.map((task) => task.taskId)).toEqual(['task-a1', 'task-b1', 'task-b2']);
    expect(optimized.dependencies).toHaveLength(2);
  });

  it('throws PlanningValidationError and does not optimize an invalid plan', async () => {
    const engine = new PlannerEngine();
    const invalidPlan = { ...samplePlan, planId: '' } as Plan;

    await expect(engine.optimizePlan({ plan: invalidPlan })).rejects.toBeInstanceOf(PlanningValidationError);
  });

  it('is deterministic: optimizing the same plan repeatedly yields the same result', async () => {
    const engine = new PlannerEngine();

    const first = await engine.optimizePlan({ plan: samplePlan });
    const second = await engine.optimizePlan({ plan: samplePlan });

    expect(second).toEqual(first);
  });

  it('still allows createPlan to work unchanged', async () => {
    const engine = new PlannerEngine();

    const plan = await engine.createPlan({ goal: sampleGoal, context: sampleContext });

    expect(plan.goalId).toBe(sampleGoal.goalId);
    expect(plan.steps).toHaveLength(5);
    expect(plan.tasks).toHaveLength(5);
  });

  it('still allows validatePlan to work unchanged', async () => {
    const engine = new PlannerEngine();

    const result = await engine.validatePlan({ plan: samplePlan, context: sampleContext });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe('PlanEstimator (Milestone 6)', () => {
  it('returns a valid PlanEstimate with structural counts for a valid plan', () => {
    const estimator = new PlanEstimator();
    const estimate = estimator.estimate(samplePlan);

    expect(estimate.totalSteps).toBe(samplePlan.steps.length);
    expect(estimate.totalTasks).toBe(samplePlan.tasks.length);
    expect(estimate.dependencyCount).toBe(samplePlan.dependencies.length);
    expect(typeof estimate.estimatedDurationHours).toBe('number');
    expect(typeof estimate.estimatedEffortHours).toBe('number');
    expect(['low', 'medium', 'high']).toContain(estimate.complexityLevel);
  });

  it('is deterministic: estimating the same plan repeatedly yields the same result', () => {
    const estimator = new PlanEstimator();
    const first = estimator.estimate(samplePlan);
    const second = estimator.estimate(samplePlan);

    expect(second).toEqual(first);
  });

  it('never mutates the original Plan', () => {
    const estimator = new PlanEstimator();
    const originalSnapshot = JSON.parse(JSON.stringify(samplePlan));

    estimator.estimate(samplePlan);

    expect(samplePlan).toEqual(originalSnapshot);
  });

  it('reports higher complexity for a larger plan', () => {
    const estimator = new PlanEstimator();

    const smallEstimate = estimator.estimate(samplePlan);

    const largePlan: Plan = {
      ...samplePlan,
      steps: Array.from({ length: 10 }, (_, index) => ({
        stepId: `step-${index}`,
        title: `Step ${index}`,
        description: `Step ${index} description`,
        type: 'implementation' as const,
        status: 'pending' as const,
        taskIds: [`task-${index}`],
      })),
      tasks: Array.from({ length: 10 }, (_, index) => ({
        taskId: `task-${index}`,
        stepId: `step-${index}`,
        title: `Task ${index}`,
        description: `Task ${index} description`,
        status: 'pending' as const,
      })),
      dependencies: Array.from({ length: 9 }, (_, index) => ({
        dependencyId: `dep-${index}`,
        type: 'sequential' as const,
        sourceId: `step-${index}`,
        targetId: `step-${index + 1}`,
      })),
    };

    const largeEstimate = estimator.estimate(largePlan);

    expect(largeEstimate.totalSteps).toBeGreaterThan(smallEstimate.totalSteps ?? 0);
    expect(largeEstimate.complexityLevel).not.toBe('low');
  });
});

describe('PlanExplainer (Milestone 6)', () => {
  it('returns a valid PlanExplanation using only existing plan information', () => {
    const explainer = new PlanExplainer();
    const explanation = explainer.explain(samplePlan);

    expect(explanation.planId).toBe(samplePlan.planId);
    expect(explanation.stepCount).toBe(samplePlan.steps.length);
    expect(explanation.taskCount).toBe(samplePlan.tasks.length);
    expect(explanation.executionOrder).toEqual(samplePlan.steps.map((step) => step.stepId));
    expect(explanation.dependencySummary?.total).toBe(samplePlan.dependencies.length);
    expect(explanation.validationStatus?.valid).toBe(true);
    expect(explanation.validationStatus?.issueCount).toBe(0);
  });

  it('is deterministic: explaining the same plan repeatedly yields the same result', () => {
    const explainer = new PlanExplainer();
    const first = explainer.explain(samplePlan);
    const second = explainer.explain(samplePlan);

    expect(second).toEqual(first);
  });

  it('never mutates the original Plan', () => {
    const explainer = new PlanExplainer();
    const originalSnapshot = JSON.parse(JSON.stringify(samplePlan));

    explainer.explain(samplePlan);

    expect(samplePlan).toEqual(originalSnapshot);
  });

  it('reports a dependencySummary broken down by dependency type using only existing dependencies', () => {
    const explainer = new PlanExplainer();
    const explanation = explainer.explain(unorderedPlan);

    expect(explanation.dependencySummary?.total).toBe(unorderedPlan.dependencies.length);
    expect(explanation.dependencySummary?.byType.sequential).toBe(1);
    expect(explanation.dependencySummary?.byType.requires).toBe(1);
    expect(explanation.dependencySummary?.byType.blocks).toBe(0);
  });

  it('reports validationStatus reflecting an invalid plan without altering the input', () => {
    const explainer = new PlanExplainer();
    const invalidPlan = { ...samplePlan, planId: '' } as Plan;

    const explanation = explainer.explain(invalidPlan);

    expect(explanation.validationStatus?.valid).toBe(false);
    expect(explanation.validationStatus?.issueCount).toBeGreaterThan(0);
  });
});

describe('PlannerEngine.estimatePlan (Milestone 6)', () => {
  it('validates the plan, then delegates to PlanEstimator and returns the PlanEstimate', async () => {
    const engine = new PlannerEngine();

    const estimate = await engine.estimatePlan({ plan: samplePlan, context: sampleContext });

    expect(estimate.totalSteps).toBe(samplePlan.steps.length);
    expect(estimate.totalTasks).toBe(samplePlan.tasks.length);
    expect(estimate.dependencyCount).toBe(samplePlan.dependencies.length);
  });

  it('throws PlanningValidationError and does not estimate an invalid plan', async () => {
    const engine = new PlannerEngine();
    const invalidPlan = { ...samplePlan, planId: '' } as Plan;

    await expect(engine.estimatePlan({ plan: invalidPlan })).rejects.toBeInstanceOf(PlanningValidationError);
  });

  it('is deterministic: estimating the same plan repeatedly yields the same result', async () => {
    const engine = new PlannerEngine();

    const first = await engine.estimatePlan({ plan: samplePlan });
    const second = await engine.estimatePlan({ plan: samplePlan });

    expect(second).toEqual(first);
  });
});

describe('PlannerEngine.explainPlan (Milestone 6)', () => {
  it('validates the plan, then delegates to PlanExplainer and returns the PlanExplanation', async () => {
    const engine = new PlannerEngine();

    const explanation = await engine.explainPlan({ plan: samplePlan, context: sampleContext });

    expect(explanation.planId).toBe(samplePlan.planId);
    expect(explanation.stepCount).toBe(samplePlan.steps.length);
    expect(explanation.taskCount).toBe(samplePlan.tasks.length);
    expect(explanation.validationStatus?.valid).toBe(true);
  });

  it('throws PlanningValidationError and does not explain an invalid plan', async () => {
    const engine = new PlannerEngine();
    const invalidPlan = { ...samplePlan, planId: '' } as Plan;

    await expect(engine.explainPlan({ plan: invalidPlan })).rejects.toBeInstanceOf(PlanningValidationError);
  });

  it('is deterministic: explaining the same plan repeatedly yields the same result', async () => {
    const engine = new PlannerEngine();

    const first = await engine.explainPlan({ plan: samplePlan });
    const second = await engine.explainPlan({ plan: samplePlan });

    expect(second).toEqual(first);
  });
});

describe('PlannerEngine Milestone 6 regression checks', () => {
  it('still allows createPlan to work unchanged', async () => {
    const engine = new PlannerEngine();

    const plan = await engine.createPlan({ goal: sampleGoal, context: sampleContext });

    expect(plan.goalId).toBe(sampleGoal.goalId);
    expect(plan.steps).toHaveLength(5);
    expect(plan.tasks).toHaveLength(5);
  });

  it('still allows validatePlan to work unchanged', async () => {
    const engine = new PlannerEngine();

    const result = await engine.validatePlan({ plan: samplePlan, context: sampleContext });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('still allows optimizePlan to work unchanged', async () => {
    const engine = new PlannerEngine();

    const optimized = await engine.optimizePlan({ plan: unorderedPlan });

    expect(optimized.steps.map((step) => step.stepId)).toEqual(['step-a', 'step-b']);
    expect(optimized.tasks.map((task) => task.taskId)).toEqual(['task-a1', 'task-b1', 'task-b2']);
  });

  it('still throws NotImplementedError for cancelPlan', async () => {
    const engine = new PlannerEngine();

    await expect(engine.cancelPlan({ planId: 'plan-1', reason: 'test' })).rejects.toBeInstanceOf(NotImplementedError);
  });
});
