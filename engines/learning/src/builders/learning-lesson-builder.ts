import { LearningRequestError } from '../errors/learning-errors';
import type { LearningLesson, LearningLessonCategory, LearningObservation } from '../models/types';
import type { ValidationVerdictStatus } from '../../../validation/src/models/types';

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
 * Fixed, total, deterministic classification table from a Validation
 * Engine `ValidationVerdictStatus` to a `LearningLessonCategory`. This
 * is a structural lookup, not a heuristic judgment: `'pass'` and
 * `'failure'` map to their near-synonymous `LearningLessonCategory`
 * counterparts (`'pattern-worked'`, `'failure'`), and `'partial'` maps
 * to the one remaining category (`'estimate-inaccuracy'`) by
 * elimination — every possible `ValidationVerdictStatus` value maps to
 * exactly one category, with no scoring, weighting, or ranking
 * involved. This mirrors `ExecutionStatusTracker`'s established
 * pattern of deriving a classification field from a fixed lookup keyed
 * on an existing status field.
 */
const LESSON_CATEGORY_BY_VERDICT_STATUS: Readonly<Record<ValidationVerdictStatus, LearningLessonCategory>> = {
  pass: 'pattern-worked',
  fail: 'failure',
  partial: 'estimate-inaccuracy',
};

/**
 * Deterministic, synchronous, offline structural distiller from
 * `LearningObservation` records into `LearningLesson` records —
 * implementing architecture.md's Learning Engine responsibility line:
 * "distills durable lessons: what patterns worked, what failed and
 * why, what estimates were wrong."
 *
 * `LearningLessonBuilder.build` performs pure structural
 * classification and composition only:
 *
 * - Exactly one `LearningLesson` is produced per input
 *   `LearningObservation`.
 * - `.lessonId` is deterministically derived as
 *   `lesson-<observationId>`.
 * - `.observationIds` is always `[observation.observationId]`.
 * - `.category` is derived via the fixed `LESSON_CATEGORY_BY_VERDICT_STATUS`
 *   lookup table, keyed on `observation.subject.verdict.status` — a
 *   total, deterministic classification, never a scored or weighted
 *   judgment.
 * - `.description` is a structural composition referencing only the
 *   observation id and the verdict status already present on the
 *   input — no summarization, judgment, or natural-language
 *   generation.
 * - `.createdAt` is the caller-supplied `timestamp` (used verbatim
 *   for every produced lesson), or, if omitted, the current time read
 *   once via `new Date().toISOString()`.
 *
 * `LearningLessonBuilder` never mutates its input. It throws
 * `LearningRequestError` only when `observations` is not a non-empty
 * array of well-formed `LearningObservation`-shaped values.
 *
 * No AI reasoning, no heuristic scoring, no ranking, no persistence,
 * no networking, and no call to any other Titan engine's runtime
 * exist anywhere in this class.
 */
export class LearningLessonBuilder {
  /**
   * Deterministically distill `observations` into one
   * `LearningLesson` per entry.
   *
   * Throws `LearningRequestError` if `observations` is not a
   * non-empty array, or if any entry is not a well-formed
   * `LearningObservation`-shaped object.
   */
  build(observations: readonly LearningObservation[], timestamp?: string): readonly LearningLesson[] {
    this.validateObservations(observations);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    return observations.map((observation) => {
      const status = observation.subject.verdict.status;
      const category = LESSON_CATEGORY_BY_VERDICT_STATUS[status];

      return {
        lessonId: `lesson-${observation.observationId}`,
        observationIds: [observation.observationId],
        category,
        description: `Lesson distilled from observation ${observation.observationId}: Validation Engine verdict status was "${status}".`,
        createdAt: resolvedTimestamp,
      };
    });
  }

  private validateObservations(observations: readonly LearningObservation[]): void {
    if (observations === null || observations === undefined || !Array.isArray(observations)) {
      throw new LearningRequestError('observations must be a non-empty array.', [
        {
          field: 'observations',
          code: 'missing-observations',
          message: 'observations must be a non-empty array.',
        },
      ]);
    }

    if (observations.length === 0) {
      throw new LearningRequestError('observations must contain at least one entry.', [
        {
          field: 'observations',
          code: 'empty-observations',
          message: 'observations must contain at least one entry.',
        },
      ]);
    }

    observations.forEach((observation, index) => {
      if (!isPlainObject(observation)) {
        throw new LearningRequestError(`observations[${index}] must be a non-null object.`, [
          {
            field: `observations[${index}]`,
            code: 'invalid-observation',
            message: `observations[${index}] must be a non-null object.`,
          },
        ]);
      }

      if (!isNonEmptyString((observation as unknown as Record<string, unknown>).observationId)) {
        throw new LearningRequestError(`observations[${index}].observationId is required.`, [
          {
            field: `observations[${index}].observationId`,
            code: 'missing-observation-id',
            message: `observations[${index}].observationId must be a non-empty string.`,
          },
        ]);
      }

      const subject = (observation as unknown as Record<string, unknown>).subject;
      const verdict = isPlainObject(subject) ? (subject as Record<string, unknown>).verdict : undefined;
      const status = isPlainObject(verdict) ? (verdict as Record<string, unknown>).status : undefined;

      if (typeof status !== 'string' || !(status in LESSON_CATEGORY_BY_VERDICT_STATUS)) {
        throw new LearningRequestError(`observations[${index}].subject.verdict.status is required.`, [
          {
            field: `observations[${index}].subject.verdict.status`,
            code: 'missing-verdict-status',
            message: `observations[${index}].subject.verdict.status must be one of: ${Object.keys(LESSON_CATEGORY_BY_VERDICT_STATUS).join(', ')}.`,
          },
        ]);
      }
    });
  }
}
