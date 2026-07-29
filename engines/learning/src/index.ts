import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';

export interface LearningEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

/**
 * Learning Engine — Milestone 1 (Runtime Foundation).
 *
 * Implements only the shared Titan runtime engine contract, inherited
 * unchanged from `BaseEngine`: `initialize`, `start`, `stop`,
 * `health`, `metadata`, `version`, `contractVersion`, and
 * `getState`. No business methods are declared in Milestone 1.
 *
 * Per the Phase 012 governance decision, the Learning Engine's public
 * business API (method names, request/response shapes, and workflow
 * stages) is deliberately not declared here. A specification-grounding
 * review — reading `phases/phase-012-learning-engine-implementation.md`,
 * `architecture.md`, and any Learning Engine specification document
 * they reference — must be performed before Milestone 3 so that every
 * business method or workflow stage is derived from explicit
 * repository requirements rather than extrapolated from the naming
 * conventions of prior engines.
 *
 * This class performs no signal extraction, no proposal generation,
 * no knowledge writes, no scoring or heuristic computation, no
 * persistence, no networking, no AI logic, and calls no other Titan
 * engine's runtime.
 */
export class LearningEngine extends BaseEngine {
  constructor(options: LearningEngineOptions = {}) {
    super({
      id: options.id ?? 'learning-engine',
      name: options.name ?? 'Learning Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Learning Engine for Titan AI. Milestone 1 implements only the shared runtime lifecycle contract inherited from BaseEngine. No business methods are declared yet; they are deferred pending a specification-grounding review ahead of Milestone 3.',
      capabilities: options.capabilities ?? [],
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
  }
}

export const learningEngine = {
  name: 'learning' as const,
  description:
    'Learning Engine Milestone 1: shared runtime lifecycle contract only, inherited unchanged from BaseEngine. No business methods are declared yet; they are deferred pending a specification-grounding review ahead of Milestone 3, so that no business method or workflow stage is invented without explicit support from the Phase 012 specification or the approved Titan Core architecture.',
};
