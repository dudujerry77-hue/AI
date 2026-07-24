import { ExecutionValidationError } from '../errors/execution-errors';
import type { ExecutionRecord, ExecutionStatus, ExecutionSummary } from '../models/types';

const TERMINAL_STATUSES: readonly ExecutionStatus[] = ['completed', 'failed', 'cancelled'];

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
 * Deterministic, synchronous, offline structural status tracker for
 * `ExecutionRecord` values — Milestone 5.
 *
 * `ExecutionStatusTracker.summarize` computes only structural
 * information that is already present on an already-constructed
 * `ExecutionRecord`: its identifiers, its recorded `status`, its
 * recorded timestamps, a duration derived purely from those two
 * timestamps (when both are well-formed), and a terminal/cancelled
 * classification derived purely from the recorded `status` value.
 *
 * It performs no execution, no scheduling, no retries, no
 * persistence, no networking, no AI behavior, no reporting, and calls
 * no other Titan engine's runtime. It never infers, guesses, or
 * derives anything that is not already represented structurally on
 * the input `ExecutionRecord`.
 *
 * `summarize` is a pure function of its input: given the same
 * `ExecutionRecord`, it always returns an equivalent
 * `ExecutionSummary`. It never mutates its input, and the returned
 * `ExecutionSummary` is a freshly constructed, immutable value that
 * never reuses a nested object reference from the input.
 *
 * Malformed input — a `record` that is not a well-formed object at
 * all (e.g. `null`, an array, or missing its `target` object) — causes
 * `summarize` to throw `ExecutionValidationError`, consistent with
 * `ExecutionValidator`'s shape-validation behavior in Milestone 4.
 */
export class ExecutionStatusTracker {
  /**
   * Structurally summarize `record` and return a deterministic
   * `ExecutionSummary` describing only information already present on
   * the input.
   *
   * Throws `ExecutionValidationError` if `record` itself is not a
   * well-formed, inspectable object (missing entirely, `null`, an
   * array, or missing its nested `target` object).
   */
  summarize(record: ExecutionRecord): ExecutionSummary {
    this.validateShape(record);

    const target = record.target;
    const durationMs = this.deriveDurationMs(record.createdAt, record.updatedAt);
    const isTerminal = TERMINAL_STATUSES.includes(record.status);
    const isCancelled = record.status === 'cancelled';

    const summary: ExecutionSummary = {
      executionId: record.executionId,
      status: record.status,
      target: {
        workflowId: target.workflowId,
        itemId: target.itemId,
        itemType: target.itemType,
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isTerminal,
      isCancelled,
      ...(durationMs === undefined ? {} : { durationMs }),
    };

    return summary;
  }

  /**
   * Throws `ExecutionValidationError` if `record` is not a
   * well-formed, inspectable object with a nested `target` object.
   * This is the only condition under which `summarize` throws.
   */
  private validateShape(record: ExecutionRecord): void {
    if (record === null || record === undefined || !isPlainObject(record)) {
      throw new ExecutionValidationError('ExecutionRecord must be a non-null object.', [
        {
          field: 'record',
          code: 'missing-record',
          message: 'ExecutionRecord must be a non-null object.',
        },
      ]);
    }

    const target = (record as unknown as Record<string, unknown>).target;

    if (target === null || target === undefined || !isPlainObject(target)) {
      throw new ExecutionValidationError('ExecutionRecord.target must be a non-null object.', [
        {
          field: 'record.target',
          code: 'missing-target',
          message: 'ExecutionRecord.target must be a non-null object.',
        },
      ]);
    }
  }

  /**
   * Derives the duration in milliseconds between `createdAt` and
   * `updatedAt`, but only when both are well-formed ISO-8601 timestamp
   * strings. Returns `undefined` otherwise — never guessed, never
   * defaulted, and never clamped to zero.
   */
  private deriveDurationMs(createdAt: string, updatedAt: string): number | undefined {
    if (!isIsoTimestamp(createdAt) || !isIsoTimestamp(updatedAt)) {
      return undefined;
    }

    const createdAtMs = new Date(createdAt).getTime();
    const updatedAtMs = new Date(updatedAt).getTime();

    return updatedAtMs - createdAtMs;
  }
}
