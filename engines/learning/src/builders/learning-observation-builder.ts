import { LearningRequestError } from '../errors/learning-errors';
import type { LearningObservation, LearningSubject } from '../models/types';

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deterministic, synchronous, offline structural translator from a
 * `LearningSubject` into a `LearningObservation` — Milestone 3.
 *
 * `LearningObservationBuilder.build` performs pure structural
 * translation only, matching architecture.md's statement that the
 * Learning Engine "Observes full task/phase cycles":
 *
 * - `LearningObservation.subject` is a freshly constructed wrapper
 *   around the same `outcome`/`verdict` values supplied on `subject`
 *   — copied verbatim, never re-derived.
 * - `LearningObservation.observationId` is deterministically derived
 *   as `observation-<workflowId>-<validationId>`, from
 *   `subject.outcome.workflowId` and `subject.verdict.validationId`.
 * - `LearningObservation.stage` is always `'outcome'` — a fixed,
 *   structural value, never inferred or chosen among the other three
 *   `LearningCycleStage` values. This is not a placeholder pending a
 *   later milestone: a `WorkflowResult` is, by the Orchestrator
 *   Engine's own definition, "Outcome payload for a completed or
 *   terminated workflow," so every `LearningSubject` this builder can
 *   ever receive structurally represents the `'outcome'` stage.
 * - `LearningObservation.observedAt` is the caller-supplied
 *   `timestamp` (used verbatim), or, if omitted, the current time
 *   read once via `new Date().toISOString()`.
 *
 * `LearningObservationBuilder` never mutates its input. It throws
 * `LearningRequestError` only when `subject`, `subject.outcome`, or
 * `subject.verdict` are missing or malformed.
 *
 * No lesson distillation, no proposal generation, no knowledge
 * writes, no scoring, no ranking, no AI reasoning, no persistence, no
 * networking, and no call to any other Titan engine's runtime exist
 * anywhere in this class. `subject.outcome`/`subject.verdict` are
 * consumed only as plain, read-only input values (via type only).
 */
export class LearningObservationBuilder {
  /**
   * Deterministically translate a `LearningSubject` into a
   * `LearningObservation`.
   *
   * Throws `LearningRequestError` if `subject`, `subject.outcome`, or
   * `subject.verdict` is missing or malformed.
   */
  build(subject: LearningSubject, timestamp?: string): LearningObservation {
    this.validateSubject(subject);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();
    const preservedSubject: LearningSubject = {
      outcome: subject.outcome,
      verdict: subject.verdict,
    };

    return {
      observationId: `observation-${subject.outcome.workflowId}-${subject.verdict.validationId}`,
      subject: preservedSubject,
      stage: 'outcome',
      observedAt: resolvedTimestamp,
    };
  }

  private validateSubject(subject: LearningSubject): void {
    if (subject === null || subject === undefined || !isPlainObject(subject)) {
      throw new LearningRequestError('LearningSubject must be a non-null object.', [
        {
          field: 'subject',
          code: 'missing-subject',
          message: 'LearningSubject must be a non-null object.',
        },
      ]);
    }

    const outcome = (subject as unknown as Record<string, unknown>).outcome;

    if (outcome === null || outcome === undefined || !isPlainObject(outcome)) {
      throw new LearningRequestError('LearningSubject.outcome must be a non-null object.', [
        {
          field: 'subject.outcome',
          code: 'missing-outcome',
          message: 'LearningSubject.outcome must be a non-null object.',
        },
      ]);
    }

    if (typeof outcome.workflowId !== 'string' || outcome.workflowId.trim().length === 0) {
      throw new LearningRequestError('LearningSubject.outcome.workflowId is required.', [
        {
          field: 'subject.outcome.workflowId',
          code: 'missing-workflow-id',
          message: 'LearningSubject.outcome.workflowId must be a non-empty string.',
        },
      ]);
    }

    const verdict = (subject as unknown as Record<string, unknown>).verdict;

    if (verdict === null || verdict === undefined || !isPlainObject(verdict)) {
      throw new LearningRequestError('LearningSubject.verdict must be a non-null object.', [
        {
          field: 'subject.verdict',
          code: 'missing-verdict',
          message: 'LearningSubject.verdict must be a non-null object.',
        },
      ]);
    }

    if (typeof verdict.validationId !== 'string' || verdict.validationId.trim().length === 0) {
      throw new LearningRequestError('LearningSubject.verdict.validationId is required.', [
        {
          field: 'subject.verdict.validationId',
          code: 'missing-validation-id',
          message: 'LearningSubject.verdict.validationId must be a non-empty string.',
        },
      ]);
    }
  }
}
