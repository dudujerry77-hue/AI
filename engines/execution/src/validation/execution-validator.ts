import { ExecutionValidationError } from '../errors/execution-errors';
import type {
  ExecutionRecord,
  ExecutionStatus,
  ExecutionValidationResult,
  ExecutionValidationResultIssue,
} from '../models/types';

const VALID_STATUSES: readonly ExecutionStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
];
const VALID_ITEM_TYPES: readonly string[] = ['step', 'task'];

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns true when `value` is a non-empty, non-whitespace-only
 * string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Returns true when `value` is a string that both parses as a valid
 * `Date` and round-trips through `toISOString()` unchanged, i.e. is a
 * well-formed ISO-8601 timestamp string.
 */
function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString() === value;
}

/**
 * Deterministic, synchronous, offline structural validator for
 * `ExecutionRecord` values — Milestone 4.
 *
 * `ExecutionValidator.validate` checks only the *structure* of an
 * already-constructed `ExecutionRecord`: presence and shape of
 * required identifiers, whether `target.itemType` and `status` are
 * members of their respective known enumerations, whether
 * `createdAt`/`updatedAt` are well-formed ISO-8601 timestamps, and
 * whether `updatedAt` is not earlier than `createdAt`. It performs no
 * execution, no scheduling, no retries, no persistence, no
 * networking, no AI behavior, and calls no other Titan engine's
 * runtime.
 *
 * `validate` is a pure function of its input: given the same
 * `ExecutionRecord`, it always returns an equivalent
 * `ExecutionValidationResult` (aside from `validatedAt`, which is
 * either the caller-supplied `timestamp` argument or, if omitted, the
 * current time read once via `new Date().toISOString()`). It never
 * mutates its input.
 *
 * Malformed input — a `record` that is not a well-formed object at
 * all (e.g. `null`, an array, or missing its `target` object) — causes
 * `validate` to throw `ExecutionValidationError`. Ordinary structural
 * defects in an otherwise well-formed record (e.g. an empty
 * `executionId`, an invalid `status` value, or `updatedAt` earlier
 * than `createdAt`) are never thrown; they are collected and returned
 * in `ExecutionValidationResult.issues`.
 */
export class ExecutionValidator {
  /**
   * Structurally validate `record` and return a deterministic
   * `ExecutionValidationResult` describing every structural defect
   * found, if any.
   *
   * Throws `ExecutionValidationError` if `record` itself is not a
   * well-formed, inspectable object (missing entirely, `null`, an
   * array, or missing its nested `target` object). All other
   * structural defects are reported as issues in the returned result
   * rather than thrown.
   */
  validate(
    record: ExecutionRecord,
    timestamp?: string,
  ): ExecutionValidationResult {
    this.validateShape(record);

    const issues: ExecutionValidationResultIssue[] = [];
    const target = record.target as unknown as Record<string, unknown>;

    this.checkExecutionId(record, issues);
    this.checkWorkflowId(target, issues);
    this.checkItemId(target, issues);
    this.checkItemType(target, issues);
    this.checkStatus(record, issues);
    this.checkTimestamps(record, issues);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    return {
      executionId: isNonEmptyString(record.executionId)
        ? record.executionId
        : '',
      valid: issues.length === 0,
      issues,
      validatedAt: resolvedTimestamp,
    };
  }

  /**
   * Throws `ExecutionValidationError` if `record` is not a
   * well-formed, inspectable object with a nested `target` object.
   * This is the only condition under which `validate` throws rather
   * than returning issues.
   */
  private validateShape(record: ExecutionRecord): void {
    if (record === null || record === undefined || !isPlainObject(record)) {
      throw new ExecutionValidationError(
        'ExecutionRecord must be a non-null object.',
        [
          {
            field: 'record',
            code: 'missing-record',
            message: 'ExecutionRecord must be a non-null object.',
          },
        ],
      );
    }

    const target = (record as unknown as Record<string, unknown>).target;

    if (target === null || target === undefined || !isPlainObject(target)) {
      throw new ExecutionValidationError(
        'ExecutionRecord.target must be a non-null object.',
        [
          {
            field: 'record.target',
            code: 'missing-target',
            message: 'ExecutionRecord.target must be a non-null object.',
          },
        ],
      );
    }
  }

  private checkExecutionId(
    record: ExecutionRecord,
    issues: ExecutionValidationResultIssue[],
  ): void {
    if (!isNonEmptyString(record.executionId)) {
      issues.push({
        field: 'executionId',
        code: 'MISSING_EXECUTION_ID',
        message: 'ExecutionRecord.executionId must be a non-empty string.',
      });
    }
  }

  private checkWorkflowId(
    target: Record<string, unknown>,
    issues: ExecutionValidationResultIssue[],
  ): void {
    if (!isNonEmptyString(target.workflowId)) {
      issues.push({
        field: 'target.workflowId',
        code: 'MISSING_WORKFLOW_ID',
        message:
          'ExecutionRecord.target.workflowId must be a non-empty string.',
      });
    }
  }

  private checkItemId(
    target: Record<string, unknown>,
    issues: ExecutionValidationResultIssue[],
  ): void {
    if (!isNonEmptyString(target.itemId)) {
      issues.push({
        field: 'target.itemId',
        code: 'MISSING_ITEM_ID',
        message: 'ExecutionRecord.target.itemId must be a non-empty string.',
      });
    }
  }

  private checkItemType(
    target: Record<string, unknown>,
    issues: ExecutionValidationResultIssue[],
  ): void {
    if (
      typeof target.itemType !== 'string' ||
      !VALID_ITEM_TYPES.includes(target.itemType)
    ) {
      issues.push({
        field: 'target.itemType',
        code: 'INVALID_ITEM_TYPE',
        message: `ExecutionRecord.target.itemType must be one of: ${VALID_ITEM_TYPES.join(', ')}.`,
      });
    }
  }

  private checkStatus(
    record: ExecutionRecord,
    issues: ExecutionValidationResultIssue[],
  ): void {
    if (
      typeof record.status !== 'string' ||
      !VALID_STATUSES.includes(record.status)
    ) {
      issues.push({
        field: 'status',
        code: 'INVALID_STATUS',
        message: `ExecutionRecord.status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    }
  }

  private checkTimestamps(
    record: ExecutionRecord,
    issues: ExecutionValidationResultIssue[],
  ): void {
    const createdAtRaw = (record as unknown as Record<string, unknown>)
      .createdAt;
    const updatedAtRaw = (record as unknown as Record<string, unknown>)
      .updatedAt;

    const createdAtPresent =
      createdAtRaw !== undefined &&
      createdAtRaw !== null &&
      createdAtRaw !== '';
    const updatedAtPresent =
      updatedAtRaw !== undefined &&
      updatedAtRaw !== null &&
      updatedAtRaw !== '';

    if (!createdAtPresent) {
      issues.push({
        field: 'createdAt',
        code: 'MISSING_CREATED_AT',
        message: 'ExecutionRecord.createdAt is required.',
      });
    } else if (!isIsoTimestamp(createdAtRaw)) {
      issues.push({
        field: 'createdAt',
        code: 'INVALID_CREATED_AT',
        message:
          'ExecutionRecord.createdAt must be a well-formed ISO-8601 timestamp string.',
      });
    }

    if (!updatedAtPresent) {
      issues.push({
        field: 'updatedAt',
        code: 'MISSING_UPDATED_AT',
        message: 'ExecutionRecord.updatedAt is required.',
      });
    } else if (!isIsoTimestamp(updatedAtRaw)) {
      issues.push({
        field: 'updatedAt',
        code: 'INVALID_UPDATED_AT',
        message:
          'ExecutionRecord.updatedAt must be a well-formed ISO-8601 timestamp string.',
      });
    }

    if (
      createdAtPresent &&
      updatedAtPresent &&
      isIsoTimestamp(createdAtRaw) &&
      isIsoTimestamp(updatedAtRaw)
    ) {
      const createdAtMs = new Date(createdAtRaw).getTime();
      const updatedAtMs = new Date(updatedAtRaw).getTime();

      if (updatedAtMs < createdAtMs) {
        issues.push({
          field: 'updatedAt',
          code: 'UPDATED_BEFORE_CREATED',
          message:
            'ExecutionRecord.updatedAt must not be earlier than ExecutionRecord.createdAt.',
        });
      }
    }
  }
}
