import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { NotImplementedError } from './errors/orchestrator-errors';
import type { WorkflowContext } from './models/types';

export { NotImplementedError } from './errors/orchestrator-errors';

export type {

  Workflow,
  WorkflowContext,
  WorkflowDependency,
  WorkflowDependencyType,
  WorkflowExecutionMode,
  WorkflowMetadata,
  WorkflowPriority,
  WorkflowResult,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepStatus,
  WorkflowSummary,
  WorkflowTask,
  WorkflowTaskStatus,
} from './models/types';

/**
 * Milestone 2 request/response shapes for the Orchestrator public
 * API. These now use the Orchestrator domain model (`./models/types`)
 * for their typed fields, but carry no orchestration semantics: every
 * public API method remains an unimplemented stub that throws
 * `NotImplementedError`, exactly as in Milestone 1.
 */
export interface OrchestratorOrchestrateRequest {
  readonly planId: string;
  readonly context?: WorkflowContext;
}

export interface OrchestratorExecuteWorkflowRequest {
  readonly workflowId: string;
  readonly context?: WorkflowContext;
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
 * Orchestrator Engine — Milestone 2 (Domain Model & Public API Types).
 *
 * Implements the shared Titan runtime engine contract (via
 * `BaseEngine`, unchanged from Milestone 1) and exposes the
 * Orchestrator public API method signatures typed against the
 * Orchestrator domain model (`./models/types`). Every API method
 * remains an unimplemented stub that throws `NotImplementedError`,
 * exactly as in Milestone 1.
 *
 * No orchestration logic, workflow routing, scheduling, execution, or
 * coordination behavior exists yet. No other engine (Planner,
 * Knowledge, Context, Execution, or otherwise) is called from this
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
        'Central coordination engine for Titan AI. Milestone 2 introduces the Orchestrator domain model and typed public API signatures; orchestrate, executeWorkflow, pauseWorkflow, resumeWorkflow, cancelWorkflow, and getWorkflowStatus remain unimplemented stubs that throw NotImplementedError.',
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
    throw new NotImplementedError('OrchestratorEngine.orchestrate is not implemented in Milestone 2');
  }

  async executeWorkflow(_request: OrchestratorExecuteWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.executeWorkflow is not implemented in Milestone 2');
  }

  async pauseWorkflow(_request: OrchestratorPauseWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.pauseWorkflow is not implemented in Milestone 2');
  }

  async resumeWorkflow(_request: OrchestratorResumeWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.resumeWorkflow is not implemented in Milestone 2');
  }

  async cancelWorkflow(_request: OrchestratorCancelWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.cancelWorkflow is not implemented in Milestone 2');
  }

  async getWorkflowStatus(_request: OrchestratorGetWorkflowStatusRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.getWorkflowStatus is not implemented in Milestone 2');
  }
}

export const orchestratorEngine = {
  name: 'orchestrator' as const,
  description:
    'Orchestrator Engine Milestone 2: domain model and typed public API signatures only. All public API methods (orchestrate, executeWorkflow, pauseWorkflow, resumeWorkflow, cancelWorkflow, getWorkflowStatus) remain unimplemented stubs.',
};
