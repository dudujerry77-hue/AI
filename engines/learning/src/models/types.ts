/**
 * Learning Engine domain model — Milestone 2.
 *
 * These types define the Learning Engine's planned public domain
 * model. They are pure, immutable data definitions only: no builder,
 * validator, runner, coordinator, or other behavior exists anywhere
 * in this package, and no Learning Engine public method is declared
 * yet (see `src/index.ts` Milestone 1). No value of any type defined
 * here is created, populated, or transformed by this module or by any
 * other Milestone 2 file.
 *
 * Every type below is derived from `architecture.md` Section 6.2's
 * "Learning Engine" entry (the approved Titan Core architecture,
 * authoritative over `current_phase.md` and code-level decisions per
 * that document's own precedence rule) and
 * `phases/phase-012-learning-engine-implementation.md`. No business
 * method or workflow stage beyond these named concepts has been
 * invented. See each type's docstring for its specific textual
 * grounding.
 *
 * `WorkflowResult` (Orchestrator Engine) and `ValidationVerdict`
 * (Validation Engine) are imported as read-only type references only,
 * matching architecture.md's statement that the Learning Engine
 * "Consumes: Outcomes and verdicts from the Orchestrator Engine
 * across completed tasks/phases." `WorkflowResult` is the Orchestrator
 * Engine's own docstring-labeled "Outcome payload for a completed or
 * terminated workflow"; `ValidationVerdict` is the only "verdict"
 * type defined anywhere in the repository. Importing these types does
 * not import, instantiate, or call either engine's runtime.
 */

import type { WorkflowResult } from '../../../orchestrator/src/models/types';
import type { ValidationVerdict } from '../../../validation/src/models/types';

/**
 * The four stages of a task/phase cycle the Learning Engine observes,
 * per architecture.md: "Observes full task/phase cycles (plan →
 * execute → validate → outcome)."
 */
export type LearningCycleStage = 'plan' | 'execute' | 'validate' | 'outcome';

/**
 * Category of durable lesson the Learning Engine distills from an
 * observed cycle, per architecture.md: "distills durable lessons:
 * what patterns worked, what failed and why, what estimates were
 * wrong."
 */
export type LearningLessonCategory = 'pattern-worked' | 'failure' | 'estimate-inaccuracy';

/**
 * Form of Knowledge Engine update the Learning Engine produces, per
 * architecture.md: "Converts these observations into updates for the
 * Knowledge Engine (new precedent, refined heuristics)."
 */
export type LearningKnowledgeUpdateType = 'new-precedent' | 'refined-heuristic';

/**
 * Status of a Learning Engine proposal (a knowledge update proposal
 * or a proposed ADR), reusing the exact status vocabulary
 * `decisions.md` requires of every ADR ("Every ADR must include:
 * context, decision, alternatives considered, consequences, and
 * status (`proposed`, `accepted`, `rejected`, `superseded`)").
 * Applying this vocabulary to every Learning Engine proposal type
 * gives structural form to architecture.md's boundary statement: "The
 * Learning Engine can *propose* new knowledge and even draft ADRs,
 * but it cannot unilaterally rewrite `constitution.md`,
 * `security_policy.md`, or accept its own proposed ADRs... It
 * observes and proposes; it does not decide or execute." No value of
 * this type is assigned by anything in this package in Milestone 2.
 */
export type LearningProposalStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

/**
 * Input shape describing the (future) upstream data the Learning
 * Engine is expected to observe: an Orchestrator Engine `WorkflowResult`
 * ("outcomes") together with the `ValidationVerdict` reached for the
 * same workflow ("verdicts"), per architecture.md's "Consumes:
 * Outcomes and verdicts from the Orchestrator Engine across completed
 * tasks/phases." `outcome` and `verdict` are consumed as plain,
 * read-only input values (via type only) — the Learning Engine never
 * imports, instantiates, or calls the Orchestrator Engine's or
 * Validation Engine's runtime.
 */
export interface LearningSubject {
  readonly outcome: WorkflowResult;
  readonly verdict: ValidationVerdict;
}

/**
 * A single structural, reproducible record of one observed task/phase
 * cycle, prior to any lesson being distilled from it. Grounded in
 * architecture.md's "Observes full task/phase cycles" together with
 * `phases/phase-012-learning-engine-implementation.md`'s Deliverables
 * line, "Tests for signal extraction and knowledge update pathways"
 * (this type is the structural output of that signal-extraction
 * step). Pure data only; no field here is computed, scored, or
 * inferred by any Milestone 2 file.
 */
export interface LearningObservation {
  readonly observationId: string;
  readonly subject: LearningSubject;
  readonly stage: LearningCycleStage;
  readonly observedAt: string;
}

/**
 * A single durable lesson distilled from one or more
 * `LearningObservation` records, per architecture.md: "distills
 * durable lessons: what patterns worked, what failed and why, what
 * estimates were wrong." Pure data only; not produced anywhere in
 * Milestone 2.
 */
export interface LearningLesson {
  readonly lessonId: string;
  readonly observationIds: readonly string[];
  readonly category: LearningLessonCategory;
  readonly description: string;
  readonly createdAt: string;
}

/**
 * A proposed update to the Knowledge Engine — new precedent or a
 * refined heuristic — per architecture.md: "Produces: Proposed
 * updates to the Knowledge Engine — new or revised heuristics..."
 * and `phases/phase-012-learning-engine-implementation.md`'s Scope
 * line, "Generate reusable heuristics and improvement proposals."
 * `status` starts and remains a data field only in Milestone 2 — no
 * value is ever assigned or transitioned by this package. Pure data
 * only; not produced anywhere in Milestone 2.
 */
export interface LearningKnowledgeUpdateProposal {
  readonly proposalId: string;
  readonly updateType: LearningKnowledgeUpdateType;
  readonly lessonIds: readonly string[];
  readonly description: string;
  readonly status: LearningProposalStatus;
  readonly proposedAt: string;
}

/**
 * A proposed ADR for recurring architectural friction, per
 * architecture.md: "Produces: ... proposed ADRs for recurring
 * architectural friction..." Field shape mirrors the mandatory ADR
 * content `decisions.md` itself requires: "Every ADR must include:
 * context, decision, alternatives considered, consequences, and
 * status." Per architecture.md's Learning Engine boundary statement,
 * the Learning Engine "cannot... accept its own proposed ADRs" —
 * `status` is a plain data field here; no value is ever assigned by
 * this package. Pure data only; not produced anywhere in Milestone 2.
 */
export interface LearningProposedAdr {
  readonly adrId: string;
  readonly title: string;
  readonly status: LearningProposalStatus;
  readonly context: string;
  readonly decision: string;
  readonly alternativesConsidered: readonly string[];
  readonly consequences: string;
  readonly relatedLessonIds: readonly string[];
  readonly proposedAt: string;
}

/**
 * A recurring risk flagged by the Learning Engine, per
 * architecture.md: "Produces: ... flagged recurring risks." Pure data
 * only; not produced anywhere in Milestone 2.
 */
export interface LearningFlaggedRisk {
  readonly riskId: string;
  readonly description: string;
  readonly relatedLessonIds: readonly string[];
  readonly flaggedAt: string;
}

/**
 * Immutable, structured bundle of everything the Learning Engine
 * produces from a set of observations, per architecture.md's
 * "Produces" line for the Learning Engine (new or revised heuristics,
 * proposed ADRs, flagged recurring risks) together with
 * `phases/phase-012-learning-engine-implementation.md`'s Acceptance
 * Criteria, "Learning proposals are traceable and auditable" (every
 * nested item carries id references back to its source lesson(s)).
 * Pure data only; not produced anywhere in Milestone 2.
 */
export interface LearningPipelineResult {
  readonly lessons: readonly LearningLesson[];
  readonly knowledgeUpdateProposals: readonly LearningKnowledgeUpdateProposal[];
  readonly proposedAdrs: readonly LearningProposedAdr[];
  readonly flaggedRisks: readonly LearningFlaggedRisk[];
}

/**
 * Immutable, structural handoff artifact packaging an already-built
 * `LearningKnowledgeUpdateProposal` for later consumption by the
 * Knowledge Engine, per `current_phase.md`'s Phase 012 Exit
 * Criterion: "Handoff artifacts support the Knowledge Engine feedback
 * loop." A Learning-owned type is used here rather than the Knowledge
 * Engine's own `KnowledgeCreateInput`/`KnowledgeRecord` types: mapping
 * a proposal onto those shapes would require inventing values for
 * fields no repository document grounds for a Learning Engine
 * proposal (`author`, `securityClass`, `approvalStatus`), and
 * assigning `approvalStatus` in particular would itself be exactly
 * the kind of governance decision architecture.md's Learning Engine
 * boundary statement prohibits ("It observes and proposes; it does
 * not decide"). This type carries the proposal verbatim, plus a
 * deterministic handoff identifier and timestamp, and nothing else.
 * Pure data only; not produced anywhere in Milestone 2, and no
 * Knowledge Engine type is referenced here, by type or otherwise.
 */
export interface LearningKnowledgeHandoff {
  readonly handoffId: string;
  readonly proposal: LearningKnowledgeUpdateProposal;
  readonly preparedAt: string;
}
