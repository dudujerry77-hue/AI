/**
 * Validation Engine domain model — Milestone 2.
 *
 * These types define the Validation Engine's complete planned public
 * domain model and API request/response shapes. Milestone 2 expands
 * the Milestone 1 model with pure, immutable data definitions covering
 * every domain concept named by the Phase 011 specification: the
 * validation verdict pipeline, evidence reporting, testing/quality/
 * policy/security/governance checks, structured pass/fail/partial
 * outcomes consumable by the Orchestrator Engine, escalation triggers,
 * and the handoff of validated outcomes to the Learning Engine.
 *
 * This module introduces type definitions only. It does not introduce
 * any validation algorithm, approval logic, rejection logic, learning
 * integration, persistence, networking, AI logic, heuristics, or any
 * other runtime behavior. No value of any type defined here is
 * created, populated, or transformed by this module or by any other
 * Milestone 2 file — every Validation Engine public API method
 * remains an unconditional `NotImplementedError` stub (see
 * `src/index.ts`), unchanged from Milestone 1.
 *
 * The Execution Engine's `ExecutionRecord` and `ExecutionSummary`
 * types are imported as read-only type references only, purely to
 * describe the shape of the (future) input the Validation Engine is
 * expected to independently verify. Importing these types does not
 * import, instantiate, or call the Execution Engine's runtime.
 */

import type {
  ExecutionRecord,
  ExecutionSummary,
} from '../../../execution/src/models/types';

/**
 * Structured outcome classification for a single validation verdict.
 * Pure data classification only; no logic anywhere in this package
 * determines, computes, or infers this value in Milestone 2.
 */
export type ValidationVerdictStatus = 'pass' | 'fail' | 'partial';

/**
 * Kind of check contributing to a validation verdict. Pure
 * classification only.
 */
export type ValidationCheckType =
  'testing' | 'quality' | 'policy' | 'security' | 'governance';

/**
 * Immutable identifier of the Execution Engine output under review by
 * the Validation Engine. Distinct from `ExecutionRecord`/
 * `ExecutionSummary` themselves: this type identifies *which*
 * execution output is being validated, without embedding execution
 * behavior in the Validation Engine.
 */
export interface ValidationTarget {
  readonly executionId: string;
  readonly workflowId: string;
  readonly itemId: string;
  readonly itemType: 'step' | 'task';
}

/**
 * A single structured, reproducible check result contributing
 * evidence to a validation verdict. Pure data only: no field here is
 * computed, checked, or enforced anywhere in this package in
 * Milestone 2.
 */
export interface ValidationCheckResult {
  readonly checkId: string;
  readonly checkType: ValidationCheckType;
  readonly status: ValidationVerdictStatus;
  readonly message: string;
  readonly evidence?: Readonly<Record<string, unknown>>;
}

/**
 * Immutable, structured verdict describing the outcome of validating
 * a single Execution Engine output. Consumable by the Orchestrator
 * Engine for control decisions, per the Phase 011 acceptance
 * criteria. Pure data only; nothing in this package populates this
 * type in Milestone 2.
 */
export interface ValidationVerdict {
  readonly validationId: string;
  readonly target: ValidationTarget;
  readonly status: ValidationVerdictStatus;
  readonly checks: readonly ValidationCheckResult[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Immutable evidence record supporting a validation verdict's
 * reproducibility and traceability, per the Phase 011 deliverables.
 * Pure data contract only: no field here is transmitted, persisted,
 * or acted upon by this package in Milestone 2.
 */
export interface ValidationEvidence {
  readonly validationId: string;
  readonly source: string;
  readonly description: string;
  readonly capturedAt: string;
  readonly attachments?: readonly string[];
}

/**
 * Immutable record describing the handoff of a validation outcome to
 * the Learning Engine for outcome analysis, per the Phase 011 handoff
 * notes. Pure data contract only: no field here is transmitted,
 * validated, or acted upon by this package in Milestone 2.
 */
export interface ValidationLearningHandoff {
  readonly validationId: string;
  readonly verdict: ValidationVerdict;
  readonly requestedAt: string;
}

/**
 * Input shape describing the (future) Execution Engine output to be
 * independently verified by the Validation Engine. `record` and
 * `summary` are consumed as plain, read-only input values (via type
 * only) — the Validation Engine never imports, instantiates, or calls
 * the Execution Engine's runtime.
 */
export interface ValidationSubject {
  readonly record: ExecutionRecord;
  readonly summary?: ExecutionSummary;
}

/**
 * Deterministic, structural validation issue code reserved for future
 * milestones. Not populated or read anywhere in Milestone 2.
 */
export type ValidationIssueCode =
  | 'MISSING_VALIDATION_ID'
  | 'MISSING_TARGET'
  | 'MISSING_EXECUTION_ID'
  | 'INVALID_STATUS'
  | 'MISSING_CREATED_AT'
  | 'MISSING_UPDATED_AT';

/**
 * A single structural validation issue describing exactly one defect
 * that a future milestone's validator may find in a `ValidationVerdict`
 * or `ValidationSubject`. Pure data only; reserved for future use and
 * not populated anywhere in Milestone 2.
 */
export interface ValidationIssue {
  readonly field: string;
  readonly code: ValidationIssueCode;
  readonly message: string;
}

/**
 * Deterministic, structural validation report reserved for a future
 * milestone's structural validator (parallel to the Execution
 * Engine's `ExecutionValidationResult`). `valid` is intended to be
 * `true` if and only if `issues` is empty. Pure data only; not
 * produced anywhere in Milestone 2.
 */
export interface ValidationStructuralResult {
  readonly validationId: string;
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly validatedAt: string;
}

/**
 * Severity classification for a single reason contributing to an
 * escalation decision, per the Phase 011 risk of "validation bypass
 * paths reducing trust in outcomes." Pure classification only.
 */
export type ValidationEscalationReason =
  | 'repeated-failure'
  | 'policy-violation'
  | 'security-concern'
  | 'governance-concern'
  | 'insufficient-evidence';

/**
 * Immutable, structured escalation decision associated with a
 * validation verdict, intended for consumption by the Orchestrator
 * Engine, per the Phase 011 acceptance criteria ("verdicts are
 * reproducible and include actionable evidence"). Pure data only; not
 * produced anywhere in Milestone 2.
 */
export interface ValidationEscalation {
  readonly validationId: string;
  readonly target: ValidationTarget;
  readonly reasons: readonly ValidationEscalationReason[];
  readonly triggeredAt: string;
}

/**
 * Immutable, declarative policy constraint evaluated as part of a
 * `'policy'`-typed check. This is a data definition only: no field
 * here is enforced, checked, or interpreted anywhere in this package.
 * Enforcement is explicitly out of scope until a future milestone.
 */
export interface ValidationPolicyRule {
  readonly ruleId: string;
  readonly description: string;
  readonly checkType: ValidationCheckType;
  readonly severity: 'info' | 'warning' | 'blocking';
}

/**
 * Immutable, declarative governance rule evaluated as part of a
 * `'governance'`-typed check, per the Phase 011 acceptance criteria
 * ("governance and security checks are integrated in validation
 * decisions"). Pure data definition only; no field here is enforced,
 * checked, or interpreted anywhere in this package in Milestone 2.
 */
export interface ValidationGovernanceRule {
  readonly ruleId: string;
  readonly description: string;
  readonly referenceDocument?: string;
  readonly severity: 'info' | 'warning' | 'blocking';
}

/**
 * Immutable request to initiate the (future) validation verdict
 * pipeline for a given `ValidationSubject`, applying an explicit set
 * of policy and governance rules. Pure data contract only: no field
 * here is read, interpreted, or acted upon by any Milestone 2 public
 * API method.
 */
export interface ValidationPipelineRequest {
  readonly subject: ValidationSubject;
  readonly policyRules?: readonly ValidationPolicyRule[];
  readonly governanceRules?: readonly ValidationGovernanceRule[];
  readonly requestedAt: string;
}

/**
 * Immutable, structured outcome of the (future) validation verdict
 * pipeline: a `ValidationVerdict` plus any `ValidationEscalation`
 * decisions and supporting `ValidationEvidence` produced alongside
 * it. Consumable by the Orchestrator Engine for control decisions and
 * by the Learning Engine (via `ValidationLearningHandoff`) for
 * outcome analysis. Pure data only; not produced anywhere in
 * Milestone 2.
 */
export interface ValidationPipelineResult {
  readonly verdict: ValidationVerdict;
  readonly evidence: readonly ValidationEvidence[];
  readonly escalations: readonly ValidationEscalation[];
}
