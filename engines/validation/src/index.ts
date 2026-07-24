import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { NotImplementedError } from './errors/validation-errors';
import type { ValidationSubject, ValidationVerdict } from './models/types';

export { NotImplementedError, ValidationRequestError } from './errors/validation-errors';

export type {
  ValidationCheckResult,
  ValidationCheckType,
  ValidationEvidence,
  ValidationIssue,
  ValidationIssueCode,
  ValidationLearningHandoff,
  ValidationSubject,
  ValidationTarget,
  ValidationVerdict,
  ValidationVerdictStatus,
} from './models/types';

/**
 * Request/response shapes for the Validation Engine's planned public
 * API.
 *
 * Milestone 1 defines these interfaces solely to describe the
 * intended shape of future request and response payloads. No field
 * on any of these request types is read by any Milestone 1 public
 * API method — every method is an unconditional `NotImplementedError`
 * stub, matching the pattern established by the Planner, Orchestrator,
 * and Execution engines' own Milestone 1 implementations.
 */
export interface ValidationValidateRequest {
  readonly subject: ValidationSubject;
}

export interface ValidationGetValidationStatusRequest {
  readonly validationId: string;
}

export interface ValidationApproveValidationRequest {
  readonly validationId: string;
  readonly reason?: string;
}

export interface ValidationRejectValidationRequest {
  readonly validationId: string;
  readonly reason?: string;
}

export interface ValidationEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

/**
 * Validation Engine — Milestone 1 (Runtime Foundation).
 *
 * Implements only the shared Titan runtime engine contract, via
 * `BaseEngine`: `initialize`, `start`, `stop`, `health`, `metadata`,
 * `version`, `contractVersion`, and `getState`. No lifecycle behavior
 * is overridden; the full runtime contract is inherited unchanged.
 *
 * Every public API method (`validate`, `getValidationStatus`,
 * `approveValidation`, `rejectValidation`) is a typed async stub that
 * unconditionally throws `NotImplementedError`. No request field is
 * read, no validation occurs, and no business logic exists anywhere
 * in this class.
 *
 * This milestone performs no independent verification of Execution
 * Engine output, no evidence collection, no testing/quality/policy
 * checks, no verdict computation, no persistence, no networking, no
 * scheduling, no retries, and no calls to any other Titan engine's
 * runtime (Planner, Orchestrator, Execution, Knowledge, or Context).
 */
export class ValidationEngine extends BaseEngine {
  constructor(options: ValidationEngineOptions = {}) {
    super({
      id: options.id ?? 'validation-engine',
      name: options.name ?? 'Validation Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Independent verification engine for Titan AI. Milestone 1 implements only the shared runtime lifecycle contract; validate, getValidationStatus, approveValidation, and rejectValidation are unimplemented NotImplementedError stubs.',
      capabilities: options.capabilities ?? [
        'validation.validate',
        'validation.get-validation-status',
        'validation.approve-validation',
        'validation.reject-validation',
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

  /**
   * Planned: independently verify a given Execution Engine output
   * (`ValidationSubject`) and produce a `ValidationVerdict`. Milestone
   * 1 stub: always throws `NotImplementedError`. No request field is
   * read.
   */
  async validate(_request: ValidationValidateRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.validate is not implemented yet (Milestone 1: runtime foundation only).',
    );
  }

  /**
   * Planned: retrieve the current verdict/status for a previously
   * requested validation. Milestone 1 stub: always throws
   * `NotImplementedError`. No request field is read.
   */
  async getValidationStatus(_request: ValidationGetValidationStatusRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.getValidationStatus is not implemented yet (Milestone 1: runtime foundation only).',
    );
  }

  /**
   * Planned: record explicit approval of a validation verdict.
   * Milestone 1 stub: always throws `NotImplementedError`. No request
   * field is read.
   */
  async approveValidation(_request: ValidationApproveValidationRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.approveValidation is not implemented yet (Milestone 1: runtime foundation only).',
    );
  }

  /**
   * Planned: record explicit rejection of a validation verdict.
   * Milestone 1 stub: always throws `NotImplementedError`. No request
   * field is read.
   */
  async rejectValidation(_request: ValidationRejectValidationRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.rejectValidation is not implemented yet (Milestone 1: runtime foundation only).',
    );
  }
}

export const validationEngine = {
  name: 'validation' as const,
  description:
    'Validation Engine Milestone 1: runtime foundation only. ValidationEngine extends BaseEngine and inherits the full Titan runtime lifecycle contract unchanged. validate, getValidationStatus, approveValidation, and rejectValidation are all unimplemented NotImplementedError stubs; no validation logic, evidence collection, or cross-engine runtime calls exist anywhere in this package.',
};
