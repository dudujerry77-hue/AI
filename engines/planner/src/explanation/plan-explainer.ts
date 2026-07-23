import type { DependencySummary, DependencyType, Plan, PlanExplanation } from '../models/types';
import { PlanValidator } from '../validation/plan-validator';

/**
 * All `DependencyType` values, used to seed a zero-initialized
 * `DependencySummary.byType` map so every type is always present in
 * the output (with a count of `0` when the plan has no dependencies
 * of that type), keeping the shape of `byType` fully deterministic
 * regardless of which dependency types happen to appear in a given
 * plan.
 */
const ALL_DEPENDENCY_TYPES: readonly DependencyType[] = [
  'blocks',
  'requires',
  'related',
  'sequential',
  'parallel',
];

/**
 * `PlanExplainer` performs deterministic, offline structural
 * explanation of a `Plan` object.
 *
 * Milestone 6 scope: pure, synchronous, deterministic explanation
 * only, derived exclusively from information already present on the
 * `Plan` itself (steps, tasks, dependencies) plus the plan's own
 * `PlanValidator` result. The caller (`PlannerEngine.explainPlan`) is
 * responsible for validating the `Plan` via `PlanValidator` before
 * calling `PlanExplainer`; this class independently re-runs
 * `PlanValidator` only to populate `validationStatus` in its output
 * (it does not reject or alter the plan based on that result).
 *
 * Out of scope for Milestone 6 (intentionally not implemented here):
 * - AI-generated explanations.
 * - Inference of information not already present on the plan.
 */
export class PlanExplainer {
  private readonly planValidator: PlanValidator;

  constructor() {
    this.planValidator = new PlanValidator();
  }

  /**
   * Deterministically explain `plan` and return a new
   * `PlanExplanation`.
   *
   * The original `plan` argument (and all of its nested arrays and
   * objects) is never mutated. The same `plan` input always produces
   * the same `PlanExplanation` output.
   */
  explain(plan: Plan): PlanExplanation {
    const stepCount = plan.steps.length;
    const taskCount = plan.tasks.length;
    const dependencySummary = this.buildDependencySummary(plan);
    const executionOrder = this.buildExecutionOrder(plan);
    const validationResult = this.planValidator.validate(plan);

    return {
      planId: plan.planId,
      summary: `Plan ${plan.planId} for goal ${plan.goalId} has ${stepCount} step(s) and ${taskCount} task(s).`,
      rationale: `This explanation is derived directly from the structure of plan ${plan.planId}: its steps, tasks, and dependencies, in the order they already appear on the plan.`,
      stepCount,
      taskCount,
      dependencySummary,
      executionOrder,
      validationStatus: {
        valid: validationResult.valid,
        issueCount: validationResult.issues.length,
      },
    };
  }

  /**
   * Build a deterministic summary of `plan.dependencies`, grouped by
   * `DependencyType`. Every `DependencyType` is always present in
   * `byType`, with a count of `0` for types that do not appear on the
   * plan.
   */
  private buildDependencySummary(plan: Plan): DependencySummary {
    const byType: Record<DependencyType, number> = {
      blocks: 0,
      requires: 0,
      related: 0,
      sequential: 0,
      parallel: 0,
    };

    for (const dependency of plan.dependencies) {
      byType[dependency.type] += 1;
    }

    return {
      total: plan.dependencies.length,
      byType: ALL_DEPENDENCY_TYPES.reduce<Record<DependencyType, number>>((accumulator, type) => {
        accumulator[type] = byType[type];
        return accumulator;
      }, {} as Record<DependencyType, number>),
    };
  }

  /**
   * Build a deterministic execution order using only information
   * already present on the plan: the plan's own `steps` array order.
   * No graph traversal, no cycle detection, and no inference beyond
   * the existing declared order of `plan.steps`.
   */
  private buildExecutionOrder(plan: Plan): readonly string[] {
    return plan.steps.map((step) => step.stepId);
  }
}
