import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { NotImplementedError } from './errors/orchestrator-errors';

export { NotImplementedError } from './errors/orchestrator-errors';

/**
 * Milestone 1 placeholder request/response shapes for the Orchestrator
 * public API. These carry no orchestration semantics; they exist only
 * so each stub method has a typed signature to implement against in
 * later milestones.
 */
export interface OrchestratorOrchestrateRequest {
  readonly planId: string;
  readonly context?: Record<string, unknown>;
}

export interface OrchestratorExecuteWorkflowRequest {
  readonly workflowId: string;
  readonly context?: Record<string, unknown>;
}

export interface OrchestratorPauseWorkflowRequest {
  readonly workflowId: string;
  readonly reason?: string;
}

export interface OrchestratorResumeWorkflowRequest {
  readonly workflowId: string;
}

export interface OrchestratorCancelWorkflowRequest {
  readonly workflowId: string;
  readonly reason?: string;
}

export interface OrchestratorGetWorkflowStatusRequest {
  readonly workflowId: string;
}

export interface OrchestratorPlaceholderResult {
  readonly status: 'not-implemented';
  readonly message: string;
}

export interface OrchestratorEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

/**
 * Orchestrator Engine — Milestone 1 (Runtime Foundation).
 *
 * Implements only the shared Titan runtime engine contract (via
 * `BaseEngine`) and exposes the Orchestrator public API method
 * signatures. Every API method is an unimplemented stub that throws
 * `NotImplementedError`.
 *
 * No orchestration logic, workflow routing, scheduling, execution, or
 * coordination behavior exists yet. No other engine (Planner,
 * Knowledge, Context, Memory, or otherwise) is called from this
 * package.
 */
export class OrchestratorEngine extends BaseEngine {
  constructor(options: OrchestratorEngineOptions = {}) {
    super({
      id: options.id ?? 'orchestrator-engine',
      name: options.name ?? 'Orchestrator Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Central coordination engine for Titan AI. Milestone 1 implements only the runtime foundation and public API surface; orchestrate, executeWorkflow, pauseWorkflow, resumeWorkflow, cancelWorkflow, and getWorkflowStatus are all unimplemented stubs that throw NotImplementedError.',
      capabilities: options.capabilities ?? [
        'orchestrator.orchestrate',
        'orchestrator.execute-workflow',
        'orchestrator.pause-workflow',
        'orchestrator.resume-workflow',
        'orchestrator.cancel-workflow',
        'orchestrator.get-workflow-status',
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
  }

  async orchestrate(_request: OrchestratorOrchestrateRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.orchestrate is not implemented in Milestone 1');
  }

  async executeWorkflow(_request: OrchestratorExecuteWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.executeWorkflow is not implemented in Milestone 1');
  }

  async pauseWorkflow(_request: OrchestratorPauseWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.pauseWorkflow is not implemented in Milestone 1');
  }

  async resumeWorkflow(_request: OrchestratorResumeWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.resumeWorkflow is not implemented in Milestone 1');
  }

  async cancelWorkflow(_request: OrchestratorCancelWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.cancelWorkflow is not implemented in Milestone 1');
  }

  async getWorkflowStatus(_request: OrchestratorGetWorkflowStatusRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.getWorkflowStatus is not implemented in Milestone 1');
  }
}

export const orchestratorEngine = {
  name: 'orchestrator' as const,
  description:
    'Orchestrator Engine Milestone 1: runtime foundation only. All public API methods (orchestrate, executeWorkflow, pauseWorkflow, resumeWorkflow, cancelWorkflow, getWorkflowStatus) are unimplemented stubs.',
};
