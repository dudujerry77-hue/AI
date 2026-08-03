import { LearningProposedAdrBuilder } from '../adr/learning-proposed-adr-builder';
import { LearningLessonBuilder } from '../builders/learning-lesson-builder';
import { LearningProposalBuilder } from '../builders/learning-proposal-builder';
import type {
  LearningKnowledgeUpdateProposal,
  LearningObservation,
  LearningPipelineResult,
} from '../models/types';
import { LearningFlaggedRiskBuilder } from '../risk/learning-flagged-risk-builder';

/**
 * Deterministic, synchronous, offline coordinator that assembles a
 * `LearningPipelineResult` from `LearningObservation` records —
 * Milestone 6.
 *
 * `LearningPipelineBuilder.run` delegates every structural step to a
 * single-purpose helper and composes their outputs, resolving one
 * timestamp and passing it to all of them so every produced artifact
 * agrees on when it was produced:
 *
 * 1. `LearningLessonBuilder.build(observations)` → `lessons`, per
 *    architecture.md's "distills durable lessons: what patterns
 *    worked, what failed and why, what estimates were wrong."
 * 2. `LearningProposalBuilder.build(observations, timestamp, lessons,
 *    priorProposals)` → a single `LearningKnowledgeUpdateProposal`
 *    with real `lessonIds` and a structurally detected `updateType`,
 *    per architecture.md's "Produces: ... new or revised heuristics."
 * 3. `LearningFlaggedRiskBuilder.build(lessons)` → `flaggedRisks`, per
 *    architecture.md's "Produces: ... flagged recurring risks."
 * 4. `LearningProposedAdrBuilder.build(flaggedRisks)` → `proposedAdrs`,
 *    per architecture.md's "Produces: ... proposed ADRs for recurring
 *    architectural friction."
 *
 * This class contains no structural logic of its own beyond that
 * composition: no approval, no rejection, no policy evaluation, no
 * governance enforcement, no knowledge write, no persistence, no
 * networking, no AI logic, and no heuristic or ranking behavior. No
 * other Titan engine's runtime is called from this module.
 *
 * `run` is a pure function of its input: given the same `observations`,
 * `priorProposals`, and `timestamp`, it always returns an equivalent
 * `LearningPipelineResult`. It never mutates `observations` or
 * `priorProposals`.
 */
export class LearningPipelineBuilder {
  constructor(
    private readonly lessonBuilder: LearningLessonBuilder = new LearningLessonBuilder(),
    private readonly proposalBuilder: LearningProposalBuilder = new LearningProposalBuilder(),
    private readonly riskBuilder: LearningFlaggedRiskBuilder = new LearningFlaggedRiskBuilder(),
    private readonly adrBuilder: LearningProposedAdrBuilder = new LearningProposedAdrBuilder(),
  ) {}

  /**
   * Deterministically assemble a `LearningPipelineResult` from
   * `observations`, optionally comparing against `priorProposals` for
   * structural refined-heuristic detection.
   *
   * Propagates `LearningRequestError` unchanged from any delegate when
   * `observations` (or a value derived from it) is malformed. Lessons
   * whose category is `'pattern-worked'` produce no flagged risk and,
   * transitively, no proposed ADR — `flaggedRisks`/`proposedAdrs` may
   * legitimately be empty arrays.
   */
  run(
    observations: readonly LearningObservation[],
    priorProposals: readonly LearningKnowledgeUpdateProposal[] = [],
    timestamp?: string,
  ): LearningPipelineResult {
    const resolvedTimestamp = timestamp ?? new Date().toISOString();

    const lessons = this.lessonBuilder.build(observations, resolvedTimestamp);
    const proposal = this.proposalBuilder.build(
      observations,
      resolvedTimestamp,
      lessons,
      priorProposals,
    );
    const flaggedRisks = this.riskBuilder.build(lessons, resolvedTimestamp);
    const proposedAdrs =
      flaggedRisks.length > 0
        ? this.adrBuilder.build(flaggedRisks, resolvedTimestamp)
        : [];

    return {
      lessons,
      knowledgeUpdateProposals: [proposal],
      proposedAdrs,
      flaggedRisks,
    };
  }
}
