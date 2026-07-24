import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import type { Plan } from '../../planner/src/models/types';
import { NotImplementedError, OrchestratorValidationError } from './errors/orchestrator-errors';
import { WorkflowBuilder } from './builders/workflow-builder';
import { WorkflowValidator, type WorkflowValidationResult } from './validation/workflow-validator';
import type { Workflow, WorkflowContext } from './models/types';

export { NotImplementedError, OrchestratorValidationError } from './errors/orchestrator-errors';
export { WorkflowBuilder } from './builders/workflow-builder';
export { WorkflowValidator, type WorkflowValidationResult } from './validation/workflow-validator';

export type { Plan } from '../../planner/src/models/types';

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
 * Request/response shapes for the Orchestrator public API.
 *
 * `OrchestratorOrchestrateRequest.plan` was introduced in Milestone 3
 * so that `orchestrate` can perform deterministic structural
 * translation of a Planner `Plan` into a `Workflow` via
 * `WorkflowBuilder`.
 *
 * `OrchestratorExecuteWorkflowRequest.workflow` was introduced in
 * Milestone 4 so that `executeWorkflow` can perform deterministic
 * structural validation of a `Workflow` via `WorkflowValidator`. Note
 * that, despite its name (kept for API stability with Milestones 1-3),
 * `executeWorkflow` does not execute anything in Milestone 4 — it
 * validates the supplied `Workflow` and returns the result.
 *
 * All other request/response shapes are unchanged and remain
 * unimplemented stubs.
 */
export interface OrchestratorOrchestrateRequest {
  readonly plan: Plan;
  readonly context?: WorkflowContext;
}

export interface OrchestratorExecuteWorkflowRequest {
  readonly workflow: Workflow;
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
 * Orchestrator Engine — Milestone 4 (Workflow Validation).
 *
 * Implements the shared Titan runtime engine contract (via
 * `BaseEngine`, unchanged since Milestone 1) and the Orchestrator
 * domain model (unchanged since Milestone 2).
 *
 * `orchestrate` (Milestone 3, unchanged): validates the request, then
 * delegates entirely to `WorkflowBuilder` to deterministically
 * translate the request's Planner `Plan` into a `Workflow`.
 *
 * `executeWorkflow` (Milestone 4, new): validates the request, then
 * delegates entirely to `WorkflowValidator` to deterministically
 * validate the request's `Workflow`, and returns the resulting
 * `WorkflowValidationResult`. It does not execute, schedule, retry, or
 * run anything concurrently, and it does not call any other engine.
 *
 * `pauseWorkflow`, `resumeWorkflow`, `cancelWorkflow`, and
 * `getWorkflowStatus` remain unimplemented stubs that throw
 * `NotImplementedError`, exactly as in Milestone 3.
 */
export class OrchestratorEngine extends BaseEngine {
  private readonly workflowBuilder: WorkflowBuilder;
  private readonly workflowValidator: WorkflowValidator;

  constructor(options: OrchestratorEngineOptions = {}) {
    super({
      id: options.id ?? 'orchestrator-engine',
      name: options.name ?? 'Orchestrator Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Central coordination engine for Titan AI. Milestone 3 implements deterministic structural translation of a Planner Plan into a Workflow for orchestrate(), via WorkflowBuilder. Milestone 4 implements deterministic structural validation of a Workflow for executeWorkflow(), via WorkflowValidator; pauseWorkflow, resumeWorkflow, cancelWorkflow, and getWorkflowStatus remain unimplemented stubs that throw NotImplementedError.',
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

    this.workflowBuilder = new WorkflowBuilder();
    this.workflowValidator = new WorkflowValidator();
  }

  /**
   * Validate the request, then deterministically translate the
   * request's Planner `Plan` into a `Workflow` using
   * `WorkflowBuilder` and return it.
   *
   * Milestone 3 scope only (unchanged in Milestone 4): pure structural
   * translation. No execution, no scheduling, no retries, no
   * concurrency, no calls to `PlannerEngine.createPlan` or any other
   * engine.
   */
  async orchestrate(request: OrchestratorOrchestrateRequest): Promise<Workflow> {
    this.validateOrchestrateRequest(request);

    return this.workflowBuilder.build(request.plan);
  }

  /**
   * Validate the request, then deterministically validate the
   * request's `Workflow` using `WorkflowValidator` and return the
   * resulting `WorkflowValidationResult`.
   *
   * Milestone 4 scope only: pure structural validation. No execution,
   * no scheduling, no retries, no concurrency, and no calls to any
   * other engine.
   */
  async executeWorkflow(request: OrchestratorExecuteWorkflowRequest): Promise<WorkflowValidationResult> {
    this.validateExecuteWorkflowRequest(request);

    return this.workflowValidator.validate(request.workflow);
  }

  async pauseWorkflow(_request: OrchestratorPauseWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.pauseWorkflow is not implemented in Milestone 4');
  }

  async resumeWorkflow(_request: OrchestratorResumeWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.resumeWorkflow is not implemented in Milestone 4');
  }

  async cancelWorkflow(_request: OrchestratorCancelWorkflowRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.cancelWorkflow is not implemented in Milestone 4');
  }

  async getWorkflowStatus(_request: OrchestratorGetWorkflowStatusRequest): Promise<OrchestratorPlaceholderResult> {
    throw new NotImplementedError('OrchestratorEngine.getWorkflowStatus is not implemented in Milestone 4');
  }

  private validateOrchestrateRequest(request: OrchestratorOrchestrateRequest): void {
    if (request === null || request === undefined) {
      throw new OrchestratorValidationError('OrchestratorOrchestrateRequest is required.', [
        { field: 'request', code: 'missing-request', message: 'OrchestratorOrchestrateRequest is required.' },
      ]);
    }

    if (request.plan === null || request.plan === undefined) {
      throw new OrchestratorValidationError('OrchestratorOrchestrateRequest.plan is required.', [
        { field: 'request.plan', code: 'missing-plan', message: 'OrchestratorOrchestrateRequest.plan is required.' },
      ]);
    }
  }

  private validateExecuteWorkflowRequest(request: OrchestratorExecuteWorkflowRequest): void {
    if (request === null || request === undefined) {
      throw new OrchestratorValidationError('OrchestratorExecuteWorkflowRequest is required.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'OrchestratorExecuteWorkflowRequest is required.',
        },
      ]);
    }

    if (request.workflow === null || request.workflow === undefined) {
      throw new OrchestratorValidationError('OrchestratorExecuteWorkflowRequest.workflow is required.', [
        {
          field: 'request.workflow',
          code: 'missing-workflow',
          message: 'OrchestratorExecuteWorkflowRequest.workflow is required.',
        },
      ]);
    }
  }
}

export const orchestratorEngine = {
  name: 'orchestrator' as const,
  description:
    'Orchestrator Engine Milestone 4: orchestrate() deterministically translates a Planner Plan into a Workflow via WorkflowBuilder; executeWorkflow() deterministically validates a Workflow via WorkflowValidator; pauseWorkflow, resumeWorkflow, cancelWorkflow, and getWorkflowStatus remain unimplemented stubs.',
};
