import type { WorkflowDispatchDecision, WorkflowDispatchResult } from '../../../orchestrator/src/models/types';
import { ExecutionValidationError } from '../errors/execution-errors';
import type { ExecutionBuildRequest, ExecutionRecord, ExecutionStatus, ExecutionTarget } from '../models/types';

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deterministic, structural derivation of an `ExecutionStatus` for a
 * freshly built `ExecutionRecord`. Milestone 3 performs no execution
 * of any kind, so every record built by `ExecutionBuilder` reports the
 * fixed status `'pending'` — a not-yet-started execution unit —
 * regardless of the input decision's `ready` flag. The decision is
 * accepted as a parameter (rather than hard-coding the literal at the
 * call site) so that a later milestone can extend this single,
 * explicit derivation point without touching `build`'s control flow.
 */
function deriveStatus(_decision: WorkflowDispatchDecision): ExecutionStatus {
  return 'pending';
}

/**
 * Deterministically derive an `executionId` from the workflow id and
 * item id. Pure string composition — no randomness, no clock access,
 * no external state.
 */
function deriveExecutionId(workflowId: string, itemId: string): string {
  return `execution-${workflowId}-${itemId}`;
}

/**
 * Deterministic, synchronous, offline structural translator from an
 * Orchestrator `WorkflowDispatchResult` into an `ExecutionRecord` —
 * Milestone 3.
 *
 * `ExecutionBuilder.build` performs pure structural translation only:
 *
 * - It selects the single `WorkflowDispatchDecision` from
 *   `request.dispatchResult.decisions` whose `itemId` matches
 *   `request.itemId`.
 * - `ExecutionTarget.workflowId` is copied verbatim from
 *   `request.dispatchResult.workflowId`.
 * - `ExecutionTarget.itemId` and `ExecutionTarget.itemType` are copied
 *   verbatim from the matched decision's `itemId` and `itemType`.
 * - `ExecutionRecord.executionId` is deterministically derived from
 *   `workflowId` and `itemId` (`execution-<workflowId>-<itemId>`).
 * - `ExecutionRecord.status` is deterministically derived as
 *   `'pending'` — Milestone 3 performs no execution, so every freshly
 *   built record reports the same structural not-yet-started status.
 * - `ExecutionRecord.createdAt` and `ExecutionRecord.updatedAt` are
 *   set to the same caller-supplied ISO-8601 timestamp (`timestamp`,
 *   defaulting to the current time read once at the start of `build`
 *   if omitted), so both fields are always equal on a freshly built
 *   record.
 *
 * `ExecutionBuilder` never mutates `request` or any of its nested
 * arrays/objects: every output value is built from freshly constructed
 * objects. IDs already present on the input (`workflowId`, `itemId`)
 * are preserved verbatim rather than regenerated.
 *
 * No execution logic, no retries, no scheduling, no persistence, no
 * networking, and no AI behavior are performed by this class. No
 * other Titan engine is called from this module — the Orchestrator
 * `WorkflowDispatchResult` type is used only as a read-only input
 * shape.
 */
export class ExecutionBuilder {
  /**
   * Deterministically translate an Orchestrator `WorkflowDispatchResult`
   * (identifying one target item by `itemId`) into an
   * `ExecutionRecord`.
   *
   * Throws `ExecutionValidationError` if `request`, `request.dispatchResult`,
   * or `request.itemId` is missing, malformed, or if no matching
   * dispatch decision for `itemId` exists on `request.dispatchResult`.
   *
   * `timestamp`, if supplied, is used verbatim (and identically) for
   * both `createdAt` and `updatedAt`. If omitted, the current time is
   * read exactly once via `new Date().toISOString()` and used for
   * both fields, so a single `build` call always produces a record
   * with `createdAt === updatedAt`.
   */
  build(request: ExecutionBuildRequest, timestamp?: string): ExecutionRecord {
    this.validateRequest(request);

    const dispatchResult = request.dispatchResult;
    const decision = this.findDecision(dispatchResult, request.itemId);

    const target: ExecutionTarget = {
      workflowId: dispatchResult.workflowId,
      itemId: decision.itemId,
      itemType: decision.itemType,
    };

    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    return {
      executionId: deriveExecutionId(target.workflowId, target.itemId),
      target,
      status: deriveStatus(decision),
      createdAt: resolvedTimestamp,
      updatedAt: resolvedTimestamp,
    };
  }

  private findDecision(dispatchResult: WorkflowDispatchResult, itemId: string): WorkflowDispatchDecision {
    const decision = dispatchResult.decisions.find((candidate) => candidate.itemId === itemId);

    if (decision === undefined) {
      throw new ExecutionValidationError(
        `No dispatch decision found for itemId "${itemId}" on the supplied WorkflowDispatchResult.`,
        [
          {
            field: 'itemId',
            code: 'unknown-item-id',
            message: `No dispatch decision found for itemId "${itemId}".`,
          },
        ],
      );
    }

    return decision;
  }

  private validateRequest(request: ExecutionBuildRequest): void {
    if (request === null || request === undefined || !isPlainObject(request)) {
      throw new ExecutionValidationError('ExecutionBuildRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'ExecutionBuildRequest must be a non-null object.',
        },
      ]);
    }

    const dispatchResult = request.dispatchResult;

    if (dispatchResult === null || dispatchResult === undefined || !isPlainObject(dispatchResult)) {
      throw new ExecutionValidationError('ExecutionBuildRequest.dispatchResult must be a non-null object.', [
        {
          field: 'request.dispatchResult',
          code: 'missing-dispatch-result',
          message: 'ExecutionBuildRequest.dispatchResult must be a non-null object.',
        },
      ]);
    }

    if (typeof dispatchResult.workflowId !== 'string' || dispatchResult.workflowId.trim().length === 0) {
      throw new ExecutionValidationError('ExecutionBuildRequest.dispatchResult.workflowId is required.', [
        {
          field: 'request.dispatchResult.workflowId',
          code: 'missing-workflow-id',
          message: 'ExecutionBuildRequest.dispatchResult.workflowId is required.',
        },
      ]);
    }

    if (!Array.isArray(dispatchResult.decisions)) {
      throw new ExecutionValidationError('ExecutionBuildRequest.dispatchResult.decisions must be an array.', [
        {
          field: 'request.dispatchResult.decisions',
          code: 'invalid-decisions',
          message: 'ExecutionBuildRequest.dispatchResult.decisions must be an array.',
        },
      ]);
    }

    if (typeof request.itemId !== 'string' || request.itemId.trim().length === 0) {
      throw new ExecutionValidationError('ExecutionBuildRequest.itemId is required.', [
        {
          field: 'request.itemId',
          code: 'missing-item-id',
          message: 'ExecutionBuildRequest.itemId is required.',
        },
      ]);
    }
  }
}
