import { LearningRequestError } from '../errors/learning-errors';
import type { LearningFlaggedRisk, LearningLesson } from '../models/types';

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
 * Deterministic, synchronous, offline structural filter/translator
 * from `LearningLesson` records into `LearningFlaggedRisk` records —
 * implementing architecture.md's Learning Engine "Produces" line:
 * "... flagged recurring risks."
 *
 * `LearningFlaggedRiskBuilder.build` performs pure structural
 * classification only:
 *
 * - Every lesson whose `category` is `'failure'` or
 *   `'estimate-inaccuracy'` produces exactly one `LearningFlaggedRisk`.
 *   Lessons whose `category` is `'pattern-worked'` produce no risk —
 *   flagging a repeated success as a "risk" would misuse the word.
 * - The word "recurring" in architecture.md's line is deliberately
 *   **not** implemented as a frequency or threshold rule here: no
 *   repository document defines what count or time window makes a
 *   risk "recurring," and inventing one would cross into heuristic
 *   scoring or ranking. Every risk-eligible lesson is instead treated
 *   as a structural risk candidate, one-to-one, with no counting,
 *   weighting, or ranking of any kind.
 * - `.riskId` is deterministically derived as `risk-<lessonId>`.
 * - `.description` is a structural composition referencing only the
 *   lesson id and category already present on the input.
 * - `.relatedLessonIds` is always `[lesson.lessonId]`.
 * - `.flaggedAt` is the caller-supplied `timestamp` (used verbatim for
 *   every produced risk), or, if omitted, the current time read once
 *   via `new Date().toISOString()`.
 *
 * `LearningFlaggedRiskBuilder` never mutates its input. It throws
 * `LearningRequestError` only when `lessons` is not a non-empty array
 * of well-formed `LearningLesson`-shaped values.
 *
 * No AI reasoning, no heuristic scoring, no ranking, no persistence,
 * no networking, and no call to any other Titan engine's runtime
 * exist anywhere in this class.
 */
export class LearningFlaggedRiskBuilder {
  /**
   * Deterministically derive zero or more `LearningFlaggedRisk`
   * records from `lessons`, one per risk-eligible lesson (`category`
   * `'failure'` or `'estimate-inaccuracy'`).
   *
   * Throws `LearningRequestError` if `lessons` is not a non-empty
   * array, or if any entry is not a well-formed `LearningLesson`-shaped
   * object.
   */
  build(lessons: readonly LearningLesson[], timestamp?: string): readonly LearningFlaggedRisk[] {
    this.validateLessons(lessons);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    return lessons
      .filter((lesson) => lesson.category === 'failure' || lesson.category === 'estimate-inaccuracy')
      .map((lesson) => ({
        riskId: `risk-${lesson.lessonId}`,
        description: `Flagged risk derived from lesson ${lesson.lessonId} (category: ${lesson.category}).`,
        relatedLessonIds: [lesson.lessonId],
        flaggedAt: resolvedTimestamp,
      }));
  }

  private validateLessons(lessons: readonly LearningLesson[]): void {
    if (lessons === null || lessons === undefined || !Array.isArray(lessons)) {
      throw new LearningRequestError('lessons must be a non-empty array.', [
        {
          field: 'lessons',
          code: 'missing-lessons',
          message: 'lessons must be a non-empty array.',
        },
      ]);
    }

    if (lessons.length === 0) {
      throw new LearningRequestError('lessons must contain at least one entry.', [
        {
          field: 'lessons',
          code: 'empty-lessons',
          message: 'lessons must contain at least one entry.',
        },
      ]);
    }

    lessons.forEach((lesson, index) => {
      if (!isPlainObject(lesson)) {
        throw new LearningRequestError(`lessons[${index}] must be a non-null object.`, [
          {
            field: `lessons[${index}]`,
            code: 'invalid-lesson',
            message: `lessons[${index}] must be a non-null object.`,
          },
        ]);
      }

      if (!isNonEmptyString((lesson as unknown as Record<string, unknown>).lessonId)) {
        throw new LearningRequestError(`lessons[${index}].lessonId is required.`, [
          {
            field: `lessons[${index}].lessonId`,
            code: 'missing-lesson-id',
            message: `lessons[${index}].lessonId must be a non-empty string.`,
          },
        ]);
      }

      const category = (lesson as unknown as Record<string, unknown>).category;
      if (category !== 'pattern-worked' && category !== 'failure' && category !== 'estimate-inaccuracy') {
        throw new LearningRequestError(`lessons[${index}].category is required.`, [
          {
            field: `lessons[${index}].category`,
            code: 'missing-category',
            message: `lessons[${index}].category must be one of: pattern-worked, failure, estimate-inaccuracy.`,
          },
        ]);
      }
    });
  }
}
