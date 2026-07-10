import { describe, expect, it } from 'vitest';

import { PlannerEngine, NotImplementedError } from '../../engines/planner/src';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

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

  it('returns stub behavior by throwing NotImplementedError for planner APIs', async () => {
    const engine = new PlannerEngine();

    await expect(engine.createPlan({ goal: 'plan milestone one' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.validatePlan({ planId: 'plan-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.optimizePlan({ planId: 'plan-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.estimatePlan({ planId: 'plan-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.explainPlan({ planId: 'plan-1' })).rejects.toBeInstanceOf(NotImplementedError);
    await expect(engine.cancelPlan({ planId: 'plan-1', reason: 'test' })).rejects.toBeInstanceOf(NotImplementedError);
  });
});
