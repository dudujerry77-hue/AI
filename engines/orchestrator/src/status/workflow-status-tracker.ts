import type {
  Workflow,
  WorkflowStepStatus,
  WorkflowSummary,
  WorkflowTaskStatus,
} from '../models/types';
import { OrchestratorValidationError } from '../errors/orchestrator-errors';

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `WorkflowStatusTracker` performs deterministic, offline structural
 * status reporting for a `Workflow` — Milestone 5.
 *
 * It computes a `WorkflowSummary` using only structural data already
 * present on the input `Workflow`: the workflow's own `workflowId`
 * and `status`, plus counts derived by classifying each
 * `WorkflowStep.status` and `WorkflowTask.status` value and counting
 * `dependencies.length`.
 *
 * Step/task status classification (exhaustive, explicit, and fixed —
 * never inferred):
 *
 * - `completed` → counted as completed.
 * - `in-progress` → counted as running.
 * - `failed` → counted as failed.
 * - `cancelled` → counted as cancelled.
 * - `skipped` (steps only) → counted as cancelled, since it is a
 *   terminal non-completion outcome and `WorkflowSummary` defines no
 *   separate "skipped" bucket.
 * - `pending`, `ready`, `blocked` → counted as pending, since none of
 *   these represent active execution or a terminal outcome.
 *
 * `WorkflowStatusTracker` never mutates its input, performs no
 * execution, no scheduling, no retries, no concurrency, no
 * persistence, no networking, and calls no other Titan engine. It
 * does not simulate or infer progress: every count it produces is a
 * direct tally of status values already present on the input
 * `Workflow`.
 */
export class WorkflowStatusTracker {
  /**
   * Compute a deterministic `WorkflowSummary` for the given
   * `Workflow`.
   *
   * Throws `OrchestratorValidationError` only for malformed input:
   * `null`, `undefined`, or a non-object value.
   */
  summarize(workflow: Workflow): WorkflowSummary {
    if (
      workflow === null ||
      workflow === undefined ||
      !isPlainObject(workflow)
    ) {
      throw new OrchestratorValidationError(
        'Workflow must be a non-null object.',
        [
          {
            field: 'workflow',
            code: 'MALFORMED_INPUT',
            message: 'workflow must be a non-null object.',
          },
        ],
      );
    }

    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
    const tasks = Array.isArray(workflow.tasks) ? workflow.tasks : [];
    const dependencies = Array.isArray(workflow.dependencies)
      ? workflow.dependencies
      : [];

    let completedSteps = 0;
    let pendingSteps = 0;
    let runningSteps = 0;
    let failedSteps = 0;
    let cancelledSteps = 0;

    for (const step of steps) {
      switch (step.status as WorkflowStepStatus) {
        case 'completed':
          completedSteps += 1;
          break;
        case 'in-progress':
          runningSteps += 1;
          break;
        case 'failed':
          failedSteps += 1;
          break;
        case 'cancelled':
        case 'skipped':
          cancelledSteps += 1;
          break;
        case 'pending':
        case 'ready':
        case 'blocked':
        default:
          pendingSteps += 1;
          break;
      }
    }

    let completedTasks = 0;
    let pendingTasks = 0;
    let runningTasks = 0;
    let failedTasks = 0;
    let cancelledTasks = 0;

    for (const task of tasks) {
      switch (task.status as WorkflowTaskStatus) {
        case 'completed':
          completedTasks += 1;
          break;
        case 'in-progress':
          runningTasks += 1;
          break;
        case 'failed':
          failedTasks += 1;
          break;
        case 'cancelled':
          cancelledTasks += 1;
          break;
        case 'pending':
        case 'ready':
        case 'blocked':
        default:
          pendingTasks += 1;
          break;
      }
    }

    return {
      workflowId:
        typeof workflow.workflowId === 'string' ? workflow.workflowId : '',
      status: workflow.status,
      totalSteps: steps.length,
      completedSteps,
      pendingSteps,
      runningSteps,
      failedSteps,
      cancelledSteps,
      totalTasks: tasks.length,
      completedTasks,
      pendingTasks,
      runningTasks,
      failedTasks,
      cancelledTasks,
      dependencyCount: dependencies.length,
    };
  }
}
