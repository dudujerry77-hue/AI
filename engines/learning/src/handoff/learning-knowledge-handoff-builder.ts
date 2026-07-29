import { LearningRequestError } from '../errors/learning-errors';
import type { LearningKnowledgeHandoff, LearningKnowledgeUpdateProposal } from '../models/types';

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
 * Deterministic, synchronous, offline structural translator from an
 * already-built `LearningKnowledgeUpdateProposal` into a
 * `LearningKnowledgeHandoff` — implementing `current_phase.md`'s
 * Phase 012 Exit Criterion: "Handoff artifacts support the Knowledge
 * Engine feedback loop."
 *
 * `LearningKnowledgeHandoffBuilder.build` performs pure structural
 * packaging only:
 *
 * - `LearningKnowledgeHandoff.proposal` is a freshly constructed copy
 *   of the supplied `proposal`, copied verbatim — no field is
 *   re-derived, scored, or judged.
 * - `LearningKnowledgeHandoff.handoffId` is deterministically derived
 *   as `handoff-<proposalId>`.
 * - `LearningKnowledgeHandoff.preparedAt` is the caller-supplied
 *   `timestamp` (used verbatim), or, if omitted, the current time
 *   read once via `new Date().toISOString()`.
 *
 * This class never mutates its input. It throws `LearningRequestError`
 * only when `proposal` is missing or malformed.
 *
 * It performs no persistence, no networking, no filesystem/database
 * access, no AI reasoning, no heuristic scoring, no ranking, no
 * approval or rejection decision, and calls no other Titan engine's
 * runtime. In particular, it never imports, instantiates, or calls
 * the Knowledge Engine's runtime, and does not reference any
 * Knowledge Engine type — the produced `LearningKnowledgeHandoff` is
 * a Learning-owned artifact only, left for a future milestone or
 * caller to map onto the Knowledge Engine's own contract.
 */
export class LearningKnowledgeHandoffBuilder {
  /**
   * Deterministically package `proposal` into a
   * `LearningKnowledgeHandoff`.
   *
   * Throws `LearningRequestError` if `proposal` is not a well-formed
   * object with a non-empty `proposalId`.
   */
  build(proposal: LearningKnowledgeUpdateProposal, timestamp?: string): LearningKnowledgeHandoff {
    this.validateProposal(proposal);

    const resolvedTimestamp = timestamp ?? new Date().toISOString();
    const preservedProposal: LearningKnowledgeUpdateProposal = {
      ...proposal,
      lessonIds: [...proposal.lessonIds],
    };

    return {
      handoffId: `handoff-${proposal.proposalId}`,
      proposal: preservedProposal,
      preparedAt: resolvedTimestamp,
    };
  }

  private validateProposal(proposal: LearningKnowledgeUpdateProposal): void {
    if (proposal === null || proposal === undefined || !isPlainObject(proposal)) {
      throw new LearningRequestError('LearningKnowledgeUpdateProposal must be a non-null object.', [
        {
          field: 'proposal',
          code: 'missing-proposal',
          message: 'LearningKnowledgeUpdateProposal must be a non-null object.',
        },
      ]);
    }

    if (!isNonEmptyString((proposal as unknown as Record<string, unknown>).proposalId)) {
      throw new LearningRequestError('LearningKnowledgeUpdateProposal.proposalId is required.', [
        {
          field: 'proposal.proposalId',
          code: 'missing-proposal-id',
          message: 'LearningKnowledgeUpdateProposal.proposalId must be a non-empty string.',
        },
      ]);
    }

    if (!Array.isArray((proposal as unknown as Record<string, unknown>).lessonIds)) {
      throw new LearningRequestError('LearningKnowledgeUpdateProposal.lessonIds must be an array.', [
        {
          field: 'proposal.lessonIds',
          code: 'invalid-lesson-ids',
          message: 'LearningKnowledgeUpdateProposal.lessonIds must be an array.',
        },
      ]);
    }
  }
}
