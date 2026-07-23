/**
 * Supported goal categories for planner input.
 */
export type GoalType =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'maintenance'
  | 'research'
  | 'compliance';

/**
 * Relative urgency of a goal.
 */
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Lifecycle state for a goal definition.
 */
export type GoalStatus = 'draft' | 'ready' | 'in-progress' | 'blocked' | 'completed' | 'cancelled';

/**
 * Durable goal model consumed by planner APIs.
 */
export interface Goal {
  readonly goalId: string;
  readonly title: string;
  readonly description: string;
  readonly type: GoalType;
  readonly priority: GoalPriority;
  readonly status: GoalStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly tags?: readonly string[];
}

/**
 * Runtime status for a plan record.
 */
export type PlanStatus = 'draft' | 'validated' | 'approved' | 'active' | 'completed' | 'cancelled' | 'failed';

/**
 * Plan-level metadata for traceability.
 */
export interface PlanMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly revision: number;
  readonly labels?: readonly string[];
}

/**
 * Supported step categories in a plan.
 */
export type StepType = 'analysis' | 'design' | 'implementation' | 'validation' | 'documentation' | 'release';

/**
 * Runtime status for a plan step.
 */
export type StepStatus = 'pending' | 'ready' | 'in-progress' | 'blocked' | 'completed' | 'skipped' | 'cancelled';

/**
 * Atomic execution unit metadata inside a plan.
 */
export interface PlanStep {
  readonly stepId: string;
  readonly title: string;
  readonly description: string;
  readonly type: StepType;
  readonly status: StepStatus;
  readonly taskIds: readonly string[];
  readonly dependsOnStepIds?: readonly string[];
}

/**
 * Runtime status for a task.
 */
export type TaskStatus = 'pending' | 'ready' | 'in-progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';

/**
 * Planner task model linked to plan steps.
 */
export interface Task {
  readonly taskId: string;
  readonly stepId: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly assignee?: string;
}

/**
 * Relationship types between tasks or steps.
 */
export type DependencyType = 'blocks' | 'requires' | 'related' | 'sequential' | 'parallel';

/**
 * Dependency edge connecting planner entities.
 */
export interface Dependency {
  readonly dependencyId: string;
  readonly type: DependencyType;
  readonly sourceId: string;
  readonly targetId: string;
  readonly reason?: string;
}

/**
 * Constraint categories for plan shaping.
 */
export type ConstraintType = 'time' | 'cost' | 'resource' | 'policy' | 'security' | 'quality' | 'compliance';

/**
 * Immutable constraint descriptor for planner requests.
 */
export interface Constraint {
  readonly constraintId: string;
  readonly type: ConstraintType;
  readonly description: string;
  readonly required: boolean;
  readonly value?: string | number | boolean;
}

/**
 * Context envelope provided to planner API operations.
 */
export interface PlanningContext {
  readonly actorId: string;
  readonly sessionId?: string;
  readonly phaseId?: string;
  readonly assumptions?: readonly string[];
  readonly inputs?: Readonly<Record<string, unknown>>;
}

/**
 * Cost estimate details for a plan.
 */
export interface CostEstimate {
  readonly currency: string;
  readonly amount: number;
  readonly lowerBound?: number;
  readonly upperBound?: number;
}

/**
 * Time estimate details for a plan.
 */
export interface TimeEstimate {
  readonly unit: 'hours' | 'days' | 'weeks';
  readonly value: number;
  readonly lowerBound?: number;
  readonly upperBound?: number;
}

/**
 * Resource estimate details for a plan.
 */
export interface ResourceEstimate {
  readonly people: number;
  readonly effortHours: number;
  readonly tools?: readonly string[];
}

/**
 * Deterministic, structurally-derived complexity classification for a
 * plan, produced by `PlanEstimator` (Milestone 6).
 */
export type ComplexityLevel = 'low' | 'medium' | 'high';

/**
 * Full estimate bundle for a plan.
 *
 * `confidence`, `cost`, `time`, and `resources` are the original
 * Milestone 2 estimate fields and retain their original meaning.
 *
 * The remaining fields are additive, optional Milestone 6 fields
 * populated by `PlanEstimator` from purely structural counts on the
 * `Plan` itself (step count, task count, dependency count). They are
 * optional so that any existing `PlanEstimate` value constructed
 * before Milestone 6 remains valid without modification.
 */
export interface PlanEstimate {
  readonly confidence: number;
  readonly cost: CostEstimate;
  readonly time: TimeEstimate;
  readonly resources: ResourceEstimate;
  readonly totalSteps?: number;
  readonly totalTasks?: number;
  readonly dependencyCount?: number;
  readonly estimatedDurationHours?: number;
  readonly estimatedEffortHours?: number;
  readonly complexityLevel?: ComplexityLevel;
}

/**
 * Deterministic summary of a plan's dependency edges, grouped by
 * `DependencyType`, produced by `PlanExplainer` (Milestone 6).
 */
export interface DependencySummary {
  readonly total: number;
  readonly byType: Readonly<Record<DependencyType, number>>;
}

/**
 * Deterministic validation-status summary embedded in a plan
 * explanation, produced by `PlanExplainer` (Milestone 6) by delegating
 * to `PlanValidator`.
 */
export interface PlanValidationStatus {
  readonly valid: boolean;
  readonly issueCount: number;
}

/**
 * Human-readable plan explanation model.
 *
 * `planId`, `summary`, `rationale`, `assumptions`, and `tradeoffs` are
 * the original Milestone 2 explanation fields and retain their
 * original meaning (free-form, human-authored or caller-provided
 * text).
 *
 * The remaining fields are additive, optional Milestone 6 fields
 * populated by `PlanExplainer` directly from information already
 * present on the `Plan` (and its `PlanValidator` result). They are
 * optional so that any existing `PlanExplanation` value constructed
 * before Milestone 6 remains valid without modification.
 */
export interface PlanExplanation {
  readonly planId: string;
  readonly summary: string;
  readonly rationale: string;
  readonly assumptions?: readonly string[];
  readonly tradeoffs?: readonly string[];
  readonly stepCount?: number;
  readonly taskCount?: number;
  readonly dependencySummary?: DependencySummary;
  readonly executionOrder?: readonly string[];
  readonly validationStatus?: PlanValidationStatus;
}

/**
 * Immutable top-level plan aggregate model.
 */
export interface Plan {
  readonly planId: string;
  readonly goalId: string;
  readonly status: PlanStatus;
  readonly metadata: PlanMetadata;
  readonly steps: readonly PlanStep[];
  readonly tasks: readonly Task[];
  readonly dependencies: readonly Dependency[];
  readonly constraints: readonly Constraint[];
  readonly estimate?: PlanEstimate;
  readonly explanation?: PlanExplanation;
}
