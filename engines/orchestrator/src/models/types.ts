/**
 * Orchestrator Engine domain model — Milestone 2.
 *
 * These types define the Orchestrator's public domain model and API
 * request/response shapes. Milestone 2 introduces the model
 * definitions only; it does not introduce any orchestration
 * behavior. All public API methods remain unimplemented stubs that
 * throw `NotImplementedError`, exactly as in Milestone 1.
 *
 * No type in this module is populated, validated, or transformed by
 * any behavior yet. No other Titan engine (Planner, Knowledge,
 * Context, or Execution) is referenced from this module.
 */

/**
 * Runtime status for a workflow aggregate.
 */
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Runtime status for a single workflow step.
 */
export type WorkflowStepStatus =
  | 'pending'
  | 'ready'
  | 'in-progress'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/**
 * Runtime status for a workflow task dispatched within a step.
 */
export type WorkflowTaskStatus =
  | 'pending'
  | 'ready'
  | 'in-progress'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Relationship types between workflow steps or tasks.
 */
export type WorkflowDependencyType = 'blocks' | 'requires' | 'related' | 'sequential' | 'parallel';

/**
 * Execution mode describing how a workflow's steps are intended to be
 * carried out.
 */
export type WorkflowExecutionMode = 'sequential' | 'parallel' | 'conditional';

/**
 * Relative priority of a workflow.
 */
export type WorkflowPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Dependency edge connecting workflow steps or tasks.
 */
export interface WorkflowDependency {
  readonly dependencyId: string;
  readonly type: WorkflowDependencyType;
  readonly sourceId: string;
  readonly targetId: string;
  readonly reason?: string;
}

/**
 * Atomic dispatch unit within a workflow step.
 */
export interface WorkflowTask {
  readonly taskId: string;
  readonly stepId: string;
  readonly title: string;
  readonly description: string;
  readonly status: WorkflowTaskStatus;
  readonly assignee?: string;
}

/**
 * A single step within a workflow, grouping one or more tasks.
 */
export interface WorkflowStep {
  readonly stepId: string;
  readonly title: string;
  readonly description: string;
  readonly status: WorkflowStepStatus;
  readonly taskIds: readonly string[];
  readonly dependsOnStepIds?: readonly string[];
}

/**
 * Workflow-level metadata for traceability.
 */
export interface WorkflowMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly revision: number;
  readonly labels?: readonly string[];
}

/**
 * Context envelope provided to Orchestrator API operations.
 */
export interface WorkflowContext {
  readonly actorId: string;
  readonly sessionId?: string;
  readonly phaseId?: string;
  readonly planId?: string;
  readonly inputs?: Readonly<Record<string, unknown>>;
}

/**
 * Immutable top-level workflow aggregate model.
 */
export interface Workflow {
  readonly workflowId: string;
  readonly planId: string;
  readonly status: WorkflowStatus;
  readonly priority: WorkflowPriority;
  readonly executionMode: WorkflowExecutionMode;
  readonly metadata: WorkflowMetadata;
  readonly steps: readonly WorkflowStep[];
  readonly tasks: readonly WorkflowTask[];
  readonly dependencies: readonly WorkflowDependency[];
}

/**
 * Outcome payload for a completed or terminated workflow.
 */
export interface WorkflowResult {
  readonly workflowId: string;
  readonly status: WorkflowStatus;
  readonly completedStepIds: readonly string[];
  readonly failedStepIds: readonly string[];
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly error?: string;
}

/**
 * Deterministic, at-a-glance summary of a workflow's shape and
 * current progress.
 *
 * Milestone 5 extends this shape with per-status step and task
 * breakdown counts (`completedSteps`, `pendingSteps`, `runningSteps`,
 * `failedSteps`, `cancelledSteps`, `completedTasks`, `pendingTasks`,
 * `runningTasks`, `failedTasks`, `cancelledTasks`), all computed
 * purely from structural data already present on a `Workflow` by
 * `WorkflowStatusTracker`. No field here is inferred, executed,
 * scheduled, or simulated.
 */
export interface WorkflowSummary {
  readonly workflowId: string;
  readonly status: WorkflowStatus;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly pendingSteps: number;
  readonly runningSteps: number;
  readonly failedSteps: number;
  readonly cancelledSteps: number;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly pendingTasks: number;
  readonly runningTasks: number;
  readonly failedTasks: number;
  readonly cancelledTasks: number;
  readonly dependencyCount: number;
}

/**
 * Kind of workflow item a dispatch or escalation decision refers to,
 * introduced in Milestone 7.
 */
export type WorkflowDispatchItemType = 'step' | 'task';

/**
 * Deterministic, structural reason code explaining a dispatch
 * decision for one workflow item, introduced in Milestone 7 for
 * `WorkflowDispatcher`.
 *
 * These reason codes describe only the structural condition that was
 * evaluated (the item's own status value, and whether dependency
 * preconditions already recorded on the `Workflow` are satisfied);
 * they never represent an inferred, scheduled, or executed outcome.
 */
export type WorkflowDispatchReason =
  | 'status-ready'
  | 'status-not-ready'
  | 'dependencies-satisfied'
  | 'dependencies-unsatisfied';

/**
 * A single deterministic dispatch-readiness decision for one workflow
 * step or task, produced by `WorkflowDispatcher` (Milestone 7).
 *
 * `ready` is derived exclusively from the item's own status value
 * (`pending` or `ready` are the only statuses considered eligible)
 * and from whether every dependency precondition already recorded on
 * the `Workflow` (via `WorkflowDependency` edges of type `blocks`,
 * `requires`, or `sequential` targeting this item) is satisfied by
 * the current status of the referenced source item. No scheduling,
 * ordering, or execution decision is made — `ready` reflects
 * structural eligibility only.
 */
export interface WorkflowDispatchDecision {
  readonly itemId: string;
  readonly itemType: WorkflowDispatchItemType;
  readonly ready: boolean;
  readonly reasons: readonly WorkflowDispatchReason[];
}

/**
 * Deterministic, structural reason code explaining why a workflow
 * item was classified for escalation, introduced in Milestone 7 for
 * `WorkflowDispatcher`.
 *
 * Escalation reason codes describe only a fixed, explicit structural
 * condition already present on the `Workflow`; they never represent
 * an inferred, notified, or externally-acted-upon outcome.
 */
export type WorkflowEscalationReason = 'blocked-status' | 'critical-priority-not-progressing';

/**
 * A single deterministic escalation decision for one workflow step or
 * task, produced by `WorkflowDispatcher` (Milestone 7).
 *
 * An escalation decision is a pure data record: it never executes,
 * notifies, dispatches externally, or invokes another engine. It
 * only reports that a fixed structural condition was met.
 */
export interface WorkflowEscalationDecision {
  readonly itemId: string;
  readonly itemType: WorkflowDispatchItemType;
  readonly reason: WorkflowEscalationReason;
}

/**
 * Deterministic result of a `WorkflowDispatcher.dispatch` call
 * (Milestone 7): the full set of dispatch-readiness decisions and
 * escalation decisions computed for a `Workflow`, plus the ordered
 * list of item IDs found to be dispatch-ready.
 */
export interface WorkflowDispatchResult {
  readonly workflowId: string;
  readonly dispatchable: readonly string[];
  readonly decisions: readonly WorkflowDispatchDecision[];
  readonly escalations: readonly WorkflowEscalationDecision[];
}
