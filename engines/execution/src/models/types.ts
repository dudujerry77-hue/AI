/**
 * Execution Engine domain model — Milestone 5.
 *
 * These types define the Execution Engine's complete planned public
 * domain model and API request/response shapes. Milestone 2 expanded
 * the Milestone 1 model with pure, immutable data definitions covering
 * every domain concept named by the Phase 010 specification: action
 * execution contracts, result reporting, policy-aware execution
 * constraints, observability hooks, context updates, and validation
 * handoff.
 *
 * Milestone 3 added `ExecutionBuildRequest`, the input shape consumed
 * by `ExecutionBuilder.build` to deterministically, structurally
 * translate an Orchestrator `WorkflowDispatchResult` into an
 * `ExecutionRecord`. The Orchestrator `WorkflowDispatchResult` type is
 * imported as a read-only type reference only, purely to describe the
 * shape `ExecutionBuilder` accepts as input — this module still does
 * not call, instantiate, or execute anything from the Orchestrator
 * Engine.
 *
 * Milestone 4 added `ExecutionValidationIssueCode` and
 * `ExecutionValidationResult`, the return shape produced by
 * `ExecutionValidator.validate` (and, in turn, by
 * `ExecutionEngine.getExecutionStatus`): a deterministic, structural
 * report of whether a given `ExecutionRecord` is well-formed. This is
 * distinct from `ExecutionValidationHandoff` (Milestone 2), which
 * describes a future handoff to the separate Validation Engine, and
 * distinct from `ExecutionValidationError` (in
 * `src/errors/execution-errors.ts`), which is thrown — not
 * returned — for malformed *input* to a method, rather than being the
 * structural analysis of an already-constructed `ExecutionRecord`.
 *
 * Milestone 5 extends `ExecutionSummary` (defined since Milestone 1
 * but never populated until now) with additive, structural-only
 * fields (`createdAt`, `updatedAt`, `durationMs`, `isTerminal`,
 * `isCancelled`), populated exclusively by the new
 * `ExecutionStatusTracker.summarize` (and, in turn, by
 * `ExecutionEngine.reportResult`, which — despite its name — performs
 * no reporting in this milestone; see `src/status/execution-status-
 * tracker.ts` for the full explanation).
 *
 * This module introduces type definitions only. It does not introduce
 * any execution behavior, retries, scheduling, persistence,
 * networking, or AI logic. No value of any type defined here is
 * created, populated, or transformed by this module itself; that
 * population happens exclusively inside `ExecutionBuilder` (Milestone
 * 3), `ExecutionValidator` (Milestone 4), and `ExecutionStatusTracker`
 * (Milestone 5), or remains entirely unpopulated (all other types).
 * `cancelExecution` remains the only unimplemented stub that throws
 * `NotImplementedError`, unchanged from Milestone 1.
 */

import type { WorkflowDispatchResult } from '../../../orchestrator/src/models/types';

/**
 * Runtime status for a single execution unit dispatched by the
 * Orchestrator Engine.
 */
export type ExecutionStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Identifies the workflow item (Orchestrator step or task) that a
 * requested execution corresponds to.
 */
export interface ExecutionTarget {
  readonly workflowId: string;
  readonly itemId: string;
  readonly itemType: 'step' | 'task';
}

/**
 * Context envelope provided to Execution API operations.
 */
export interface ExecutionContext {
  readonly actorId: string;
  readonly sessionId?: string;
  readonly phaseId?: string;
  readonly inputs?: Readonly<Record<string, unknown>>;
}

/**
 * Immutable record describing a single execution unit and its current
 * status.
 */
export interface ExecutionRecord {
  readonly executionId: string;
  readonly target: ExecutionTarget;
  readonly status: ExecutionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Outcome payload for a completed or terminated execution.
 */
export interface ExecutionResult {
  readonly executionId: string;
  readonly status: ExecutionStatus;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly error?: string;
}

/**
 * Deterministic, at-a-glance summary of an execution's current state,
 * produced by `ExecutionStatusTracker.summarize` (Milestone 5) and, in
 * turn, by `ExecutionEngine.reportResult` (Milestone 5).
 *
 * Every field is derived purely and structurally from an
 * already-constructed `ExecutionRecord` — nothing here is looked up,
 * computed from an external source, inferred, or guessed. `createdAt`,
 * `updatedAt`, `durationMs`, `isTerminal`, and `isCancelled` are
 * additive fields introduced in Milestone 5; `executionId`, `status`,
 * and `target` are unchanged from Milestone 1.
 */
export interface ExecutionSummary {
  readonly executionId: string;
  readonly status: ExecutionStatus;
  readonly target: ExecutionTarget;
  readonly createdAt: string;
  readonly updatedAt: string;
  /**
   * Duration in milliseconds between `createdAt` and `updatedAt`,
   * derived only when both timestamps are well-formed ISO-8601
   * strings. `undefined` when either timestamp is missing or
   * malformed — never guessed or defaulted.
   */
  readonly durationMs?: number;
  /**
   * `true` when `status` is one of the terminal statuses
   * (`'completed'`, `'failed'`, `'cancelled'`) already recorded on the
   * input `ExecutionRecord`. Purely a structural classification of
   * the existing `status` field — never independently determined.
   */
  readonly isTerminal: boolean;
  /**
   * `true` when `status` is exactly `'cancelled'`, as already
   * recorded on the input `ExecutionRecord`. This package never
   * cancels an execution itself; `cancelExecution` remains an
   * unimplemented `NotImplementedError` stub.
   */
  readonly isCancelled: boolean;
}

/**
 * Kind of action an execution unit represents. Pure data
 * classification only — introducing this type does not imply any
 * action of this kind is actually performed by this package.
 */
export type ExecutionActionType =
  'command' | 'script' | 'api-call' | 'transformation' | 'notification';

/**
 * Immutable description of a single action to be carried out by a
 * (future) execution run. This is a data contract only: no field here
 * is read, interpreted, or acted upon by this package.
 */
export interface ExecutionActionContract {
  readonly actionId: string;
  readonly actionType: ExecutionActionType;
  readonly target: ExecutionTarget;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly timeoutMs?: number;
}

/**
 * Deterministic, structural severity classification for a single
 * reported execution outcome, used by `ExecutionReport`.
 */
export type ExecutionReportSeverity = 'info' | 'warning' | 'error';

/**
 * Immutable result-reporting record capturing the reported outcome of
 * a single execution unit, distinct from `ExecutionResult` in that it
 * is intended for downstream consumption (e.g. by the Validation
 * Engine) rather than as the direct return value of `execute()`.
 *
 * Pure data only: no field here is computed, derived, or validated by
 * this package.
 */
export interface ExecutionReport {
  readonly executionId: string;
  readonly target: ExecutionTarget;
  readonly severity: ExecutionReportSeverity;
  readonly status: ExecutionStatus;
  readonly message: string;
  readonly reportedAt: string;
  readonly artifacts?: readonly string[];
}

/**
 * Kind of policy constraint that may (in a future milestone) bound
 * what an execution run is permitted to do. Pure classification only.
 */
export type ExecutionPolicyConstraintType =
  | 'scope-restriction'
  | 'resource-limit'
  | 'time-limit'
  | 'permission-requirement';

/**
 * Immutable, declarative policy-aware execution constraint. This is a
 * data definition only: no field here is enforced, checked, or
 * interpreted anywhere in this package. Enforcement is explicitly
 * out of scope until a future milestone.
 */
export interface ExecutionPolicyConstraint {
  readonly constraintId: string;
  readonly type: ExecutionPolicyConstraintType;
  readonly description: string;
  readonly value?: string | number | boolean;
}

/**
 * Immutable set of policy constraints associated with a single
 * execution target. A pure aggregate data type; no enforcement logic
 * exists anywhere in this package.
 */
export interface ExecutionPolicy {
  readonly policyId: string;
  readonly target: ExecutionTarget;
  readonly constraints: readonly ExecutionPolicyConstraint[];
}

/**
 * Kind of observability signal an `ExecutionObservabilityEvent` may
 * represent. Pure classification only.
 */
export type ExecutionObservabilityEventType =
  'lifecycle' | 'progress' | 'metric' | 'log';

/**
 * Immutable observability hook record: a single structured
 * observability signal associated with an execution unit. Pure data
 * only — this package does not emit, collect, or transmit any such
 * record; the type exists solely to define the planned shape.
 */
export interface ExecutionObservabilityEvent {
  readonly executionId: string;
  readonly eventType: ExecutionObservabilityEventType;
  readonly name: string;
  readonly timestamp: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Immutable record describing a single proposed update to shared
 * session/workflow context as a consequence of an execution outcome.
 * Pure data contract only: no field here is applied, persisted, or
 * transmitted to the Context Engine or any other engine by this
 * package.
 */
export interface ExecutionContextUpdate {
  readonly executionId: string;
  readonly key: string;
  readonly value: unknown;
  readonly reason?: string;
}

/**
 * Immutable record describing the handoff of a completed execution's
 * outcome to the Validation Engine for independent verification. Pure
 * data contract only: no field here is transmitted, validated, or
 * acted upon by this package. Execution never self-validates or
 * self-approves completion — that determination belongs exclusively
 * to the Validation Engine, consistent with the Phase 010
 * specification's acceptance criteria.
 */
export interface ExecutionValidationHandoff {
  readonly executionId: string;
  readonly target: ExecutionTarget;
  readonly result: ExecutionResult;
  readonly requestedAt: string;
}

/**
 * Input shape consumed by `ExecutionBuilder.build` (Milestone 3):
 * identifies which single dispatch-evaluated workflow item, from an
 * already-computed Orchestrator `WorkflowDispatchResult`, should be
 * structurally translated into an `ExecutionRecord`.
 *
 * `dispatchResult` is treated as read-only input and is never
 * mutated. `itemId` must match the `itemId` of exactly one
 * `WorkflowDispatchDecision` present in `dispatchResult.decisions`.
 */
export interface ExecutionBuildRequest {
  readonly dispatchResult: WorkflowDispatchResult;
  readonly itemId: string;
}

/**
 * Deterministic, structural validation issue code produced by
 * `ExecutionValidator.validate` (Milestone 4). Each code identifies a
 * single, specific structural defect in an `ExecutionRecord`; codes
 * are stable identifiers intended for programmatic handling by
 * downstream consumers.
 */
export type ExecutionValidationIssueCode =
  | 'MISSING_EXECUTION_ID'
  | 'MISSING_WORKFLOW_ID'
  | 'MISSING_ITEM_ID'
  | 'INVALID_ITEM_TYPE'
  | 'INVALID_STATUS'
  | 'MISSING_CREATED_AT'
  | 'MISSING_UPDATED_AT'
  | 'INVALID_CREATED_AT'
  | 'INVALID_UPDATED_AT'
  | 'UPDATED_BEFORE_CREATED'
  | 'DUPLICATE_TARGET_IDENTIFIER';

/**
 * A single structural validation issue describing exactly one defect
 * found in an `ExecutionRecord` by `ExecutionValidator.validate`. Pure
 * data only; issues are collected, never thrown, for ordinary
 * (well-formed-but-invalid) validation failures.
 */
export interface ExecutionValidationResultIssue {
  readonly field: string;
  readonly code: ExecutionValidationIssueCode;
  readonly message: string;
}

/**
 * Deterministic, structural validation report returned by
 * `ExecutionValidator.validate` and, in turn, by
 * `ExecutionEngine.getExecutionStatus` (Milestone 4).
 *
 * `valid` is `true` if and only if `issues` is empty. This type
 * describes only the *result* of validating an `ExecutionRecord`'s
 * structure; it never represents progress, outcome, retries, or any
 * other execution behavior.
 */
export interface ExecutionValidationResult {
  readonly executionId: string;
  readonly valid: boolean;
  readonly issues: readonly ExecutionValidationResultIssue[];
  readonly validatedAt: string;
}
