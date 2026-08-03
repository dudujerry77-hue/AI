import type {
  Dependency as PlannerDependency,
  DependencyType as PlannerDependencyType,
  Plan,
  PlanStep,
  Task as PlannerTask,
} from '../../../planner/src/models/types';
import { OrchestratorValidationError } from '../errors/orchestrator-errors';

import type {
  Workflow,
  WorkflowDependency,
  WorkflowDependencyType,
  WorkflowExecutionMode,
  WorkflowMetadata,
  WorkflowPriority,
  WorkflowStep,
  WorkflowTask,
} from '../models/types';

/**
 * Deterministic structural translator from a Planner `Plan` into an
 * Orchestrator `Workflow` — Milestone 3.
 *
 * `WorkflowBuilder` performs pure, synchronous, offline structural
 * translation only:
 *
 * - One `WorkflowStep` is created for each `PlanStep`, preserving its
 *   `stepId`, title, description, status name, task-id ordering, and
 *   `dependsOnStepIds`.
 * - One `WorkflowTask` is created for each Planner `Task`, preserving
 *   its `taskId`, `stepId`, title, description, status name, and
 *   assignee.
 * - One `WorkflowDependency` is created for each Planner `Dependency`,
 *   preserving its `dependencyId`, source/target ids, reason, and
 *   translating its `DependencyType` into the equivalent
 *   `WorkflowDependencyType` (the two type sets share identical
 *   literal names, so translation is a direct, verified mapping).
 * - Ordering of steps, tasks, and dependencies in the output arrays
 *   matches the ordering found on the input `Plan`.
 * - `Workflow.workflowId` is deterministically derived from the
 *   input `Plan.planId` (`workflow-<planId>`), and `Workflow.planId`
 *   is copied verbatim.
 * - `Workflow.metadata` is deterministically derived from the input
 *   `Plan.metadata` (matching `createdAt`, `updatedAt`, `createdBy`,
 *   `revision`, and `labels`).
 *
 * `WorkflowBuilder` never mutates the input `Plan` or any of its
 * nested arrays/objects: every output value is built from freshly
 * constructed objects and arrays.
 *
 * No AI logic, no scheduling, no retries, no concurrency, no
 * background work, no network calls, no filesystem access, and no
 * database access are performed by this class. No other Titan
 * engine is called from this module.
 */
export class WorkflowBuilder {
  /**
   * Deterministically translate a Planner `Plan` into an Orchestrator
   * `Workflow`. Throws `OrchestratorValidationError` if the supplied
   * `plan` is missing, malformed, or structurally invalid for
   * translation purposes.
   */
  build(plan: Plan): Workflow {
    this.validatePlan(plan);

    const metadata: WorkflowMetadata = {
      createdAt: plan.metadata.createdAt,
      updatedAt: plan.metadata.updatedAt,
      createdBy: plan.metadata.createdBy,
      revision: plan.metadata.revision,
      ...(plan.metadata.labels ? { labels: [...plan.metadata.labels] } : {}),
    };

    const steps: readonly WorkflowStep[] = plan.steps.map((step) =>
      this.buildStep(step),
    );
    const tasks: readonly WorkflowTask[] = plan.tasks.map((task) =>
      this.buildTask(task),
    );
    const dependencies: readonly WorkflowDependency[] = plan.dependencies.map(
      (dependency) => this.buildDependency(dependency),
    );

    const priority: WorkflowPriority = 'medium';
    const executionMode: WorkflowExecutionMode = 'sequential';

    return {
      workflowId: `workflow-${plan.planId}`,
      planId: plan.planId,
      status: 'pending',
      priority,
      executionMode,
      metadata,
      steps,
      tasks,
      dependencies,
    };
  }

  private buildStep(step: PlanStep): WorkflowStep {
    return {
      stepId: step.stepId,
      title: step.title,
      description: step.description,
      status: step.status,
      taskIds: [...step.taskIds],
      ...(step.dependsOnStepIds
        ? { dependsOnStepIds: [...step.dependsOnStepIds] }
        : {}),
    };
  }

  private buildTask(task: PlannerTask): WorkflowTask {
    return {
      taskId: task.taskId,
      stepId: task.stepId,
      title: task.title,
      description: task.description,
      status: task.status,
      ...(task.assignee !== undefined ? { assignee: task.assignee } : {}),
    };
  }

  private buildDependency(dependency: PlannerDependency): WorkflowDependency {
    return {
      dependencyId: dependency.dependencyId,
      type: this.translateDependencyType(dependency.type),
      sourceId: dependency.sourceId,
      targetId: dependency.targetId,
      ...(dependency.reason !== undefined ? { reason: dependency.reason } : {}),
    };
  }

  /**
   * Translate a Planner `DependencyType` into the equivalent
   * Orchestrator `WorkflowDependencyType`. The two type sets share
   * identical literal names (`blocks`, `requires`, `related`,
   * `sequential`, `parallel`), so this is a direct, exhaustively
   * verified mapping rather than an inferred one.
   */
  private translateDependencyType(
    type: PlannerDependencyType,
  ): WorkflowDependencyType {
    switch (type) {
      case 'blocks':
        return 'blocks';
      case 'requires':
        return 'requires';
      case 'related':
        return 'related';
      case 'sequential':
        return 'sequential';
      case 'parallel':
        return 'parallel';
      default: {
        const exhaustiveCheck: never = type;
        throw new OrchestratorValidationError(
          `Unsupported Planner dependency type: ${String(exhaustiveCheck)}`,
          [
            {
              field: 'dependencies[].type',
              code: 'unsupported-dependency-type',
              message: `Unsupported Planner dependency type: ${String(exhaustiveCheck)}`,
            },
          ],
        );
      }
    }
  }

  private validatePlan(plan: Plan): void {
    if (plan === null || plan === undefined) {
      throw new OrchestratorValidationError('Plan is required.', [
        { field: 'plan', code: 'missing-plan', message: 'Plan is required.' },
      ]);
    }

    if (typeof plan.planId !== 'string' || plan.planId.trim().length === 0) {
      throw new OrchestratorValidationError('Plan.planId is required.', [
        {
          field: 'plan.planId',
          code: 'missing-plan-id',
          message: 'Plan.planId is required.',
        },
      ]);
    }

    if (!plan.metadata) {
      throw new OrchestratorValidationError('Plan.metadata is required.', [
        {
          field: 'plan.metadata',
          code: 'missing-plan-metadata',
          message: 'Plan.metadata is required.',
        },
      ]);
    }

    if (!Array.isArray(plan.steps)) {
      throw new OrchestratorValidationError('Plan.steps must be an array.', [
        {
          field: 'plan.steps',
          code: 'invalid-plan-steps',
          message: 'Plan.steps must be an array.',
        },
      ]);
    }

    if (!Array.isArray(plan.tasks)) {
      throw new OrchestratorValidationError('Plan.tasks must be an array.', [
        {
          field: 'plan.tasks',
          code: 'invalid-plan-tasks',
          message: 'Plan.tasks must be an array.',
        },
      ]);
    }

    if (!Array.isArray(plan.dependencies)) {
      throw new OrchestratorValidationError(
        'Plan.dependencies must be an array.',
        [
          {
            field: 'plan.dependencies',
            code: 'invalid-plan-dependencies',
            message: 'Plan.dependencies must be an array.',
          },
        ],
      );
    }
  }
}
