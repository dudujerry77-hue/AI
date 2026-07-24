import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import type { Plan } from '../../planner/src/models/types';
import { OrchestratorValidationError } from './errors/orchestrator-errors';
import { WorkflowBuilder } from './builders/workflow-builder';
import { WorkflowValidator, type WorkflowValidationResult } from './validation/workflow-validator';
import { WorkflowStatusTracker } from './status/workflow-status-tracker';
import { WorkflowLifecycleManager } from './lifecycle/workflow-lifecycle-manager';
import type { Workflow, WorkflowContext, WorkflowSummary } from './models/types';

export { NotImplementedError, OrchestratorValidationError } from './errors/orchestrator-errors';
export { WorkflowBuilder } from './builders/workflow-builder';
export { WorkflowValidator, type WorkflowValidationResult } from './validation/workflow-validator';
export { WorkflowStatusTracker } from './status/workflow-status-tracker';
export { WorkflowLifecycleManager } from './lifecycle/workflow-lifecycle-manager';

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
 * `OrchestratorGetWorkflowStatusRequest.workflow` was introduced in
 * Milestone 5 so that `getWorkflowStatus` can perform deterministic
 * structural status reporting via `WorkflowStatusTracker`.
 *
 * `OrchestratorPauseWorkflowRequest.workflow`,
 * `OrchestratorResumeWorkflowRequest.workflow`, and
 * `OrchestratorCancelWorkflowRequest.workflow` were introduced in
 * Milestone 6 so that `pauseWorkflow`, `resumeWorkflow`, and
 * `cancelWorkflow` can perform deterministic workflow lifecycle state
 * transitions via `WorkflowLifecycleManager`.
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
  readonly workflow: Workflow;
  readonly reason?: string;
}

export interface OrchestratorResumeWorkflowRequest {
  readonly workflow: Workflow;
}

export interface OrchestratorCancelWorkflowRequest {
  readonly workflow: Workflow;
  readonly reason?: string;
}

export interface OrchestratorGetWorkflowStatusRequest {
  readonly workflow: Workflow;
}

export interface OrchestratorEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

/**
 * Orchestrator Engine — Milestone 6 (Workflow Lifecycle Transitions).
 *
 * Implements the shared Titan runtime engine contract (via
 * `BaseEngine`, unchanged since Milestone 1) and the Orchestrator
 * domain model (unchanged since Milestone 2).
 *
 * `orchestrate` (Milestone 3, unchanged): validates the request, then
 * delegates entirely to `WorkflowBuilder` to deterministically
 * translate the request's Planner `Plan` into a `Workflow`.
 *
 * `executeWorkflow` (Milestone 4, unchanged): validates the request,
 * then delegates entirely to `WorkflowValidator` to deterministically
 * validate the request's `Workflow`, and returns the resulting
 * `WorkflowValidationResult`.
 *
 * `getWorkflowStatus` (Milestone 5, unchanged): validates the
 * request, then delegates entirely to `WorkflowStatusTracker` to
 * deterministically compute a `WorkflowSummary` for the request's
 * `Workflow`, and returns it.
 *
 * `pauseWorkflow`, `resumeWorkflow`, `cancelWorkflow` (Milestone 6,
 * new): each validates the request, then delegates entirely to
 * `WorkflowLifecycleManager` to deterministically compute a new
 * `Workflow` reflecting the requested lifecycle transition, and
 * returns it. None of these methods execute, schedule, retry, or run
 * anything concurrently; none persist or transmit anything; none
 * call any other engine; and none mutate the supplied `Workflow`.
 */
export class OrchestratorEngine extends BaseEngine {
  private readonly workflowBuilder: WorkflowBuilder;
  private readonly workflowValidator: WorkflowValidator;
  private readonly workflowStatusTracker: WorkflowStatusTracker;
  private readonly workflowLifecycleManager: WorkflowLifecycleManager;

  constructor(options: OrchestratorEngineOptions = {}) {
    super({
      id: options.id ?? 'orchestrator-engine',
      name: options.name ?? 'Orchestrator Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Central coordination engine for Titan AI. Milestone 3 implements deterministic structural translation of a Planner Plan into a Workflow for orchestrate(), via WorkflowBuilder. Milestone 4 implements deterministic structural validation of a Workflow for executeWorkflow(), via WorkflowValidator. Milestone 5 implements deterministic structural status reporting for getWorkflowStatus(), via WorkflowStatusTracker. Milestone 6 implements deterministic workflow lifecycle state transitions for pauseWorkflow(), resumeWorkflow(), and cancelWorkflow(), via WorkflowLifecycleManager.',
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
    this.workflowStatusTracker = new WorkflowStatusTracker();
    this.workflowLifecycleManager = new WorkflowLifecycleManager();
  }

  /**
   * Validate the request, then deterministically translate the
   * request's Planner `Plan` into a `Workflow` using
   * `WorkflowBuilder` and return it.
   *
   * Milestone 3 scope only (unchanged in Milestones 4-6): pure
   * structural translation. No execution, no scheduling, no retries,
   * no concurrency, no calls to `PlannerEngine.createPlan` or any
   * other engine.
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
   * Milestone 4 scope only (unchanged in Milestones 5-6): pure
   * structural validation. No execution, no scheduling, no retries,
   * no concurrency, and no calls to any other engine.
   */
  async executeWorkflow(request: OrchestratorExecuteWorkflowRequest): Promise<WorkflowValidationResult> {
    this.validateExecuteWorkflowRequest(request);

    return this.workflowValidator.validate(request.workflow);
  }

  /**
   * Validate the request, then deterministically compute a
   * `WorkflowSummary` for the request's `Workflow` using
   * `WorkflowStatusTracker` and return it.
   *
   * Milestone 5 scope only (unchanged in Milestone 6): pure
   * structural status reporting. No execution, no scheduling, no
   * retries, no concurrency, no persistence, no networking, and no
   * calls to any other engine. The supplied `Workflow` is never
   * mutated or modified.
   */
  async getWorkflowStatus(request: OrchestratorGetWorkflowStatusRequest): Promise<WorkflowSummary> {
    this.validateGetWorkflowStatusRequest(request);

    return this.workflowStatusTracker.summarize(request.workflow);
  }

  /**
   * Validate the request, then deterministically compute a new
   * `Workflow` reflecting a pause transition using
   * `WorkflowLifecycleManager.pause` and return it.
   *
   * Milestone 6 scope only: pure lifecycle state transition. No
   * execution, no scheduling, no task or dependency state changes, no
   * calls to any other engine. The supplied `Workflow` is never
   * mutated.
   */
  async pauseWorkflow(request: OrchestratorPauseWorkflowRequest): Promise<Workflow> {
    this.validatePauseWorkflowRequest(request);

    return this.workflowLifecycleManager.pause(request.workflow);
  }

  /**
   * Validate the request, then deterministically compute a new
   * `Workflow` reflecting a resume transition using
   * `WorkflowLifecycleManager.resume` and return it.
   *
   * Milestone 6 scope only: pure lifecycle state transition. No
   * execution, no scheduling, no task or dependency state changes, no
   * calls to any other engine. The supplied `Workflow` is never
   * mutated.
   */
  async resumeWorkflow(request: OrchestratorResumeWorkflowRequest): Promise<Workflow> {
    this.validateResumeWorkflowRequest(request);

    return this.workflowLifecycleManager.resume(request.workflow);
  }

  /**
   * Validate the request, then deterministically compute a new
   * `Workflow` reflecting a cancel transition using
   * `WorkflowLifecycleManager.cancel` and return it.
   *
   * Milestone 6 scope only: pure lifecycle state transition. No
   * execution, no scheduling, no task or dependency state changes, no
   * calls to any other engine. The supplied `Workflow` is never
   * mutated.
   */
  async cancelWorkflow(request: OrchestratorCancelWorkflowRequest): Promise<Workflow> {
    this.validateCancelWorkflowRequest(request);

    return this.workflowLifecycleManager.cancel(request.workflow);
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

  private validateGetWorkflowStatusRequest(request: OrchestratorGetWorkflowStatusRequest): void {
    if (request === null || request === undefined) {
      throw new OrchestratorValidationError('OrchestratorGetWorkflowStatusRequest is required.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'OrchestratorGetWorkflowStatusRequest is required.',
        },
      ]);
    }

    if (request.workflow === null || request.workflow === undefined) {
      throw new OrchestratorValidationError('OrchestratorGetWorkflowStatusRequest.workflow is required.', [
        {
          field: 'request.workflow',
          code: 'missing-workflow',
          message: 'OrchestratorGetWorkflowStatusRequest.workflow is required.',
        },
      ]);
    }
  }

  private validatePauseWorkflowRequest(request: OrchestratorPauseWorkflowRequest): void {
    if (request === null || request === undefined) {
      throw new OrchestratorValidationError('OrchestratorPauseWorkflowRequest is required.', [
        { field: 'request', code: 'missing-request', message: 'OrchestratorPauseWorkflowRequest is required.' },
      ]);
    }

    if (request.workflow === null || request.workflow === undefined) {
      throw new OrchestratorValidationError('OrchestratorPauseWorkflowRequest.workflow is required.', [
        {
          field: 'request.workflow',
          code: 'missing-workflow',
          message: 'OrchestratorPauseWorkflowRequest.workflow is required.',
        },
      ]);
    }
  }

  private validateResumeWorkflowRequest(request: OrchestratorResumeWorkflowRequest): void {
    if (request === null || request === undefined) {
      throw new OrchestratorValidationError('OrchestratorResumeWorkflowRequest is required.', [
        { field: 'request', code: 'missing-request', message: 'OrchestratorResumeWorkflowRequest is required.' },
      ]);
    }

    if (request.workflow === null || request.workflow === undefined) {
      throw new OrchestratorValidationError('OrchestratorResumeWorkflowRequest.workflow is required.', [
        {
          field: 'request.workflow',
          code: 'missing-workflow',
          message: 'OrchestratorResumeWorkflowRequest.workflow is required.',
        },
      ]);
    }
  }

  private validateCancelWorkflowRequest(request: OrchestratorCancelWorkflowRequest): void {
    if (request === null || request === undefined) {
      throw new OrchestratorValidationError('OrchestratorCancelWorkflowRequest is required.', [
        { field: 'request', code: 'missing-request', message: 'OrchestratorCancelWorkflowRequest is required.' },
      ]);
    }

    if (request.workflow === null || request.workflow === undefined) {
      throw new OrchestratorValidationError('OrchestratorCancelWorkflowRequest.workflow is required.', [
        {
          field: 'request.workflow',
          code: 'missing-workflow',
          message: 'OrchestratorCancelWorkflowRequest.workflow is required.',
        },
      ]);
    }
  }
}

export const orchestratorEngine = {
  name: 'orchestrator' as const,
  description:
    'Orchestrator Engine Milestone 6: orchestrate() deterministically translates a Planner Plan into a Workflow via WorkflowBuilder; executeWorkflow() deterministically validates a Workflow via WorkflowValidator; getWorkflowStatus() deterministically computes a WorkflowSummary via WorkflowStatusTracker; pauseWorkflow(), resumeWorkflow(), and cancelWorkflow() deterministically compute lifecycle-transitioned Workflows via WorkflowLifecycleManager.',
};
