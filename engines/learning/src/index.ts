import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { LearningObservationBuilder } from './builders/learning-observation-builder';
import { LearningProposalBuilder } from './builders/learning-proposal-builder';
import { LearningRequestError } from './errors/learning-errors';
import type {
  LearningKnowledgeUpdateProposal,
  LearningObservation,
  LearningSubject,
} from './models/types';

export { LearningObservationBuilder } from './builders/learning-observation-builder';
export { LearningProposalBuilder } from './builders/learning-proposal-builder';
export { LearningRequestError } from './errors/learning-errors';

export type {
  LearningCycleStage,
  LearningFlaggedRisk,
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
 */
export interface LearningObserveCycleRequest {
  readonly subject: LearningSubject;
}

export interface LearningGenerateProposalRequest {
  readonly observations: readonly LearningObservation[];
}

export interface LearningEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

/**
 * Learning Engine — Milestone 4 (Structural Signal Extraction and
 * Proposal Composition).
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
 * Both method names and their delegate builders are grounded in
 * architecture.md Section 6.2's Learning Engine entry ("Observes full
 * task/phase cycles"; "Produces: Proposed updates to the Knowledge
 * Engine — new or revised heuristics...") and
 * `phases/phase-012-learning-engine-implementation.md` ("Generate
 * reusable heuristics and improvement proposals"; "Tests for signal
 * extraction and knowledge update pathways"). No other business
 * method or workflow stage is declared.
 *
 * Neither method performs any lesson distillation, knowledge write,
 * approval, rejection, scoring, ranking, AI reasoning, execution,
 * orchestration, validation, persistence, networking, or heuristic
 * behavior — no scheduling, no retries, no filesystem access, and no
 * call to any other Titan engine's runtime beyond the type-only
 * Orchestrator/Validation Engine imports used to describe
 * `LearningSubject`.
 */
export class LearningEngine extends BaseEngine {
  private readonly learningObservationBuilder: LearningObservationBuilder;
  private readonly learningProposalBuilder: LearningProposalBuilder;

  constructor(options: LearningEngineOptions = {}) {
    super({
      id: options.id ?? 'learning-engine',
      name: options.name ?? 'Learning Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Learning Engine for Titan AI. Milestone 4 implements the shared runtime lifecycle contract, a deterministic structural observation builder, and a deterministic structural proposal builder; observeCycle() delegates entirely to LearningObservationBuilder and generateProposal() delegates entirely to LearningProposalBuilder.',
      capabilities: options.capabilities ?? ['learning.observe-cycle', 'learning.generate-proposal'],
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
}

export const learningEngine = {
  name: 'learning' as const,
  description:
    'Learning Engine Milestone 4: structural observation builder and structural proposal builder only. LearningEngine extends BaseEngine and inherits the full Titan runtime lifecycle contract. observeCycle() validates its request and delegates entirely to LearningObservationBuilder, which deterministically, structurally translates an Orchestrator Engine WorkflowResult and a Validation Engine ValidationVerdict into a LearningObservation. generateProposal() validates its request and delegates entirely to LearningProposalBuilder, which deterministically, structurally composes one or more LearningObservation records into a LearningKnowledgeUpdateProposal. No lesson distillation, knowledge write, approval, scoring, ranking, AI reasoning, or cross-engine runtime call exists anywhere in this package.',
};
