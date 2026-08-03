import type { Workflow } from '../models/types';
import { OrchestratorValidationError } from '../errors/orchestrator-errors';

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Throws `OrchestratorValidationError` for malformed input: `null`,
 * `undefined`, or a non-object value. Returns the (still-unvalidated
 * for deeper structure) value otherwise.
 */
function requireWorkflowObject(workflow: Workflow): Workflow {
  if (workflow === null || workflow === undefined || !isPlainObject(workflow)) {
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

  return workflow;
}

/**
 * Returns a new `Workflow` identical to `workflow` except for
 * `status` (set to `nextStatus`) and `metadata.revision`
 * (incremented by exactly 1). All other fields — including
 * `workflowId`, `planId`, `priority`, `executionMode`,
 * `metadata.createdAt`, `metadata.createdBy`, `metadata.updatedAt`,
 * `metadata.labels`, `steps`, `tasks`, and `dependencies` — are
 * preserved unchanged by reference. The input `workflow` is never
 * mutated.
 */
function withTransition(
  workflow: Workflow,
  nextStatus: Workflow['status'],
): Workflow {
  return {
    ...workflow,
    status: nextStatus,
    metadata: {
      ...workflow.metadata,
      revision: workflow.metadata.revision + 1,
    },
  };
}

/**
 * `WorkflowLifecycleManager` performs deterministic, offline
 * workflow lifecycle state transitions — Milestone 6.
 *
 * Each method (`pause`, `resume`, `cancel`) accepts a `Workflow` and
 * returns a **new** `Workflow` reflecting the requested transition.
 * The input `Workflow` is never mutated. When a transition actually
 * occurs, `metadata.revision` is incremented by exactly 1; when no
 * transition occurs (because the workflow's current `status` does
 * not satisfy the transition's precondition), a new object is still
 * returned but with `status` and `metadata` unchanged (including
 * `revision`), so that callers always receive a fresh `Workflow`
 * value without ever observing a no-op as a mutation of their input.
 *
 * `steps`, `tasks`, and `dependencies` are always preserved exactly
 * as given — this manager never changes task state, dependency
 * state, or step state, and never performs execution, scheduling,
 * retries, concurrency, persistence, or networking. It calls no
 * other Titan engine.
 */
export class WorkflowLifecycleManager {
  /**
   * If `workflow.status === 'running'`, returns a new `Workflow`
   * with `status` set to `'paused'` and `metadata.revision`
   * incremented by 1. Otherwise, returns a new `Workflow` with
   * `status` and `metadata` unchanged.
   *
   * Throws `OrchestratorValidationError` only for malformed input.
   */
  pause(workflow: Workflow): Workflow {
    const validated = requireWorkflowObject(workflow);

    if (validated.status === 'running') {
      return withTransition(validated, 'paused');
    }

    return { ...validated };
  }

  /**
   * If `workflow.status === 'paused'`, returns a new `Workflow` with
   * `status` set to `'running'` and `metadata.revision` incremented
   * by 1. Otherwise, returns a new `Workflow` with `status` and
   * `metadata` unchanged.
   *
   * Throws `OrchestratorValidationError` only for malformed input.
   */
  resume(workflow: Workflow): Workflow {
    const validated = requireWorkflowObject(workflow);

    if (validated.status === 'paused') {
      return withTransition(validated, 'running');
    }

    return { ...validated };
  }

  /**
   * If `workflow.status` is neither `'completed'` nor `'cancelled'`,
   * returns a new `Workflow` with `status` set to `'cancelled'` and
   * `metadata.revision` incremented by 1. Otherwise (the workflow is
   * already completed or already cancelled), returns a new
   * `Workflow` with `status` and `metadata` unchanged.
   *
   * Throws `OrchestratorValidationError` only for malformed input.
   */
  cancel(workflow: Workflow): Workflow {
    const validated = requireWorkflowObject(workflow);

    if (validated.status !== 'completed' && validated.status !== 'cancelled') {
      return withTransition(validated, 'cancelled');
    }

    return { ...validated };
  }
}
