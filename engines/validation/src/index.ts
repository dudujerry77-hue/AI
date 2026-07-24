import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { NotImplementedError } from './errors/validation-errors';
import type {
  ValidationGovernanceRule,
  ValidationPolicyRule,
  ValidationSubject,
  ValidationVerdict,
} from './models/types';


export { NotImplementedError, ValidationRequestError } from './errors/validation-errors';

export type {
  ValidationCheckResult,
  ValidationCheckType,
  ValidationEscalation,
  ValidationEscalationReason,
  ValidationEvidence,
  ValidationGovernanceRule,
  ValidationIssue,
  ValidationIssueCode,
  ValidationLearningHandoff,
  ValidationPipelineRequest,
  ValidationPipelineResult,
  ValidationPolicyRule,
  ValidationStructuralResult,
  ValidationSubject,
  ValidationTarget,
  ValidationVerdict,
  ValidationVerdictStatus,
} from './models/types';

/**
 * Request/response shapes for the Validation Engine's planned public
 * API.
 *
 * Milestone 1 defined these interfaces solely to describe the
 * intended shape of future request and response payloads. No field
 * on any of these request types is read by any public API method in
 * Milestone 1 or Milestone 2 — every method remains an unconditional
 * `NotImplementedError` stub, matching the pattern established by the
 * Planner, Orchestrator, and Execution engines' own early milestones.
 *
 * Milestone 2 changes `ValidationValidateRequest` to also carry the
 * optional `policyRules` and `governanceRules` fields introduced by
 * the expanded domain model (mirroring the new
 * `ValidationPipelineRequest` shape), for future-shape consistency
 * only. This is a type-only, additive change: `validate()` still
 * unconditionally throws `NotImplementedError` and reads none of its
 * request fields.
 */
export interface ValidationValidateRequest {
  readonly subject: ValidationSubject;
  readonly policyRules?: readonly ValidationPolicyRule[];
  readonly governanceRules?: readonly ValidationGovernanceRule[];
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
 * Validation Engine — Milestone 2 (Domain Model Completion).
 *
 * Implements only the shared Titan runtime engine contract, via
 * `BaseEngine`: `initialize`, `start`, `stop`, `health`, `metadata`,
 * `version`, `contractVersion`, and `getState`. No lifecycle behavior
 * is overridden; the full runtime contract is inherited unchanged
 * from Milestone 1.
 *
 * Every public API method (`validate`, `getValidationStatus`,
 * `approveValidation`, `rejectValidation`) remains a typed async stub
 * that unconditionally throws `NotImplementedError`, unchanged in
 * behavior from Milestone 1. No request field is read, no validation
 * occurs, and no business logic exists anywhere in this class.
 *
 * Milestone 2 expands only the domain model
 * (`src/models/types.ts`) with the complete planned set of pure,
 * immutable data types covering the validation verdict pipeline,
 * evidence reporting, testing/quality/policy/security/governance
 * checks, escalation triggers, and the planned handoff to the
 * Learning Engine. No algorithm, approval logic, rejection logic,
 * learning integration, persistence, networking, AI logic, or
 * heuristic behavior is introduced anywhere in this package.
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
        'Independent verification engine for Titan AI. Milestone 2 implements the shared runtime lifecycle contract (unchanged from Milestone 1) and the complete planned domain model. validate, getValidationStatus, approveValidation, and rejectValidation remain unimplemented NotImplementedError stubs.',
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
   * 2 stub: always throws `NotImplementedError`, unchanged from
   * Milestone 1. No request field is read.
   */
  async validate(_request: ValidationValidateRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.validate is not implemented yet (Milestone 2: domain model only, no validation logic).',
    );
  }

  /**
   * Planned: retrieve the current verdict/status for a previously
   * requested validation. Milestone 2 stub: always throws
   * `NotImplementedError`, unchanged from Milestone 1. No request
   * field is read.
   */
  async getValidationStatus(_request: ValidationGetValidationStatusRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.getValidationStatus is not implemented yet (Milestone 2: domain model only, no validation logic).',
    );
  }

  /**
   * Planned: record explicit approval of a validation verdict.
   * Milestone 2 stub: always throws `NotImplementedError`, unchanged
   * from Milestone 1. No request field is read.
   */
  async approveValidation(_request: ValidationApproveValidationRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.approveValidation is not implemented yet (Milestone 2: domain model only, no validation logic).',
    );
  }

  /**
   * Planned: record explicit rejection of a validation verdict.
   * Milestone 2 stub: always throws `NotImplementedError`, unchanged
   * from Milestone 1. No request field is read.
   */
  async rejectValidation(_request: ValidationRejectValidationRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.rejectValidation is not implemented yet (Milestone 2: domain model only, no validation logic).',
    );
  }
}

export const validationEngine = {
  name: 'validation' as const,
  description:
    'Validation Engine Milestone 2: complete planned domain model only; runtime behavior unchanged from Milestone 1. ValidationEngine extends BaseEngine and inherits the full Titan runtime lifecycle contract unchanged. validate, getValidationStatus, approveValidation, and rejectValidation remain unimplemented NotImplementedError stubs; no validation logic, evidence collection, escalation logic, or cross-engine runtime calls exist anywhere in this package.',
};
