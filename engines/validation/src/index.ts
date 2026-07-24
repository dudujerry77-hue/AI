import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import { ValidationBuilder } from './builders/validation-builder';
import { NotImplementedError, ValidationRequestError } from './errors/validation-errors';
import type {
  ValidationGovernanceRule,
  ValidationPipelineResult,
  ValidationPolicyRule,
  ValidationStructuralResult,
  ValidationSubject,
  ValidationVerdict,
} from './models/types';
import { ValidationValidator } from './validation/validation-validator';

export { ValidationBuilder } from './builders/validation-builder';
export { ValidationValidator } from './validation/validation-validator';
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
 * Milestone 3 changed `ValidationValidateRequest` and `validate()`'s
 * return type:
 *
 * - `ValidationValidateRequest` still carries `subject` (a
 *   `ValidationSubject`) plus the optional `policyRules`/
 *   `governanceRules` fields introduced in Milestone 2, but
 *   `validate()` now delegates entirely to `ValidationBuilder.build`,
 *   which reads only `subject` — `policyRules` and `governanceRules`
 *   remain unread, reserved for a future milestone.
 * - `validate()` returns a `ValidationPipelineResult` (previously
 *   `ValidationVerdict` in Milestones 1–2).
 *
 * Milestone 4 changed `getValidationStatus()`'s request and return
 * shape:
 *
 * - `ValidationGetValidationStatusRequest` carries the full
 *   `ValidationVerdict` to validate (`verdict`), rather than only a
 *   `validationId`, since `getValidationStatus()` delegates entirely
 *   to `ValidationValidator.validate`, which validates the structure
 *   of an already-constructed `ValidationVerdict` rather than looking
 *   one up by id (no validation store or lookup mechanism exists
 *   anywhere in this package).
 * - `getValidationStatus()` returns a `ValidationStructuralResult`
 *   (previously `ValidationVerdict`, which was never implemented).
 *
 * `ValidationApproveValidationRequest` and
 * `ValidationRejectValidationRequest` are unchanged from Milestone 1;
 * `approveValidation` and `rejectValidation` remain the Validation
 * Engine's only unimplemented `NotImplementedError` stubs.
 */
export interface ValidationValidateRequest {
  readonly subject: ValidationSubject;
  readonly policyRules?: readonly ValidationPolicyRule[];
  readonly governanceRules?: readonly ValidationGovernanceRule[];
}

export interface ValidationGetValidationStatusRequest {
  readonly verdict: ValidationVerdict;
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
 * Validation Engine — Milestone 4 (Structural Validation Validator).
 *
 * Implements only the shared Titan runtime engine contract, via
 * `BaseEngine`: `initialize`, `start`, `stop`, `health`, `metadata`,
 * `version`, `contractVersion`, and `getState`. This runtime contract
 * is unchanged from Milestone 1.
 *
 * Milestone 3 implemented `validate()`: it validates the incoming
 * `ValidationValidateRequest` and delegates entirely to
 * `ValidationBuilder.build` to deterministically, structurally
 * translate the supplied `ValidationSubject` (an Execution Engine
 * `ExecutionRecord`/`ExecutionSummary`) into a
 * `ValidationPipelineResult`, which it returns unchanged.
 *
 * Milestone 4 implements `getValidationStatus()`: it validates the
 * incoming `ValidationGetValidationStatusRequest` and delegates
 * entirely to `ValidationValidator.validate` to deterministically,
 * structurally validate the supplied `ValidationVerdict`, returning
 * the resulting `ValidationStructuralResult` unchanged.
 *
 * Neither `validate()` nor `getValidationStatus()` performs any
 * approval, rejection, policy evaluation, governance enforcement,
 * learning integration, execution, orchestration, persistence,
 * networking, AI logic, or heuristic behavior — no scheduling, no
 * retries, no filesystem access, and no call to any other Titan
 * engine's runtime beyond the type-only Execution Engine import used
 * to describe `ValidationSubject`.
 *
 * `approveValidation` and `rejectValidation` remain typed async stubs
 * that unconditionally throw `NotImplementedError`, unchanged from
 * Milestone 1.
 */
export class ValidationEngine extends BaseEngine {
  private readonly validationBuilder: ValidationBuilder;
  private readonly validationValidator: ValidationValidator;

  constructor(options: ValidationEngineOptions = {}) {
    super({
      id: options.id ?? 'validation-engine',
      name: options.name ?? 'Validation Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Independent verification engine for Titan AI. Milestone 4 implements the shared runtime lifecycle contract, a deterministic structural validation builder, and a deterministic structural validation validator; validate() delegates entirely to ValidationBuilder and getValidationStatus() delegates entirely to ValidationValidator. approveValidation and rejectValidation remain unimplemented NotImplementedError stubs.',
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

    this.validationBuilder = new ValidationBuilder();
    this.validationValidator = new ValidationValidator();
  }

  /**
   * Validate the given request shape and delegate entirely to
   * `ValidationBuilder.build` to deterministically, structurally
   * translate the supplied `ValidationSubject` into a
   * `ValidationPipelineResult`.
   *
   * Throws `ValidationRequestError` if `request` is missing or
   * malformed (including if `request.subject` is missing, `null`, or
   * not an inspectable object). `request.policyRules` and
   * `request.governanceRules`, if present, are never read. Performs
   * no approval, rejection, policy evaluation, governance
   * enforcement, learning integration, execution, orchestration,
   * persistence, networking, AI logic, or heuristic behavior, and
   * calls no other Titan engine's runtime.
   */
  async validate(request: ValidationValidateRequest): Promise<ValidationPipelineResult> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new ValidationRequestError('ValidationValidateRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'ValidationValidateRequest must be a non-null object.',
        },
      ]);
    }

    return this.validationBuilder.build(request.subject);
  }

  /**
   * Validate the given request shape and delegate entirely to
   * `ValidationValidator.validate` to deterministically, structurally
   * validate the supplied `ValidationVerdict`.
   *
   * Throws `ValidationRequestError` if `request` is missing or
   * malformed (including if `request.verdict` is missing, `null`, or
   * not an inspectable object). Performs no approval, rejection,
   * policy evaluation, governance enforcement, or learning
   * integration, and calls no other Titan engine's runtime.
   */
  async getValidationStatus(request: ValidationGetValidationStatusRequest): Promise<ValidationStructuralResult> {
    if (request === null || request === undefined || typeof request !== 'object' || Array.isArray(request)) {
      throw new ValidationRequestError('ValidationGetValidationStatusRequest must be a non-null object.', [
        {
          field: 'request',
          code: 'missing-request',
          message: 'ValidationGetValidationStatusRequest must be a non-null object.',
        },
      ]);
    }

    return this.validationValidator.validate(request.verdict);
  }

  /**
   * Planned: record explicit approval of a validation verdict.
   * Milestone 4 stub: always throws `NotImplementedError`, unchanged
   * from Milestone 1. No request field is read.
   */
  async approveValidation(_request: ValidationApproveValidationRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.approveValidation is not implemented yet (Milestone 4: structural validation builder and validator only).',
    );
  }

  /**
   * Planned: record explicit rejection of a validation verdict.
   * Milestone 4 stub: always throws `NotImplementedError`, unchanged
   * from Milestone 1. No request field is read.
   */
  async rejectValidation(_request: ValidationRejectValidationRequest): Promise<ValidationVerdict> {
    throw new NotImplementedError(
      'ValidationEngine.rejectValidation is not implemented yet (Milestone 4: structural validation builder and validator only).',
    );
  }
}

export const validationEngine = {
  name: 'validation' as const,
  description:
    'Validation Engine Milestone 4: structural validation builder and structural validation validator only. ValidationEngine extends BaseEngine and inherits the full Titan runtime lifecycle contract, unchanged from Milestone 1. validate() validates its request and delegates entirely to ValidationBuilder, which deterministically, structurally translates an Execution Engine ExecutionSummary/ExecutionRecord into a ValidationPipelineResult. getValidationStatus() validates its request and delegates entirely to ValidationValidator, which deterministically, structurally validates a ValidationVerdict. approveValidation and rejectValidation remain unimplemented NotImplementedError stubs; no approval logic, rejection logic, policy enforcement, governance enforcement, learning integration, or cross-engine runtime calls exist anywhere in this package.',
};
