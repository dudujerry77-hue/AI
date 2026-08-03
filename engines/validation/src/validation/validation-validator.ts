import { ValidationRequestError } from '../errors/validation-errors';
import type {
  ValidationCheckType,
  ValidationIssue,
  ValidationStructuralResult,
  ValidationVerdict,
  ValidationVerdictStatus,
} from '../models/types';

const VALID_STATUSES: readonly ValidationVerdictStatus[] = [
  'pass',
  'fail',
  'partial',
];
const VALID_ITEM_TYPES: readonly string[] = ['step', 'task'];
const VALID_CHECK_TYPES: readonly ValidationCheckType[] = [
  'testing',
  'quality',
  'policy',
  'security',
  'governance',
];

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
 * `ValidationVerdict` values — Milestone 4.
 *
 * `ValidationValidator.validate` checks only the *structure* of an
 * already-constructed `ValidationVerdict`: presence and shape of
 * required identifiers, whether `target.itemType`, `status`, and each
 * check's `checkType`/`status` are members of their respective known
 * enumerations, whether `createdAt`/`updatedAt` are well-formed
 * ISO-8601 timestamps, whether `updatedAt` is not earlier than
 * `createdAt`, and whether each entry in `checks` internally
 * references consistent, well-formed data. It performs no approval,
 * no rejection, no policy evaluation, no governance enforcement, no
 * learning integration, no persistence, no networking, no AI
 * behavior, and calls no other Titan engine's runtime.
 *
 * `validate` is a pure function of its input: given the same
 * `ValidationVerdict`, it always returns an equivalent
 * `ValidationStructuralResult` (aside from `validatedAt`, which is
 * either the caller-supplied `timestamp` argument or, if omitted, the
 * current time read once via `new Date().toISOString()`). It never
 * mutates its input.
 *
 * Malformed input — a `verdict` that is not a well-formed object at
 * all (e.g. `null`, an array, or missing its `target` object) —
 * causes `validate` to throw `ValidationRequestError`. Ordinary
 * structural defects in an otherwise well-formed verdict (e.g. an
 * empty `validationId`, an invalid `status` value, or `updatedAt`
 * earlier than `createdAt`) are never thrown; they are collected and
 * returned in `ValidationStructuralResult.issues`.
 */
export class ValidationValidator {
  /**
   * Structurally validate `verdict` and return a deterministic
   * `ValidationStructuralResult` describing every structural defect
   * found, if any.
   *
   * Throws `ValidationRequestError` if `verdict` itself is not a
   * well-formed, inspectable object (missing entirely, `null`, an
   * array, or missing its nested `target` object). All other
   * structural defects are reported as issues in the returned result
   * rather than thrown.
   */
  validate(
    verdict: ValidationVerdict,
    timestamp?: string,
  ): ValidationStructuralResult {
    this.validateShape(verdict);

    const issues: ValidationIssue[] = [];
    const target = verdict.target as unknown as Record<string, unknown>;

    this.checkValidationId(verdict, issues);
    this.checkExecutionId(target, issues);
    this.checkWorkflowId(target, issues);
    this.checkItemId(target, issues);
    this.checkItemType(target, issues);
    this.checkStatus(verdict, issues);
    this.checkChecks(verdict, issues);
    this.checkTimestamps(verdict, issues);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    return {
      validationId: isNonEmptyString(verdict.validationId)
        ? verdict.validationId
        : '',
      valid: issues.length === 0,
      issues,
      validatedAt: resolvedTimestamp,
    };
  }

  /**
   * Throws `ValidationRequestError` if `verdict` is not a
   * well-formed, inspectable object with a nested `target` object.
   * This is the only condition under which `validate` throws rather
   * than returning issues.
   */
  private validateShape(verdict: ValidationVerdict): void {
    if (verdict === null || verdict === undefined || !isPlainObject(verdict)) {
      throw new ValidationRequestError(
        'ValidationVerdict must be a non-null object.',
        [
          {
            field: 'verdict',
            code: 'missing-verdict',
            message: 'ValidationVerdict must be a non-null object.',
          },
        ],
      );
    }

    const target = (verdict as unknown as Record<string, unknown>).target;

    if (target === null || target === undefined || !isPlainObject(target)) {
      throw new ValidationRequestError(
        'ValidationVerdict.target must be a non-null object.',
        [
          {
            field: 'verdict.target',
            code: 'missing-target',
            message: 'ValidationVerdict.target must be a non-null object.',
          },
        ],
      );
    }
  }

  private checkValidationId(
    verdict: ValidationVerdict,
    issues: ValidationIssue[],
  ): void {
    if (!isNonEmptyString(verdict.validationId)) {
      issues.push({
        field: 'validationId',
        code: 'MISSING_VALIDATION_ID',
        message: 'ValidationVerdict.validationId must be a non-empty string.',
      });
    }
  }

  private checkExecutionId(
    target: Record<string, unknown>,
    issues: ValidationIssue[],
  ): void {
    if (!isNonEmptyString(target.executionId)) {
      issues.push({
        field: 'target.executionId',
        code: 'MISSING_EXECUTION_ID',
        message:
          'ValidationVerdict.target.executionId must be a non-empty string.',
      });
    }
  }

  private checkWorkflowId(
    target: Record<string, unknown>,
    issues: ValidationIssue[],
  ): void {
    if (!isNonEmptyString(target.workflowId)) {
      issues.push({
        field: 'target.workflowId',
        code: 'MISSING_TARGET',
        message:
          'ValidationVerdict.target.workflowId must be a non-empty string.',
      });
    }
  }

  private checkItemId(
    target: Record<string, unknown>,
    issues: ValidationIssue[],
  ): void {
    if (!isNonEmptyString(target.itemId)) {
      issues.push({
        field: 'target.itemId',
        code: 'MISSING_TARGET',
        message: 'ValidationVerdict.target.itemId must be a non-empty string.',
      });
    }
  }

  private checkItemType(
    target: Record<string, unknown>,
    issues: ValidationIssue[],
  ): void {
    if (
      typeof target.itemType !== 'string' ||
      !VALID_ITEM_TYPES.includes(target.itemType)
    ) {
      issues.push({
        field: 'target.itemType',
        code: 'MISSING_TARGET',
        message: `ValidationVerdict.target.itemType must be one of: ${VALID_ITEM_TYPES.join(', ')}.`,
      });
    }
  }

  private checkStatus(
    verdict: ValidationVerdict,
    issues: ValidationIssue[],
  ): void {
    if (
      typeof verdict.status !== 'string' ||
      !VALID_STATUSES.includes(verdict.status)
    ) {
      issues.push({
        field: 'status',
        code: 'INVALID_STATUS',
        message: `ValidationVerdict.status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    }
  }

  /**
   * Verifies internal reference consistency and shape of each entry
   * in `verdict.checks`: `checks` must be an array, and every entry
   * must be a well-formed object with a non-empty `checkId`, a
   * `checkType` from the known enumeration, and a `status` from the
   * known enumeration.
   */
  private checkChecks(
    verdict: ValidationVerdict,
    issues: ValidationIssue[],
  ): void {
    const checks = (verdict as unknown as Record<string, unknown>).checks;

    if (!Array.isArray(checks)) {
      issues.push({
        field: 'checks',
        code: 'MISSING_TARGET',
        message: 'ValidationVerdict.checks must be an array.',
      });
      return;
    }

    checks.forEach((check: unknown, index: number) => {
      if (!isPlainObject(check)) {
        issues.push({
          field: `checks[${index}]`,
          code: 'MISSING_TARGET',
          message: `ValidationVerdict.checks[${index}] must be a non-null object.`,
        });
        return;
      }

      if (!isNonEmptyString(check.checkId)) {
        issues.push({
          field: `checks[${index}].checkId`,
          code: 'MISSING_TARGET',
          message: `ValidationVerdict.checks[${index}].checkId must be a non-empty string.`,
        });
      }

      if (
        typeof check.checkType !== 'string' ||
        !VALID_CHECK_TYPES.includes(check.checkType as ValidationCheckType)
      ) {
        issues.push({
          field: `checks[${index}].checkType`,
          code: 'MISSING_TARGET',
          message: `ValidationVerdict.checks[${index}].checkType must be one of: ${VALID_CHECK_TYPES.join(', ')}.`,
        });
      }

      if (
        typeof check.status !== 'string' ||
        !VALID_STATUSES.includes(check.status as ValidationVerdictStatus)
      ) {
        issues.push({
          field: `checks[${index}].status`,
          code: 'INVALID_STATUS',
          message: `ValidationVerdict.checks[${index}].status must be one of: ${VALID_STATUSES.join(', ')}.`,
        });
      }
    });
  }

  private checkTimestamps(
    verdict: ValidationVerdict,
    issues: ValidationIssue[],
  ): void {
    const createdAtRaw = (verdict as unknown as Record<string, unknown>)
      .createdAt;
    const updatedAtRaw = (verdict as unknown as Record<string, unknown>)
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
        message: 'ValidationVerdict.createdAt is required.',
      });
    } else if (!isIsoTimestamp(createdAtRaw)) {
      issues.push({
        field: 'createdAt',
        code: 'MISSING_CREATED_AT',
        message:
          'ValidationVerdict.createdAt must be a well-formed ISO-8601 timestamp string.',
      });
    }

    if (!updatedAtPresent) {
      issues.push({
        field: 'updatedAt',
        code: 'MISSING_UPDATED_AT',
        message: 'ValidationVerdict.updatedAt is required.',
      });
    } else if (!isIsoTimestamp(updatedAtRaw)) {
      issues.push({
        field: 'updatedAt',
        code: 'MISSING_UPDATED_AT',
        message:
          'ValidationVerdict.updatedAt must be a well-formed ISO-8601 timestamp string.',
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
          code: 'MISSING_UPDATED_AT',
          message:
            'ValidationVerdict.updatedAt must not be earlier than ValidationVerdict.createdAt.',
        });
      }
    }
  }
}
