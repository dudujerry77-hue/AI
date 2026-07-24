import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { ExecutionBuilder } from './builders/execution-builder';
import { ExecutionValidationError, NotImplementedError } from './errors/execution-errors';
import type {
  ExecutionBuildRequest,
  ExecutionRecord,
  ExecutionResult,
  ExecutionSummary,
  ExecutionValidationHandoff,
  ExecutionValidationResult,
} from './models/types';
import { ExecutionStatusTracker } from './status/execution-status-tracker';
import { ExecutionValidator } from './validation/execution-validator';

export { ExecutionBuilder } from './builders/execution-builder';
export { ExecutionStatusTracker } from './status/execution-status-tracker';
export { ExecutionValidator } from './validation/execution-validator';
export { NotImplementedError, ExecutionValidationError } from './errors/execution-errors';

export type {
  ExecutionActionContract,
  ExecutionActionType,
  ExecutionBuildRequest,
  ExecutionContext,
  ExecutionContextUpdate,
  ExecutionObservabilityEvent,
  ExecutionObservabilityEventType,
  ExecutionPolicy,
  ExecutionPolicyConstraint,
  ExecutionPolicyConstraintType,
  ExecutionRecord,
  ExecutionReport,
  ExecutionReportSeverity,
  ExecutionResult,
  ExecutionStatus,
  ExecutionSummary,
  ExecutionTarget,
  ExecutionValidationHandoff,
  ExecutionValidationIssueCode,
  ExecutionValidationResult,
  ExecutionValidationResultIssue,
} from './models/types';

/**
 * Request/response shapes for the Execution Engine's planned public
 * API.
 *
 * Milestone 3 changed `ExecutionExecuteRequest` and `execute()`'s
 * return type:
 *
 * - `ExecutionExecuteRequest` is identical in shape to
 *   `ExecutionBuildRequest` (an Orchestrator `WorkflowDispatchResult`
 *   plus the target `itemId`), since `execute()` delegates entirely
 *   to `ExecutionBuilder.build` for structural translation.
 * - `execute()` returns an `ExecutionRecord` (previously
 *   `ExecutionResult` in Milestones 1–2).
 *
 * Milestone 4 changed `getExecutionStatus()`'s request and return
 * shape:
 *
 * - `ExecutionGetExecutionStatusRequest` carries the full
 *   `ExecutionRecord` to validate (`record`), rather than only an
 *   `executionId`, since `getExecutionStatus()` delegates entirely to
 *   `ExecutionValidator.validate`, which validates the structure of an
 *   already-constructed `ExecutionRecord` rather than looking one up
 *   by id (no execution store or lookup mechanism exists anywhere in
 *   this package).
 * - `getExecutionStatus()` returns an `ExecutionValidationResult`
 *   (previously `ExecutionSummary`, which was never implemented).
 *
 * Milestone 5 changes `reportResult()`'s request and return shape, for
 * API evolution consistency only:
 *
 * - `ExecutionReportResultRequest` now carries the full
 *   `ExecutionRecord` to summarize (`record`), rather than only an
 *   `executionId` plus an optional `handoff`, since `reportResult()`
 *   now delegates entirely to `ExecutionStatusTracker.summarize`,
 *   which computes only structural status information from an
 *   already-constructed `ExecutionRecord`. Milestone 5 does **not**
 *   perform any real result reporting — see the class-level
 *   documentation on `ExecutionEngine.reportResult` below.
 * - `reportResult()` returns an `ExecutionSummary` (previously
 *   `ExecutionResult`, which was never implemented).
 *
 * `ExecutionCancelExecutionRequest` is unchanged from Milestone 1;
 * `cancelExecution` remains the Execution Engine's only unimplemented
 * `NotImplementedError` stub.
 *
 * These interfaces describe the intended shape of request and
 * response payloads. `execute()`, `getExecutionStatus()`, and
 * `reportResult()` are the only methods with real behavior;
 * `cancelExecution` remains an unconditional `NotImplementedError`
 * stub, exactly as in Milestone 1.
 */
export type ExecutionExecuteRequest = ExecutionBuildRequest;

export interface ExecutionGetExecutionStatusRequest {
  readonly record: ExecutionRecord;
}

export interface ExecutionCancelExecutionRequest {
  readonly executionId: string;
  readonly reason?: string;
}

/**
 * `reportResult`'s request shape as of Milestone 5. Carries the full
 * `ExecutionRecord` to be structurally summarized by
 * `ExecutionStatusTracker.summarize`. `handoff` is retained as an
 * optional field for future use (per the Milestone 2 domain model) but
 * is never read, transmitted, or acted upon by the current
 * implementation.
 */
export interface ExecutionReportResultRequest {
  readonly record: ExecutionRecord;
  readonly handoff?: ExecutionValidationHandoff;
}

export interface ExecutionEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

/**
 * Execution Engine — Milestone 5 (Structural Execution Status
 * Reporting).
 *
 * Implements only the shared Titan runtime engine contract, via
 * `BaseEngine`: `initialize`, `start`, `stop`, `health`, `metadata`,
 * `version`, `contractVersion`, and `getState`. This runtime contract
 * is unchanged from Milestone 1.
 *
 * Milestone 3 implemented `execute()`: it validates the incoming
 * `ExecutionExecuteRequest` and delegates entirely to
 * `ExecutionBuilder.build` to deterministically, structurally
 * translate an Orchestrator `WorkflowDispatchResult` (plus a target
 * `itemId`) into an `ExecutionRecord`, which it returns unchanged.
 *
 * Milestone 4 implemented `getExecutionStatus()`: it validates the
 * incoming `ExecutionGetExecutionStatusRequest` and delegates entirely
 * to `ExecutionValidator.validate` to deterministically, structurally
 * validate the supplied `ExecutionRecord`, returning the resulting
 * `ExecutionValidationResult` unchanged.
 *
 * Milestone 5 implements `reportResult()`, for API evolution
 * consistency only. Despite its name, `reportResult()` does **not**
 * perform any real result reporting in this milestone — no
 * `ExecutionReport` is ever created, populated, or transmitted. It
 * validates the incoming `ExecutionReportResultRequest` and delegates
 * entirely to `ExecutionStatusTracker.summarize` to deterministically,
 * structurally summarize the supplied `ExecutionRecord`, returning the
 * resulting `ExecutionSummary` unchanged.
 *
 * None of `execute()`, `getExecutionStatus()`, or `reportResult()`
 * performs any execution of any kind — no scheduling, no retries, no
 * persistence, no networking, no AI behavior, and no call to any
 * other Titan engine's runtime.
 *
 * `cancelExecution` remains a typed async stub that unconditionally
 * throws `NotImplementedError`, unchanged from Milestone 1.
 */
export class ExecutionEngine extends BaseEngine {
  private readonly executionBuilder: ExecutionBuilder;
  private readonly executionValidator: ExecutionValidator;
  private readonly executionStatusTracker: ExecutionStatusTracker;

  constructor(options: ExecutionEngineOptions = {}) {
    super({
      id: options.id ?? 'execution-engine',
      name: options.name ?? 'Execution Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Action-taking engine for Titan AI. Milestone 5 implements the shared runtime lifecycle contract, a deterministic structural execution builder, a deterministic structural execution validator, and a deterministic structural execution status tracker; execute() delegates entirely to ExecutionBuilder, getExecutionStatus() delegates entirely to ExecutionValidator, and reportResult() delegates entirely to ExecutionStatusTracker (for API evolution consistency only — no real reporting occurs). cancelExecution remains an unimplemented NotImplementedError stub.',
      capabilities: options.capabilities ?? [
        'execution.execute',
        'execution.get-execution-status',
        'execution.cancel-execution',
        'execution.report-result',
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

    this.executionBuilder = new ExecutionBuilder();
    this.executionValidator = new ExecutionValidator();
    this.executionStatusTracker = new ExecutionStatusTracker();
  }

  /**
   * Validate the given request and delegate entirely to
   * `ExecutionBuilder.build` to deterministically, structurally
   * translate the supplied Orchestrator `WorkflowDispatchResult` and
   * target `itemId` into an `ExecutionRecord`.
   *
   * Throws `ExecutionValidationError` if `request` is missing or
   * malformed. Performs no execution, scheduling, retries,
   * persistence, networking, or AI behavior, and calls no other
   * Titan engine's runtime.
   */
  async execute(request: ExecutionExecuteRequest): Promise<ExecutionRecord> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new ExecutionValidationError('ExecutionExecuteRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'ExecutionExecuteRequest must be a non-null object.',
        },
      ]);
    }

    return this.executionBuilder.build(request);
  }

  /**
   * Validate the given request and delegate entirely to
   * `ExecutionValidator.validate` to deterministically, structurally
   * validate the supplied `ExecutionRecord`.
   *
   * Throws `ExecutionValidationError` if `request` is missing or
   * malformed (including if `request.record` is missing, `null`, or
   * not an inspectable object). Performs no execution, scheduling,
   * retries, persistence, networking, or AI behavior, and calls no
   * other Titan engine's runtime.
   */
  async getExecutionStatus(request: ExecutionGetExecutionStatusRequest): Promise<ExecutionValidationResult> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new ExecutionValidationError('ExecutionGetExecutionStatusRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'ExecutionGetExecutionStatusRequest must be a non-null object.',
        },
      ]);
    }

    return this.executionValidator.validate(request.record);
  }

  /**
   * Planned: cancel a previously requested execution. Milestone 5
   * stub: always throws `NotImplementedError`, unchanged from
   * Milestone 1.
   */
  async cancelExecution(_request: ExecutionCancelExecutionRequest): Promise<ExecutionResult> {
    throw new NotImplementedError(
      'ExecutionEngine.cancelExecution is not implemented yet (Milestone 5: structural execution builder, validator, and status tracker only).',
    );
  }

  /**
   * Validate the given request and delegate entirely to
   * `ExecutionStatusTracker.summarize` to deterministically,
   * structurally summarize the supplied `ExecutionRecord`.
   *
   * Despite its name, this method performs no real result reporting
   * in Milestone 5: it implements only structural status computation,
   * added for API evolution consistency with `execute()` and
   * `getExecutionStatus()`. No `ExecutionReport` is ever created,
   * populated, or transmitted, and `request.handoff` is never read.
   *
   * Throws `ExecutionValidationError` if `request` is missing or
   * malformed (including if `request.record` is missing, `null`, or
   * not an inspectable object). Performs no execution, scheduling,
   * retries, persistence, networking, or AI behavior, and calls no
   * other Titan engine's runtime.
   */
  async reportResult(request: ExecutionReportResultRequest): Promise<ExecutionSummary> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new ExecutionValidationError('ExecutionReportResultRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'ExecutionReportResultRequest must be a non-null object.',
        },
      ]);
    }

    return this.executionStatusTracker.summarize(request.record);
  }
}

export const executionEngine = {
  name: 'execution' as const,
  description:
    'Execution Engine Milestone 5: structural execution builder, structural execution validator, and structural execution status tracker only. ExecutionEngine extends BaseEngine and inherits the full Titan runtime lifecycle contract, unchanged from Milestone 1. execute() validates its request and delegates entirely to ExecutionBuilder, which deterministically, structurally translates an Orchestrator WorkflowDispatchResult into an ExecutionRecord. getExecutionStatus() validates its request and delegates entirely to ExecutionValidator, which deterministically, structurally validates an ExecutionRecord. reportResult() validates its request and delegates entirely to ExecutionStatusTracker, which deterministically, structurally summarizes an ExecutionRecord (no real result reporting occurs). cancelExecution remains an unimplemented NotImplementedError stub.',
};
