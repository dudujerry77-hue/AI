import { describe, expect, it } from 'vitest';

import {
  PlannerEngine,
  NotImplementedError,
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

  it('returns stub behavior by throwing NotImplementedError for planner APIs', async () => {
    const engine = new PlannerEngine();

    await expect(engine.createPlan({ goal: sampleGoal, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.validatePlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.optimizePlan({ plan: samplePlan, constraints: samplePlan.constraints })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.estimatePlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.explainPlan({ plan: samplePlan, context: sampleContext })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.cancelPlan({ planId: 'plan-1', reason: 'test' })).rejects.toBeInstanceOf(NotImplementedError);
  });
});
