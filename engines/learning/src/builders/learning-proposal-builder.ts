import { LearningRequestError } from '../errors/learning-errors';
import type { LearningKnowledgeUpdateProposal, LearningObservation } from '../models/types';

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
 * Deterministic, synchronous, offline structural composer from one or
 * more `LearningObservation` records into a single
 * `LearningKnowledgeUpdateProposal` — Milestone 4.
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
 * - `.lessonIds` is always `[]`. No `LearningLesson` is distilled by
 *   this class. `LearningLessonCategory` ('pattern-worked' | 'failure'
 *   | 'estimate-inaccuracy') has no field on `LearningObservation`,
 *   `WorkflowResult`, or `ValidationVerdict` it could be deterministically
 *   derived from without inventing a scoring or classification rule —
 *   `ValidationVerdict.status` ('pass' | 'fail' | 'partial') is a
 *   structural signal, but mapping it onto lesson categories would
 *   require assuming semantics ("partial means the estimate was
 *   wrong") that no repository document states. Lesson distillation
 *   is left for a future milestone once such a rule is explicitly
 *   grounded.
 * - `.updateType` is always `'new-precedent'` — a fixed, structural
 *   value. Distinguishing a genuinely new precedent from a refinement
 *   of an existing one would require comparing against the Knowledge
 *   Engine's stored history, which requires a cross-engine runtime
 *   call this class must not make. Absent that comparison, every
 *   proposal this class produces is structurally indistinguishable
 *   from a new precedent, so `'new-precedent'` is used rather than
 *   guessed.
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
   * Throws `LearningRequestError` if `observations` is not a
   * non-empty array, or if any entry is not a well-formed object with
   * a non-empty `observationId`.
   */
  build(observations: readonly LearningObservation[], timestamp?: string): LearningKnowledgeUpdateProposal {
    this.validateObservations(observations);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();
    const observationIds = observations.map((observation) => observation.observationId);

    return {
      proposalId: `proposal-${observationIds[0]}`,
      updateType: 'new-precedent',
      lessonIds: [],
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
