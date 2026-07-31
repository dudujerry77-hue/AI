import { describe, expect, it } from 'vitest';

import { BaseEngine } from '../../runtime/engine/base';
import { ContextEngine } from '../../engines/context/src';
import { KnowledgeEngine } from '../../engines/knowledge/src';
import { PlannerEngine, type Goal, type Plan } from '../../engines/planner/src';
import { OrchestratorEngine, type Workflow, type WorkflowDispatchResult, type WorkflowResult } from '../../engines/orchestrator/src';
import { ExecutionEngine, type ExecutionRecord, type ExecutionSummary } from '../../engines/execution/src';
import { ValidationEngine, type ValidationPipelineResult, type ValidationVerdict } from '../../engines/validation/src';
import { LearningEngine, type LearningSubject } from '../../engines/learning/src';

/**
 * Phase 013 Milestone 3 — End-to-End Workflow Integration Tests.
 *
 * This file exercises the already-implemented public methods of all
 * seven Titan engines from outside, chaining each engine's real output
 * into the next engine's request exactly as
 * `phase-013-titan-core-integration-and-hardening.md`'s Deliverable
 * ("End-to-end test scenarios across full engine workflow") and
 * Acceptance Criterion ("End-to-end workflows execute with expected
 * orchestration and validation behavior") require. The test harness
 * itself performs the chaining; no engine source was modified to call
 * another engine, and no engine ever receives another engine instance
 * as input (see "Boundary preservation" below).
 *
 * Two documented, pre-existing limitations of the current
 * implementation shape this file and are called out at their point of
 * use rather than worked around:
 *
 * 1. `ValidationEngine.validate()` (`ValidationBuilder`, Milestone 3 of
 *    Phase 011) always returns `verdict.status: 'partial'` — a fixed
 *    placeholder, never derived from the Execution outcome. No public
 *    method on any engine can produce a `'pass'` or `'fail'` verdict.
 * 2. No engine method anywhere in the repository produces a
 *    `WorkflowResult` value (the Orchestrator's own domain model
 *    labels it "Outcome payload for a completed or terminated
 *    workflow", but no method returns one — confirmed by grep across
 *    `engines/orchestrator/src`). `LearningEngine.observeCycle()`'s
 *    `LearningSubject.outcome` field is typed `WorkflowResult`, so a
 *    `WorkflowResult` value must be supplied by the caller. This test
 *    constructs one directly, exactly as the Learning Engine's own
 *    unit test suite (`tests/unit/learning-engine.test.ts`'s
 *    `buildWorkflowResult` helper) already does — this is established
 *    repository precedent, not invented behavior.
 *
 * For the same reason, the "Validation failure workflow" scenario
 * constructs a `ValidationVerdict` fixture with `status: 'fail'`
 * (copying every other field from a real `validate()` call) to
 * exercise the Learning pipeline's failure path, since no public
 * method can produce a failing verdict today.
 */

const TASK_ITEM_ID = 'task-analysis';
const STEP_ITEM_ID = 'step-analysis';

function buildGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    goalId: 'goal-e2e-1',
    title: 'Ship the integration test',
    description: 'Exercise the full Planner-to-Learning chain end-to-end.',
    type: 'feature',
    priority: 'medium',
    status: 'ready',
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Deep-walks a value and returns `true` if any nested value is an
 * instance of `BaseEngine` — used by the "Boundary preservation"
 * scenario to prove no engine instance is ever embedded in a
 * cross-engine request/response payload.
 */
function containsEngineInstance(value: unknown, seen: Set<unknown> = new Set()): boolean {
  if (value instanceof BaseEngine) {
    return true;
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return false;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((item) => containsEngineInstance(item, seen));
  }
  return Object.values(value as Record<string, unknown>).some((item) => containsEngineInstance(item, seen));
}

interface EngineSet {
  readonly planner: PlannerEngine;
  readonly orchestrator: OrchestratorEngine;
  readonly execution: ExecutionEngine;
  readonly validation: ValidationEngine;
  readonly learning: LearningEngine;
}

function createEngineSet(): EngineSet {
  return {
    planner: new PlannerEngine(),
    orchestrator: new OrchestratorEngine(),
    execution: new ExecutionEngine(),
    validation: new ValidationEngine(),
    learning: new LearningEngine(),
  };
}

interface PlanThroughValidationResult {
  readonly plan: Plan;
  readonly workflow: Workflow;
  readonly dispatchResult: WorkflowDispatchResult;
  readonly executionRecord: ExecutionRecord;
  readonly executionSummary: ExecutionSummary;
  readonly validationResult: ValidationPipelineResult;
}

/**
 * Chains Planner -> Orchestrator -> Execution -> Validation using only
 * already-implemented public methods, feeding each engine's real
 * output directly into the next engine's request. The test harness
 * performs this chaining; no engine calls another engine internally.
 */
async function runPlanThroughValidation(engines: EngineSet, goal: Goal): Promise<PlanThroughValidationResult> {
  const plan = await engines.planner.createPlan({ goal });
  const workflow = await engines.orchestrator.orchestrate({ plan });
  const dispatchResult = await engines.orchestrator.dispatchWorkflow({ workflow });
  const executionRecord = await engines.execution.execute({ dispatchResult, itemId: TASK_ITEM_ID });
  const executionSummary = await engines.execution.reportResult({ record: executionRecord });
  const validationResult = await engines.validation.validate({
    subject: { record: executionRecord, summary: executionSummary },
  });

  return { plan, workflow, dispatchResult, executionRecord, executionSummary, validationResult };
}

describe('Titan Core end-to-end integration (Phase 013 Milestone 3)', () => {
  describe('Successful workflow', () => {
    it('runs the complete Planner -> Orchestrator -> Execution -> Validation -> Learning chain using only real engine outputs', async () => {
      const engines = createEngineSet();
      const goal = buildGoal();

      const { plan, workflow, dispatchResult, executionRecord, executionSummary, validationResult } =
        await runPlanThroughValidation(engines, goal);

      expect(plan.planId).toBe('plan-goal-e2e-1');
      expect(workflow.workflowId).toBe('workflow-plan-goal-e2e-1');
      // Real WorkflowDispatcher output: every task is dispatch-ready
      // immediately (a task is always the *source*, never the target,
      // of its own `requires` dependency to its parent step -- see
      // GoalDecomposer.buildDependencies), while every step's own
      // `requires` dependency (task -> step, sourceId=task) is
      // structurally unsatisfied until that task completes, so no step
      // is dispatch-ready at this point in the chain.
      expect(dispatchResult.dispatchable).toEqual(
        expect.arrayContaining(['task-analysis', 'task-design', 'task-implementation', 'task-validation', 'task-documentation']),
      );
      expect(dispatchResult.dispatchable).not.toContain(STEP_ITEM_ID);
      expect(executionRecord.target.itemId).toBe(TASK_ITEM_ID);
      expect(executionSummary.executionId).toBe(executionRecord.executionId);
      // Real, current ValidationEngine.validate() behavior (see file header).
      expect(validationResult.verdict.status).toBe('partial');

      const outcome: WorkflowResult = {
        workflowId: workflow.workflowId,
        status: 'completed',
        completedStepIds: [STEP_ITEM_ID],
        failedStepIds: [],
      };
      const subject: LearningSubject = { outcome, verdict: validationResult.verdict };

      const observation = await engines.learning.observeCycle({ subject });
      expect(observation.stage).toBe('outcome');
      expect(observation.subject.verdict.status).toBe('partial');

      const pipelineResult = await engines.learning.analyzeCycle({ observations: [observation] });

      expect(pipelineResult.lessons).toHaveLength(1);
      expect(pipelineResult.lessons[0].category).toBe('estimate-inaccuracy');
      expect(pipelineResult.knowledgeUpdateProposals).toHaveLength(1);
      expect(pipelineResult.knowledgeUpdateProposals[0].status).toBe('proposed');
    });
  });

  describe('Validation failure workflow', () => {
    it('feeds a failing validation verdict through the existing Learning pipeline and produces deterministic failure-path outputs', async () => {
      const engines = createEngineSet();
      const goal = buildGoal();

      const { workflow, validationResult } = await runPlanThroughValidation(engines, goal);

      // ValidationEngine.validate() cannot itself produce a 'fail'
      // verdict today (see file header) -- this fixture copies every
      // other field from the real validate() output and overrides only
      // `status`, matching the fixture-construction precedent already
      // used throughout the repository's own engine test suites.
      const failingVerdict: ValidationVerdict = { ...validationResult.verdict, status: 'fail' };

      const outcome: WorkflowResult = {
        workflowId: workflow.workflowId,
        status: 'failed',
        completedStepIds: [],
        failedStepIds: [STEP_ITEM_ID],
      };
      const subject: LearningSubject = { outcome, verdict: failingVerdict };

      const observation = await engines.learning.observeCycle({ subject });
      const pipelineResult = await engines.learning.analyzeCycle({ observations: [observation] });

      expect(pipelineResult.lessons).toHaveLength(1);
      expect(pipelineResult.lessons[0].category).toBe('failure');
      expect(pipelineResult.flaggedRisks).toHaveLength(1);
      expect(pipelineResult.flaggedRisks[0].relatedLessonIds).toEqual([pipelineResult.lessons[0].lessonId]);
      expect(pipelineResult.proposedAdrs).toHaveLength(1);
      expect(pipelineResult.proposedAdrs[0].status).toBe('proposed');
      expect(pipelineResult.proposedAdrs[0].relatedLessonIds).toEqual(
        expect.arrayContaining([...pipelineResult.flaggedRisks[0].relatedLessonIds]),
      );
    });
  });

  describe('Determinism', () => {
    it('produces identical deterministic identifiers across two independent runs of the same workflow', async () => {
      const goal = buildGoal();

      const first = await runPlanThroughValidation(createEngineSet(), goal);
      const second = await runPlanThroughValidation(createEngineSet(), goal);

      // Plan, Workflow, and WorkflowDispatchResult carry no
      // caller-generated timestamps anywhere in their construction
      // (Plan.metadata copies the Goal's own timestamps verbatim; the
      // dispatch result has no timestamp fields at all), so these are
      // fully, structurally deterministic.
      expect(first.plan).toEqual(second.plan);
      expect(first.workflow).toEqual(second.workflow);
      expect(first.dispatchResult).toEqual(second.dispatchResult);

      // ExecutionRecord/ExecutionSummary/ValidationVerdict each embed a
      // fresh `new Date().toISOString()` timestamp with no way to
      // inject one through the public API, so only their deterministic
      // id/target fields are compared, not the full object.
      expect(first.executionRecord.executionId).toBe(second.executionRecord.executionId);
      expect(first.executionRecord.target).toEqual(second.executionRecord.target);
      expect(first.executionSummary.executionId).toBe(second.executionSummary.executionId);
      expect(first.validationResult.verdict.validationId).toBe(second.validationResult.verdict.validationId);
      expect(first.validationResult.verdict.target).toEqual(second.validationResult.verdict.target);
      expect(first.validationResult.verdict.status).toBe(second.validationResult.verdict.status);

      const outcomeFor = (workflowId: string): WorkflowResult => ({
        workflowId,
        status: 'completed',
        completedStepIds: [STEP_ITEM_ID],
        failedStepIds: [],
      });

      const firstEngines = createEngineSet();
      const secondEngines = createEngineSet();

      const firstObservation = await firstEngines.learning.observeCycle({
        subject: { outcome: outcomeFor(first.workflow.workflowId), verdict: first.validationResult.verdict },
      });
      const secondObservation = await secondEngines.learning.observeCycle({
        subject: { outcome: outcomeFor(second.workflow.workflowId), verdict: second.validationResult.verdict },
      });

      expect(firstObservation.observationId).toBe(secondObservation.observationId);
      expect(firstObservation.stage).toBe(secondObservation.stage);

      const firstPipeline = await firstEngines.learning.analyzeCycle({ observations: [firstObservation] });
      const secondPipeline = await secondEngines.learning.analyzeCycle({ observations: [secondObservation] });

      expect(firstPipeline.lessons[0].lessonId).toBe(secondPipeline.lessons[0].lessonId);
      expect(firstPipeline.lessons[0].category).toBe(secondPipeline.lessons[0].category);
      expect(firstPipeline.knowledgeUpdateProposals[0].proposalId).toBe(
        secondPipeline.knowledgeUpdateProposals[0].proposalId,
      );
      expect(firstPipeline.flaggedRisks[0]?.riskId).toBe(secondPipeline.flaggedRisks[0]?.riskId);
      expect(firstPipeline.proposedAdrs[0]?.adrId).toBe(secondPipeline.proposedAdrs[0]?.adrId);
    });
  });

  describe('Boundary preservation', () => {
    it('never passes an engine instance as input to another engine', async () => {
      const engines = createEngineSet();
      const context = new ContextEngine();
      const knowledge = new KnowledgeEngine({ rootDir: process.cwd(), actorId: 'integration-test', roles: ['ai-agent'] });
      // KnowledgeEngine independently implements the same lifecycle
      // contract shape but does not extend `BaseEngine` (confirmed by
      // reading engines/knowledge/src/index.ts), so this list is typed
      // `unknown[]` rather than `BaseEngine[]` -- it is only ever used
      // for reference-equality checks below.
      const allEngines: readonly unknown[] = [
        engines.planner,
        engines.orchestrator,
        engines.execution,
        engines.validation,
        engines.learning,
        context,
        knowledge,
      ];

      const goal = buildGoal();
      const { plan, workflow, dispatchResult, executionRecord, executionSummary, validationResult } =
        await runPlanThroughValidation(engines, goal);

      const outcome: WorkflowResult = {
        workflowId: workflow.workflowId,
        status: 'completed',
        completedStepIds: [STEP_ITEM_ID],
        failedStepIds: [],
      };
      const observation = await engines.learning.observeCycle({
        subject: { outcome, verdict: validationResult.verdict },
      });
      const pipelineResult = await engines.learning.analyzeCycle({ observations: [observation] });

      const payloads: readonly unknown[] = [
        plan,
        workflow,
        dispatchResult,
        executionRecord,
        executionSummary,
        validationResult,
        outcome,
        observation,
        pipelineResult,
      ];

      for (const payload of payloads) {
        expect(containsEngineInstance(payload)).toBe(false);
      }

      for (const engine of allEngines) {
        for (const payload of payloads) {
          expect(payload).not.toBe(engine);
        }
      }
    });
  });

  describe('Context and Knowledge Engine instantiation (not wired into the data chain)', () => {
    it('constructs real ContextEngine and KnowledgeEngine instances with correct metadata', () => {
      // architecture.md assigns Context/Knowledge Engine reads to
      // every engine in the Planner-to-Learning chain, but no engine
      // source anywhere in the repository currently reads from either
      // one (confirmed by grep across engines/*/src during Phase 013
      // planning). Per this milestone's non-goals, no such wiring is
      // introduced here -- these two engines are constructed as real
      // instances only, exactly as Milestone 2's registry wiring does.
      const context = new ContextEngine();
      const knowledge = new KnowledgeEngine({ rootDir: process.cwd(), actorId: 'integration-test', roles: ['ai-agent'] });

      expect(context.metadata().id).toBe('context-engine');
      expect(context.getState()).toBe('created');
      expect(knowledge.metadata().id).toBe('knowledge-engine');
      expect(knowledge.getState()).toBe('created');
    });
  });
});
