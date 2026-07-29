import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { LearningObservationBuilder } from './builders/learning-observation-builder';
import { LearningProposalBuilder } from './builders/learning-proposal-builder';
import { LearningRequestError } from './errors/learning-errors';
import { LearningKnowledgeHandoffBuilder } from './handoff/learning-knowledge-handoff-builder';
import type {
  LearningKnowledgeHandoff,
  LearningKnowledgeUpdateProposal,
  LearningObservation,
  LearningPipelineResult,
  LearningSubject,
} from './models/types';
import { LearningPipelineBuilder } from './pipeline/learning-pipeline-builder';

export { LearningProposedAdrBuilder } from './adr/learning-proposed-adr-builder';
export { LearningLessonBuilder } from './builders/learning-lesson-builder';
export { LearningObservationBuilder } from './builders/learning-observation-builder';
export { LearningProposalBuilder } from './builders/learning-proposal-builder';
export { LearningRequestError } from './errors/learning-errors';
export { LearningKnowledgeHandoffBuilder } from './handoff/learning-knowledge-handoff-builder';
export { LearningPipelineBuilder } from './pipeline/learning-pipeline-builder';
export { LearningFlaggedRiskBuilder } from './risk/learning-flagged-risk-builder';

export type {
  LearningCycleStage,
  LearningFlaggedRisk,
  LearningKnowledgeHandoff,
  LearningKnowledgeUpdateProposal,
  LearningKnowledgeUpdateType,
  LearningLesson,
  LearningLessonCategory,
  LearningObservation,
  LearningPipelineResult,
  LearningProposalStatus,
  LearningProposedAdr,
  LearningSubject,
} from './models/types';

/**
 * Request/response shapes for the Learning Engine's implemented
 * public API.
 *
 * `LearningObserveCycleRequest` carries a `LearningSubject` — an
 * Orchestrator Engine `WorkflowResult` ("outcomes") and a Validation
 * Engine `ValidationVerdict` ("verdicts") — per architecture.md's
 * "Consumes: Outcomes and verdicts from the Orchestrator Engine
 * across completed tasks/phases."
 *
 * `LearningGenerateProposalRequest` carries one or more already-built
 * `LearningObservation` records to compose into a single
 * `LearningKnowledgeUpdateProposal`.
 *
 * `LearningPrepareKnowledgeHandoffRequest` carries an already-built
 * `LearningKnowledgeUpdateProposal` to package into a
 * `LearningKnowledgeHandoff`, per `current_phase.md`'s Phase 012 Exit
 * Criterion: "Handoff artifacts support the Knowledge Engine feedback
 * loop."
 */
export interface LearningObserveCycleRequest {
  readonly subject: LearningSubject;
}

export interface LearningGenerateProposalRequest {
  readonly observations: readonly LearningObservation[];
}

export interface LearningPrepareKnowledgeHandoffRequest {
  readonly proposal: LearningKnowledgeUpdateProposal;
}

/**
 * `LearningAnalyzeCycleRequest` carries one or more already-built
 * `LearningObservation` records, plus optionally any prior
 * `LearningKnowledgeUpdateProposal` values (used only for structural
 * refined-heuristic detection), to assemble into a full
 * `LearningPipelineResult` — lessons, a knowledge-update proposal,
 * flagged risks, and proposed ADRs — per architecture.md's Learning
 * Engine "Produces" line.
 */
export interface LearningAnalyzeCycleRequest {
  readonly observations: readonly LearningObservation[];
  readonly priorProposals?: readonly LearningKnowledgeUpdateProposal[];
}

export interface LearningEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

/**
 * Learning Engine — Milestone 6 (Structural Lessons, Risks, ADRs, and
 * Pipeline Assembly).
 *
 * Implements the shared Titan runtime engine contract, inherited
 * unchanged from `BaseEngine`: `initialize`, `start`, `stop`,
 * `health`, `metadata`, `version`, `contractVersion`, and
 * `getState`.
 *
 * Milestone 3 implements `observeCycle()`: it validates the incoming
 * `LearningObserveCycleRequest` and delegates entirely to
 * `LearningObservationBuilder.build` to deterministically,
 * structurally translate the supplied `LearningSubject` (an
 * Orchestrator Engine `WorkflowResult` and a Validation Engine
 * `ValidationVerdict`) into a `LearningObservation`.
 *
 * Milestone 4 implements `generateProposal()`: it validates the
 * incoming `LearningGenerateProposalRequest` and delegates entirely
 * to `LearningProposalBuilder.build` to deterministically,
 * structurally compose the supplied `LearningObservation` records
 * into a single `LearningKnowledgeUpdateProposal`.
 *
 * Milestone 5 implements `prepareKnowledgeHandoff()`: it validates the
 * incoming `LearningPrepareKnowledgeHandoffRequest` and delegates
 * entirely to `LearningKnowledgeHandoffBuilder.build` to
 * deterministically, structurally package the supplied
 * `LearningKnowledgeUpdateProposal` into a `LearningKnowledgeHandoff`
 * — implementing `current_phase.md`'s Phase 012 Exit Criterion:
 * "Handoff artifacts support the Knowledge Engine feedback loop."
 *
 * Milestone 6 implements `analyzeCycle()`: it validates the incoming
 * `LearningAnalyzeCycleRequest` and delegates entirely to
 * `LearningPipelineBuilder.run`, which composes `LearningLessonBuilder`,
 * `LearningProposalBuilder`, `LearningFlaggedRiskBuilder`, and
 * `LearningProposedAdrBuilder` to deterministically, structurally
 * produce a full `LearningPipelineResult` — implementing
 * architecture.md's Learning Engine "Produces" line in full: "new or
 * revised heuristics, proposed ADRs for recurring architectural
 * friction, flagged recurring risks."
 *
 * All method names and their delegate builders are grounded in
 * architecture.md Section 6.2's Learning Engine entry ("Observes full
 * task/phase cycles"; "distills durable lessons..."; "Produces:
 * Proposed updates to the Knowledge Engine — new or revised
 * heuristics, proposed ADRs..., flagged recurring risks..."),
 * `phases/phase-012-learning-engine-implementation.md`, and
 * `current_phase.md`'s Exit Criteria. No other business method or
 * workflow stage is declared.
 *
 * No method performs any AI reasoning, heuristic scoring, ranking,
 * approval, rejection, execution, orchestration, validation,
 * persistence, networking, filesystem/database access, or knowledge
 * write — no scheduling, no retries, and no call to any other Titan
 * engine's runtime beyond the type-only Orchestrator/Validation Engine
 * imports used to describe `LearningSubject`. In particular,
 * `prepareKnowledgeHandoff()` and `analyzeCycle()` never import,
 * instantiate, or call the Knowledge Engine's runtime, and never
 * decide whether a proposal or ADR is accepted or rejected — every
 * produced proposal and ADR always has `status: 'proposed'`.
 */
export class LearningEngine extends BaseEngine {
  private readonly learningObservationBuilder: LearningObservationBuilder;
  private readonly learningProposalBuilder: LearningProposalBuilder;
  private readonly learningKnowledgeHandoffBuilder: LearningKnowledgeHandoffBuilder;
  private readonly learningPipelineBuilder: LearningPipelineBuilder;

  constructor(options: LearningEngineOptions = {}) {
    super({
      id: options.id ?? 'learning-engine',
      name: options.name ?? 'Learning Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Learning Engine for Titan AI. Milestone 6 implements the shared runtime lifecycle contract plus deterministic structural builders for observations, proposals, Knowledge Engine handoffs, lessons, flagged risks, proposed ADRs, and full pipeline assembly. observeCycle() delegates entirely to LearningObservationBuilder, generateProposal() delegates entirely to LearningProposalBuilder, prepareKnowledgeHandoff() delegates entirely to LearningKnowledgeHandoffBuilder, and analyzeCycle() delegates entirely to LearningPipelineBuilder.',
      capabilities: options.capabilities ?? [
        'learning.observe-cycle',
        'learning.generate-proposal',
        'learning.prepare-knowledge-handoff',
        'learning.analyze-cycle',
      ],
      lifecycleManager: options.lifecycleManager,
      eventBus: options.eventBus,
      logger: options.logger,
      config: options.config,
      metrics: options.metrics,
      healthMonitor: options.healthMonitor,
      authenticationProvider: options.authenticationProvider,
      authorizationProvider: options.authorizationProvider,
      auditLogger: options.auditLogger,
      permissionChecker: options.permissionChecker,
      secretProvider: options.secretProvider,
    });

    this.learningObservationBuilder = new LearningObservationBuilder();
    this.learningProposalBuilder = new LearningProposalBuilder();
    this.learningKnowledgeHandoffBuilder = new LearningKnowledgeHandoffBuilder();
    this.learningPipelineBuilder = new LearningPipelineBuilder();
  }

  /**
   * Validate the given request shape and delegate entirely to
   * `LearningObservationBuilder.build` to deterministically,
   * structurally translate the supplied `LearningSubject` into a
   * `LearningObservation`.
   *
   * Throws `LearningRequestError` if `request` is missing or
   * malformed (including if `request.subject` is missing, `null`, or
   * not an inspectable object). Performs no lesson distillation, no
   * proposal generation, no knowledge writes, no scoring, no AI
   * logic, and calls no other Titan engine's runtime.
   */
  async observeCycle(request: LearningObserveCycleRequest): Promise<LearningObservation> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new LearningRequestError('LearningObserveCycleRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'LearningObserveCycleRequest must be a non-null object.',
        },
      ]);
    }

    return this.learningObservationBuilder.build(request.subject);
  }

  /**
   * Validate the given request shape and delegate entirely to
   * `LearningProposalBuilder.build` to deterministically, structurally
   * compose the supplied `LearningObservation` records into a single
   * `LearningKnowledgeUpdateProposal`.
   *
   * Throws `LearningRequestError` if `request` is missing or
   * malformed (including if `request.observations` is missing or not
   * a non-empty array of well-formed observations). Performs no
   * lesson distillation, no knowledge writes, no scoring, no ranking,
   * no AI logic, and calls no other Titan engine's runtime.
   */
  async generateProposal(request: LearningGenerateProposalRequest): Promise<LearningKnowledgeUpdateProposal> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new LearningRequestError('LearningGenerateProposalRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'LearningGenerateProposalRequest must be a non-null object.',
        },
      ]);
    }

    return this.learningProposalBuilder.build(request.observations);
  }

  /**
   * Validate the given request shape and delegate entirely to
   * `LearningKnowledgeHandoffBuilder.build` to deterministically,
   * structurally package the supplied `LearningKnowledgeUpdateProposal`
   * into a `LearningKnowledgeHandoff`.
   *
   * Throws `LearningRequestError` if `request` is missing or
   * malformed (including if `request.proposal` is missing, `null`, or
   * not a well-formed `LearningKnowledgeUpdateProposal`). Performs no
   * persistence, no networking, no filesystem/database access, no AI
   * logic, no approval or rejection decision, and calls no other
   * Titan engine's runtime — in particular, it never imports,
   * instantiates, or calls the Knowledge Engine's runtime.
   */
  async prepareKnowledgeHandoff(
    request: LearningPrepareKnowledgeHandoffRequest,
  ): Promise<LearningKnowledgeHandoff> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new LearningRequestError('LearningPrepareKnowledgeHandoffRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'LearningPrepareKnowledgeHandoffRequest must be a non-null object.',
        },
      ]);
    }

    return this.learningKnowledgeHandoffBuilder.build(request.proposal);
  }

  /**
   * Validate the given request shape and delegate entirely to
   * `LearningPipelineBuilder.run` to deterministically, structurally
   * assemble the supplied `LearningObservation` records (and,
   * optionally, prior `LearningKnowledgeUpdateProposal` values used
   * only for structural refined-heuristic detection) into a full
   * `LearningPipelineResult`.
   *
   * Throws `LearningRequestError` if `request` is missing or
   * malformed (including if `request.observations` is missing or not
   * a non-empty array of well-formed observations). Performs no AI
   * logic, no heuristic scoring, no ranking, no persistence, no
   * networking, no approval or rejection decision, and calls no other
   * Titan engine's runtime — in particular, it never imports,
   * instantiates, or calls the Knowledge Engine's runtime.
   */
  async analyzeCycle(request: LearningAnalyzeCycleRequest): Promise<LearningPipelineResult> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new LearningRequestError('LearningAnalyzeCycleRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'LearningAnalyzeCycleRequest must be a non-null object.',
        },
      ]);
    }

    return this.learningPipelineBuilder.run(request.observations, request.priorProposals ?? []);
  }
}

export const learningEngine = {
  name: 'learning' as const,
  description:
    'Learning Engine Milestone 6: structural observation, proposal, Knowledge Engine handoff, lesson, flagged-risk, proposed-ADR, and pipeline-assembly builders. LearningEngine extends BaseEngine and inherits the full Titan runtime lifecycle contract. observeCycle() delegates entirely to LearningObservationBuilder. generateProposal() delegates entirely to LearningProposalBuilder. prepareKnowledgeHandoff() delegates entirely to LearningKnowledgeHandoffBuilder. analyzeCycle() delegates entirely to LearningPipelineBuilder, which composes LearningLessonBuilder, LearningProposalBuilder, LearningFlaggedRiskBuilder, and LearningProposedAdrBuilder into a full LearningPipelineResult. No AI reasoning, heuristic scoring, ranking, approval, rejection, knowledge write, persistence, networking, or cross-engine runtime call exists anywhere in this package.',
};
