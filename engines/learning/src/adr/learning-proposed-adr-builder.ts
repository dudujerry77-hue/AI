import { LearningRequestError } from '../errors/learning-errors';
import type { LearningFlaggedRisk, LearningProposedAdr } from '../models/types';

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

const DECISION_PLACEHOLDER =
  'No decision has been made. This field is a structural placeholder pending the human-gated approval path defined in constitution.md and decisions.md.';

const CONSEQUENCES_PLACEHOLDER =
  'Consequences have not been analyzed. This field is a structural placeholder; no impact assessment was performed.';

/**
 * Deterministic, synchronous, offline structural translator from
 * `LearningFlaggedRisk` records into `LearningProposedAdr` records —
 * implementing architecture.md's Learning Engine "Produces" line:
 * "... proposed ADRs for recurring architectural friction..."
 *
 * `LearningProposedAdrBuilder.build` performs pure structural
 * translation only:
 *
 * - Exactly one `LearningProposedAdr` is produced per input
 *   `LearningFlaggedRisk`. As with `LearningFlaggedRiskBuilder`, the
 *   word "recurring" is deliberately **not** implemented as a
 *   frequency/threshold rule — no repository document defines one,
 *   and inventing one would cross into heuristic scoring or ranking.
 * - `.adrId` is deterministically derived as `adr-<riskId>`.
 * - `.title` is a structural composition referencing only the risk id.
 * - `.status` is always `'proposed'` — the only status
 *   architecture.md permits the Learning Engine to assign to its own
 *   output ("It observes and proposes; it does not decide or
 *   execute"). This class never assigns `'accepted'`.
 * - `.context` is the source risk's `description` field, copied
 *   verbatim — not re-derived, summarized, or judged.
 * - `.decision` and `.consequences` are fixed, documented structural
 *   placeholder strings: no repository document defines a rule for
 *   deriving real decision or consequence content from a flagged
 *   risk, so no such content is invented.
 * - `.alternativesConsidered` is always `[]` — no alternatives were
 *   actually evaluated, so none are claimed.
 * - `.relatedLessonIds` is copied verbatim from
 *   `risk.relatedLessonIds`.
 * - `.proposedAt` is the caller-supplied `timestamp` (used verbatim
 *   for every produced ADR), or, if omitted, the current time read
 *   once via `new Date().toISOString()`.
 *
 * `LearningProposedAdrBuilder` never mutates its input. It throws
 * `LearningRequestError` only when `risks` is not a non-empty array
 * of well-formed `LearningFlaggedRisk`-shaped values.
 *
 * No AI reasoning, no heuristic scoring, no ranking, no persistence,
 * no networking, no approval or rejection decision, and no call to
 * any other Titan engine's runtime exist anywhere in this class.
 */
export class LearningProposedAdrBuilder {
  /**
   * Deterministically translate `risks` into one `LearningProposedAdr`
   * per entry.
   *
   * Throws `LearningRequestError` if `risks` is not a non-empty
   * array, or if any entry is not a well-formed
   * `LearningFlaggedRisk`-shaped object.
   */
  build(risks: readonly LearningFlaggedRisk[], timestamp?: string): readonly LearningProposedAdr[] {
    this.validateRisks(risks);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    return risks.map((risk) => ({
      adrId: `adr-${risk.riskId}`,
      title: `Proposed ADR for flagged risk ${risk.riskId}`,
      status: 'proposed' as const,
      context: risk.description,
      decision: DECISION_PLACEHOLDER,
      alternativesConsidered: [],
      consequences: CONSEQUENCES_PLACEHOLDER,
      relatedLessonIds: [...risk.relatedLessonIds],
      proposedAt: resolvedTimestamp,
    }));
  }

  private validateRisks(risks: readonly LearningFlaggedRisk[]): void {
    if (risks === null || risks === undefined || !Array.isArray(risks)) {
      throw new LearningRequestError('risks must be a non-empty array.', [
        {
          field: 'risks',
          code: 'missing-risks',
          message: 'risks must be a non-empty array.',
        },
      ]);
    }

    if (risks.length === 0) {
      throw new LearningRequestError('risks must contain at least one entry.', [
        {
          field: 'risks',
          code: 'empty-risks',
          message: 'risks must contain at least one entry.',
        },
      ]);
    }

    risks.forEach((risk, index) => {
      if (!isPlainObject(risk)) {
        throw new LearningRequestError(`risks[${index}] must be a non-null object.`, [
          {
            field: `risks[${index}]`,
            code: 'invalid-risk',
            message: `risks[${index}] must be a non-null object.`,
          },
        ]);
      }

      if (!isNonEmptyString((risk as unknown as Record<string, unknown>).riskId)) {
        throw new LearningRequestError(`risks[${index}].riskId is required.`, [
          {
            field: `risks[${index}].riskId`,
            code: 'missing-risk-id',
            message: `risks[${index}].riskId must be a non-empty string.`,
          },
        ]);
      }

      if (!isNonEmptyString((risk as unknown as Record<string, unknown>).description)) {
        throw new LearningRequestError(`risks[${index}].description is required.`, [
          {
            field: `risks[${index}].description`,
            code: 'missing-description',
            message: `risks[${index}].description must be a non-empty string.`,
          },
        ]);
      }

      if (!Array.isArray((risk as unknown as Record<string, unknown>).relatedLessonIds)) {
        throw new LearningRequestError(`risks[${index}].relatedLessonIds must be an array.`, [
          {
            field: `risks[${index}].relatedLessonIds`,
            code: 'invalid-related-lesson-ids',
            message: `risks[${index}].relatedLessonIds must be an array.`,
          },
        ]);
      }
    });
  }
}
