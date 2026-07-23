import type { Dependency, Plan, PlanMetadata, PlanStep, Task } from '../models/types';

/**
 * `PlanOptimizer` performs deterministic, offline structural
 * normalization of a `Plan` object.
 *
 * Milestone 5 scope: pure, synchronous, deterministic structural
 * optimization only. The optimizer assumes its input has already
 * passed `PlanValidator` and is a structurally valid `Plan`; it does
 * not re-validate or repair invalid input.
 *
 * Out of scope for Milestone 5 (intentionally not implemented here):
 * - AI-assisted or heuristic optimization.
 * - Cost, time, or resource optimization.
 * - Scheduling or parallel-execution planning.
 * - Critical-path analysis.
 * - Cycle detection or other graph algorithms.
 * - Machine learning.
 * - Knowledge Engine, Context Engine, or Orchestrator integration.
 */
export class PlanOptimizer {
  /**
   * Deterministically optimize `plan` and return a new `Plan`.
   *
   * The original `plan` argument (and all of its nested arrays and
   * objects) is never mutated. All IDs are preserved exactly.
   * `metadata.createdAt`, `metadata.createdBy`, and `metadata.labels`
   * are preserved as-is (aside from redundant-empty-collection
   * normalization); `metadata.revision` is incremented by exactly 1
   * to reflect that a new, optimized revision has been produced.
   * `metadata.updatedAt` is left unchanged so the operation remains
   * fully deterministic (no wall-clock reads).
   */
  optimize(plan: Plan): Plan {
    const steps = this.normalizeSteps(plan.steps);
    const tasks = this.normalizeTasks(plan.tasks);
    const dependencies = this.normalizeDependencies(plan.dependencies);
    const constraints = [...plan.constraints];
    const metadata = this.normalizeMetadata(plan.metadata);

    return {
      ...plan,
      metadata,
      steps,
      tasks,
      dependencies,
      constraints,
    };
  }

  /**
   * Return a new, deterministically sorted copy of `metadata`.
   *
   * - `revision` is incremented by exactly 1.
   * - `labels`, when present but empty, is removed (redundant empty
   *   collection). A non-empty `labels` array is preserved as a new,
   *   deterministically sorted array.
   */
  private normalizeMetadata(metadata: PlanMetadata): PlanMetadata {
    const hasLabels = Array.isArray(metadata.labels) && metadata.labels.length > 0;

    const normalized: PlanMetadata = {
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      createdBy: metadata.createdBy,
      revision: metadata.revision + 1,
      ...(hasLabels ? { labels: [...(metadata.labels as readonly string[])].sort() } : {}),
    };

    return normalized;
  }

  /**
   * Return a new array of steps, deterministically sorted by
   * `stepId`, with each step's `taskIds` and `dependsOnStepIds`
   * deterministically sorted and redundant-empty `dependsOnStepIds`
   * removed. Duplicate `taskIds`/`dependsOnStepIds` entries within a
   * single step are removed as well.
   */
  private normalizeSteps(steps: readonly PlanStep[]): readonly PlanStep[] {
    return [...steps]
      .map((step) => {
        const taskIds = this.dedupeSorted(step.taskIds);
        const dependsOnStepIds =
          step.dependsOnStepIds !== undefined ? this.dedupeSorted(step.dependsOnStepIds) : undefined;
        const hasDependsOn = dependsOnStepIds !== undefined && dependsOnStepIds.length > 0;

        return {
          ...step,
          taskIds,
          ...(hasDependsOn ? { dependsOnStepIds } : {}),
        };
      })
      .map((step) => this.stripUndefinedDependsOnStepIds(step))
      .sort((a, b) => a.stepId.localeCompare(b.stepId));
  }

  /**
   * Remove `dependsOnStepIds` entirely when it was not provided or
   * normalized to empty, so redundant empty collections never appear
   * in the optimized output.
   */
  private stripUndefinedDependsOnStepIds(step: PlanStep): PlanStep {
    if (step.dependsOnStepIds !== undefined && step.dependsOnStepIds.length > 0) {
      return step;
    }
    const rest: Record<string, unknown> = { ...step };
    delete rest.dependsOnStepIds;
    return rest as unknown as PlanStep;
  }

  /**
   * Return a new array of tasks, deterministically sorted by
   * `taskId`.
   */
  private normalizeTasks(tasks: readonly Task[]): readonly Task[] {
    return [...tasks].map((task) => ({ ...task })).sort((a, b) => a.taskId.localeCompare(b.taskId));
  }

  /**
   * Return a new array of dependencies with exact duplicates removed
   * (same `type` + `sourceId` + `targetId`), deterministically sorted
   * by `type`, then `sourceId`, then `targetId`, then `dependencyId`.
   */
  private normalizeDependencies(dependencies: readonly Dependency[]): readonly Dependency[] {
    const seenEdges = new Set<string>();
    const deduped: Dependency[] = [];

    for (const dependency of dependencies) {
      const edgeKey = `${dependency.type}:${dependency.sourceId}->${dependency.targetId}`;
      if (seenEdges.has(edgeKey)) {
        continue;
      }
      seenEdges.add(edgeKey);
      deduped.push({ ...dependency });
    }

    return deduped.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      if (a.sourceId !== b.sourceId) {
        return a.sourceId.localeCompare(b.sourceId);
      }
      if (a.targetId !== b.targetId) {
        return a.targetId.localeCompare(b.targetId);
      }
      return a.dependencyId.localeCompare(b.dependencyId);
    });
  }

  /**
   * Return a new array with duplicate entries removed and the
   * remaining entries sorted deterministically.
   */
  private dedupeSorted(values: readonly string[]): readonly string[] {
    return [...new Set(values)].sort();
  }
}
