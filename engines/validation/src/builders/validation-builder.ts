import type { ExecutionSummary } from '../../../execution/src/models/types';
import { ValidationRequestError } from '../errors/validation-errors';
import type {
  ValidationPipelineResult,
  ValidationSubject,
  ValidationTarget,
  ValidationVerdict,
} from '../models/types';

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deterministically derive a `validationId` from the workflow id and
 * item id. Pure string composition — no randomness, no clock access,
 * no external state.
 */
function deriveValidationId(workflowId: string, itemId: string): string {
  return `validation-${workflowId}-${itemId}`;
}

/**
 * Deterministic, synchronous, offline structural translator from an
 * Execution Engine `ExecutionSummary` into a `ValidationPipelineResult`
 * — Milestone 3.
 *
 * `ValidationBuilder.build` performs pure structural translation only:
 *
 * - `ValidationTarget.workflowId`, `.itemId`, and `.itemType` are
 *   copied verbatim from `subject.summary.target`.
 * - `ValidationTarget.executionId` is copied verbatim from
 *   `subject.summary.executionId` (falling back to
 *   `subject.record.executionId` when `summary` is absent).
 * - `ValidationVerdict.validationId` is deterministically derived from
 *   `workflowId` and `itemId`
 *   (`validation-<workflowId>-<itemId>`).
 * - `ValidationVerdict.status` is deterministically derived as
 *   `'partial'` — Milestone 3 performs no real check evaluation of any
 *   kind, so every freshly built verdict reports the same structural,
 *   not-yet-evaluated status. This is never inferred from execution
 *   outcome; it is a fixed placeholder pending later milestones.
 * - `ValidationVerdict.checks` is always an empty array — no check of
 *   any kind (testing, quality, policy, security, governance) is
 *   performed.
 * - `ValidationVerdict.createdAt` and `.updatedAt` are set to the same
 *   caller-supplied ISO-8601 timestamp (`timestamp`, defaulting to the
 *   current time read once at the start of `build` if omitted), so
 *   both fields are always equal on a freshly built verdict.
 * - `ValidationPipelineResult.evidence` and `.escalations` are always
 *   empty arrays — no evidence is collected and no escalation is ever
 *   triggered by this class.
 *
 * `ValidationBuilder` never mutates `subject` or any of its nested
 * arrays/objects: every output value is built from freshly constructed
 * objects. Identifiers already present on the input (`executionId`,
 * `workflowId`, `itemId`, `itemType`) are preserved verbatim rather
 * than regenerated.
 *
 * No approval logic, no rejection logic, no learning integration, no
 * execution logic, no orchestration, no persistence, no networking, no
 * AI logic, and no heuristic behavior are performed by this class. No
 * other Titan engine's runtime is called from this module — the
 * Execution Engine's `ExecutionSummary` type is used only as a
 * read-only input shape (type-only import).
 */
export class ValidationBuilder {
  /**
   * Deterministically translate a `ValidationSubject` (wrapping an
   * Execution Engine `ExecutionRecord` and, optionally, its
   * `ExecutionSummary`) into a `ValidationPipelineResult`.
   *
   * Throws `ValidationRequestError` if `subject`, `subject.record`, or
   * the target identifiers derivable from it are missing or
   * malformed.
   *
   * `timestamp`, if supplied, is used verbatim (and identically) for
   * both `createdAt` and `updatedAt`. If omitted, the current time is
   * read exactly once via `new Date().toISOString()` and used for
   * both fields, so a single `build` call always produces a verdict
   * with `createdAt === updatedAt`.
   */
  build(
    subject: ValidationSubject,
    timestamp?: string,
  ): ValidationPipelineResult {
    this.validateSubject(subject);

    const target = this.deriveTarget(subject);
    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    const verdict: ValidationVerdict = {
      validationId: deriveValidationId(target.workflowId, target.itemId),
      target,
      status: 'partial',
      checks: [],
      createdAt: resolvedTimestamp,
      updatedAt: resolvedTimestamp,
    };

    return {
      verdict,
      evidence: [],
      escalations: [],
    };
  }

  private deriveTarget(subject: ValidationSubject): ValidationTarget {
    const record = subject.record;
    const summary = subject.summary;

    const source = summary?.target ?? record.target;
    const executionId = summary?.executionId ?? record.executionId;

    return {
      executionId,
      workflowId: source.workflowId,
      itemId: source.itemId,
      itemType: source.itemType,
    };
  }

  private validateSubject(subject: ValidationSubject): void {
    if (subject === null || subject === undefined || !isPlainObject(subject)) {
      throw new ValidationRequestError(
        'ValidationSubject must be a non-null object.',
        [
          {
            field: 'subject',
            code: 'missing-subject',
            message: 'ValidationSubject must be a non-null object.',
          },
        ],
      );
    }

    const record = (subject as unknown as Record<string, unknown>).record;

    if (record === null || record === undefined || !isPlainObject(record)) {
      throw new ValidationRequestError(
        'ValidationSubject.record must be a non-null object.',
        [
          {
            field: 'subject.record',
            code: 'missing-record',
            message: 'ValidationSubject.record must be a non-null object.',
          },
        ],
      );
    }

    const recordTarget = (record as Record<string, unknown>).target;
    const summary = (subject as unknown as Record<string, unknown>).summary as
      ExecutionSummary | undefined;

    if (summary === undefined) {
      if (
        recordTarget === null ||
        recordTarget === undefined ||
        !isPlainObject(recordTarget)
      ) {
        throw new ValidationRequestError(
          'ValidationSubject.record.target must be a non-null object.',
          [
            {
              field: 'subject.record.target',
              code: 'missing-target',
              message:
                'ValidationSubject.record.target must be a non-null object.',
            },
          ],
        );
      }
    } else if (
      !isPlainObject(summary) ||
      !isPlainObject((summary as unknown as Record<string, unknown>).target)
    ) {
      throw new ValidationRequestError(
        'ValidationSubject.summary.target must be a non-null object.',
        [
          {
            field: 'subject.summary.target',
            code: 'missing-target',
            message:
              'ValidationSubject.summary.target must be a non-null object.',
          },
        ],
      );
    }

    const target = (summary?.target ?? recordTarget) as Record<string, unknown>;

    if (
      typeof target.workflowId !== 'string' ||
      target.workflowId.trim().length === 0
    ) {
      throw new ValidationRequestError('The target workflowId is required.', [
        {
          field: 'target.workflowId',
          code: 'missing-workflow-id',
          message: 'The target workflowId must be a non-empty string.',
        },
      ]);
    }

    if (
      typeof target.itemId !== 'string' ||
      target.itemId.trim().length === 0
    ) {
      throw new ValidationRequestError('The target itemId is required.', [
        {
          field: 'target.itemId',
          code: 'missing-item-id',
          message: 'The target itemId must be a non-empty string.',
        },
      ]);
    }
  }
}
