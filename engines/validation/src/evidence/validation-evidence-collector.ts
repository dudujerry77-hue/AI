import { ValidationRequestError } from '../errors/validation-errors';
import type { ValidationEvidence, ValidationSubject, ValidationVerdict } from '../models/types';

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deterministic, synchronous, offline structural evidence collector —
 * Milestone 5.
 *
 * `ValidationEvidenceCollector.collect` derives exactly one
 * `ValidationEvidence` record describing which Execution Engine
 * representation (`ExecutionSummary` or `ExecutionRecord`) an
 * already-built `ValidationVerdict` was structurally derived from.
 * Every field is copied or composed verbatim from data already
 * present on `subject`/`verdict` — nothing is inferred, guessed,
 * scored, or evaluated.
 *
 * **This is not real evidence collection.** It performs no test
 * output capture, no log collection, no artifact inspection, no
 * check execution, no policy or governance evaluation, no
 * persistence, no networking, no AI logic, and calls no other Titan
 * engine's runtime. It exists to satisfy the Phase 011 "evidence
 * reporting" deliverable structurally, pending a future milestone
 * that defines real evidence-gathering semantics.
 *
 * `collect` is a pure function of its input: given the same
 * `subject`/`verdict` pair and the same `timestamp`, it always
 * returns an equivalent evidence list. If `timestamp` is omitted, the
 * current time is read once via `new Date().toISOString()`. It never
 * mutates `subject` or `verdict`, and the returned list is a freshly
 * constructed, immutable value that never reuses a nested object
 * reference from either input.
 *
 * Malformed input — a `subject` or `verdict` that is not a
 * well-formed object at all (e.g. `null`, an array, or a verdict
 * missing its `target` object) — causes `collect` to throw
 * `ValidationRequestError`, consistent with `ValidationBuilder`'s and
 * `ValidationValidator`'s shape-validation behavior.
 */
export class ValidationEvidenceCollector {
  /**
   * Structurally derive evidence for `verdict`, given the
   * `ValidationSubject` it was built from.
   *
   * Throws `ValidationRequestError` if `subject` or `verdict` is not
   * a well-formed, inspectable object (missing entirely, `null`, an
   * array, or — for `verdict` — missing its nested `target` object).
   */
  collect(subject: ValidationSubject, verdict: ValidationVerdict, timestamp?: string): readonly ValidationEvidence[] {
    this.validateShape(subject, verdict);

    const source = subject.summary === undefined ? 'execution-record' : 'execution-summary';
    const sourceLabel = source === 'execution-summary' ? 'ExecutionSummary' : 'ExecutionRecord';
    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    const evidence: ValidationEvidence = {
      validationId: verdict.validationId,
      source,
      description: `Validation verdict ${verdict.validationId} was structurally derived from Execution Engine ${sourceLabel} ${verdict.target.executionId}.`,
      capturedAt: resolvedTimestamp,
    };

    return [evidence];
  }

  /**
   * Throws `ValidationRequestError` if `subject` is not a well-formed,
   * inspectable object, or if `verdict` is not a well-formed,
   * inspectable object with a nested `target` object. This is the
   * only condition under which `collect` throws.
   */
  private validateShape(subject: ValidationSubject, verdict: ValidationVerdict): void {
    if (subject === null || subject === undefined || !isPlainObject(subject)) {
      throw new ValidationRequestError('ValidationSubject must be a non-null object.', [
        {
          field: 'subject',
          code: 'missing-subject',
          message: 'ValidationSubject must be a non-null object.',
        },
      ]);
    }

    if (verdict === null || verdict === undefined || !isPlainObject(verdict)) {
      throw new ValidationRequestError('ValidationVerdict must be a non-null object.', [
        {
          field: 'verdict',
          code: 'missing-verdict',
          message: 'ValidationVerdict must be a non-null object.',
        },
      ]);
    }

    const target = (verdict as unknown as Record<string, unknown>).target;

    if (target === null || target === undefined || !isPlainObject(target)) {
      throw new ValidationRequestError('ValidationVerdict.target must be a non-null object.', [
        {
          field: 'verdict.target',
          code: 'missing-target',
          message: 'ValidationVerdict.target must be a non-null object.',
        },
      ]);
    }
  }
}
