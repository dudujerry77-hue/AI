import type { ComplexityLevel, Plan, PlanEstimate } from '../models/types';

/**
 * Deterministic effort-hours attributed to a single task by
 * `PlanEstimator`. This is a fixed structural constant, not derived
 * from AI, historical data, or any external source.
 */
const EFFORT_HOURS_PER_TASK = 4;

/**
 * Deterministic duration-hours attributed to a single step by
 * `PlanEstimator`. This is a fixed structural constant, not derived
 * from AI, historical data, or any external source.
 */
const DURATION_HOURS_PER_STEP = 8;

/**
 * Structural complexity thresholds used by `PlanEstimator` to derive
 * `complexityLevel`. A plan is:
 * - `low` when its total structural size (steps + tasks +
 *   dependencies) is below `MEDIUM_COMPLEXITY_THRESHOLD`.
 * - `medium` when it is at or above `MEDIUM_COMPLEXITY_THRESHOLD` but
 *   below `HIGH_COMPLEXITY_THRESHOLD`.
 * - `high` when it is at or above `HIGH_COMPLEXITY_THRESHOLD`.
 */
const MEDIUM_COMPLEXITY_THRESHOLD = 10;
const HIGH_COMPLEXITY_THRESHOLD = 25;

/**
 * `PlanEstimator` performs deterministic, offline structural
 * estimation of a `Plan` object.
 *
 * Milestone 6 scope: pure, synchronous, deterministic structural
 * estimation only, derived exclusively from counts already present
 * on the `Plan` (steps, tasks, dependencies). The caller
 * (`PlannerEngine.estimatePlan`) is responsible for validating the
 * `Plan` via `PlanValidator` before calling `PlanEstimator`; this
 * class does not re-validate its input.
 *
 * Out of scope for Milestone 6 (intentionally not implemented here):
 * - AI-assisted estimation.
 * - Historical-data-driven estimation.
 * - Machine learning.
 * - External services.
 */
export class PlanEstimator {
  /**
   * Deterministically estimate `plan` and return a new `PlanEstimate`.
   *
   * The original `plan` argument (and all of its nested arrays and
   * objects) is never mutated. The same `plan` input always produces
   * the same `PlanEstimate` output.
   */
  estimate(plan: Plan): PlanEstimate {
    const totalSteps = plan.steps.length;
    const totalTasks = plan.tasks.length;
    const dependencyCount = plan.dependencies.length;

    const estimatedDurationHours = totalSteps * DURATION_HOURS_PER_STEP;
    const estimatedEffortHours = totalTasks * EFFORT_HOURS_PER_TASK;
    const complexityLevel = this.deriveComplexityLevel(totalSteps, totalTasks, dependencyCount);

    return {
      confidence: 1,
      cost: {
        currency: 'USD',
        amount: 0,
      },
      time: {
        unit: 'hours',
        value: estimatedDurationHours,
      },
      resources: {
        people: 1,
        effortHours: estimatedEffortHours,
      },
      totalSteps,
      totalTasks,
      dependencyCount,
      estimatedDurationHours,
      estimatedEffortHours,
      complexityLevel,
    };
  }

  /**
   * Derive a deterministic `ComplexityLevel` from purely structural
   * counts: the total number of steps, tasks, and dependencies on the
   * plan.
   */
  private deriveComplexityLevel(
    totalSteps: number,
    totalTasks: number,
    dependencyCount: number,
  ): ComplexityLevel {
    const structuralSize = totalSteps + totalTasks + dependencyCount;

    if (structuralSize >= HIGH_COMPLEXITY_THRESHOLD) {
      return 'high';
    }

    if (structuralSize >= MEDIUM_COMPLEXITY_THRESHOLD) {
      return 'medium';
    }

    return 'low';
  }
}
