import { describe, expect, it } from 'vitest';

import {
  PlannerEngine,
  GoalAnalyzer,
  GoalDecomposer,
  PlanValidator,
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

  it('returns stub behavior by throwing NotImplementedError for the remaining planner APIs', async () => {
    const engine = new PlannerEngine();

    await expect(engine.optimizePlan({ plan: samplePlan, constraints: samplePlan.constraints })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.estimatePlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.explainPlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
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

  it('still throws NotImplementedError for optimizePlan, estimatePlan, explainPlan, and cancelPlan', async () => {
    const engine = new PlannerEngine();

    await expect(engine.optimizePlan({ plan: samplePlan, constraints: samplePlan.constraints })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.estimatePlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.explainPlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.cancelPlan({ planId: 'plan-1', reason: 'test' })).rejects.toBeInstanceOf(NotImplementedError);
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

  it('still throws NotImplementedError for optimizePlan, estimatePlan, explainPlan, and cancelPlan', async () => {
    const engine = new PlannerEngine();

    await expect(engine.optimizePlan({ plan: samplePlan, constraints: samplePlan.constraints })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.estimatePlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.explainPlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.cancelPlan({ planId: 'plan-1', reason: 'test' })).rejects.toBeInstanceOf(NotImplementedError);
  });
});
