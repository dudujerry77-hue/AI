import { LearningRequestError } from '../errors/learning-errors';
import type {
  LearningKnowledgeUpdateProposal,
  LearningKnowledgeUpdateType,
  LearningLesson,
  LearningObservation,
} from '../models/types';

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
 * Returns true when any lesson id in `candidateLessonIds` also
 * appears in any prior proposal's `lessonIds`. A pure, deterministic
 * set-membership check — no scoring, weighting, or ranking.
 */
function hasLessonOverlap(
  candidateLessonIds: readonly string[],
  priorProposals: readonly LearningKnowledgeUpdateProposal[],
): boolean {
  if (candidateLessonIds.length === 0) {
    return false;
  }

  const candidateSet = new Set(candidateLessonIds);
  return priorProposals.some((prior) => prior.lessonIds.some((lessonId) => candidateSet.has(lessonId)));
}

/**
 * Deterministic, synchronous, offline structural composer from one or
 * more `LearningObservation` records into a single
 * `LearningKnowledgeUpdateProposal` — Milestone 4, extended in
 * Milestone 6.
 *
 * `LearningProposalBuilder.build` performs pure structural
 * composition only, matching architecture.md's Learning Engine
 * "Produces" line ("new or revised heuristics") and
 * `phases/phase-012-learning-engine-implementation.md`'s Scope
 * ("Generate reusable heuristics and improvement proposals"):
 *
 * - `LearningKnowledgeUpdateProposal.proposalId` is deterministically
 *   derived as `proposal-<observationId>`, from the first entry of
 *   `observations`.
 * - `.lessonIds` is derived from the optional `lessons` parameter
 *   (added in Milestone 6): `lessons.map(lesson => lesson.lessonId)`.
 *   If `lessons` is omitted, `.lessonIds` is `[]`, unchanged from
 *   Milestone 4 — this class still performs no lesson distillation
 *   itself; lessons must be built separately (by
 *   `LearningLessonBuilder`) and supplied.
 * - `.updateType` is `'refined-heuristic'` when any id in the derived
 *   `.lessonIds` also appears in any of the optional `priorProposals`
 *   parameter's (added in Milestone 6) own `lessonIds` — a pure,
 *   deterministic set-membership check, never a scored or weighted
 *   judgment. Otherwise (including when `lessons`/`priorProposals`
 *   are omitted, exactly matching Milestone 4 behavior) it is
 *   `'new-precedent'`. This does not compare against the Knowledge
 *   Engine's stored history — it only compares against
 *   `LearningKnowledgeUpdateProposal` values the caller already has in
 *   hand, so no cross-engine runtime call is made.
 * - `.status` is always `'proposed'` — the only status architecture.md
 *   permits the Learning Engine to assign to its own output ("It
 *   observes and proposes; it does not decide or execute").
 * - `.description` is a structural composition listing the number of
 *   source observations and their ids — no summarization, judgment,
 *   or natural-language generation.
 * - `.proposedAt` is the caller-supplied `timestamp` (used verbatim),
 *   or, if omitted, the current time read once via
 *   `new Date().toISOString()`.
 *
 * `LearningProposalBuilder` never mutates its input. It throws
 * `LearningRequestError` only when `observations` is not a non-empty
 * array of well-formed `LearningObservation`-shaped values.
 *
 * No lesson distillation, no scoring, no ranking, no AI reasoning, no
 * knowledge writes, no persistence, no networking, and no call to any
 * other Titan engine's runtime exist anywhere in this class.
 */
export class LearningProposalBuilder {
  /**
   * Deterministically compose `observations` into a single
   * `LearningKnowledgeUpdateProposal`.
   *
   * `lessons` and `priorProposals` are optional and additive (added in
   * Milestone 6): omitting both reproduces Milestone 4 behavior
   * exactly (`lessonIds: []`, `updateType: 'new-precedent'`).
   *
   * Throws `LearningRequestError` if `observations` is not a
   * non-empty array, or if any entry is not a well-formed object with
   * a non-empty `observationId`.
   */
  build(
    observations: readonly LearningObservation[],
    timestamp?: string,
    lessons: readonly LearningLesson[] = [],
    priorProposals: readonly LearningKnowledgeUpdateProposal[] = [],
  ): LearningKnowledgeUpdateProposal {
    this.validateObservations(observations);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();
    const observationIds = observations.map((observation) => observation.observationId);
    const lessonIds = lessons.map((lesson) => lesson.lessonId);
    const updateType: LearningKnowledgeUpdateType = hasLessonOverlap(lessonIds, priorProposals)
      ? 'refined-heuristic'
      : 'new-precedent';

    return {
      proposalId: `proposal-${observationIds[0]}`,
      updateType,
      lessonIds,
      description: `Structural knowledge-update proposal composed from ${observationIds.length} observation(s): ${observationIds.join(', ')}.`,
      status: 'proposed',
      proposedAt: resolvedTimestamp,
    };
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
    });
  }
}
