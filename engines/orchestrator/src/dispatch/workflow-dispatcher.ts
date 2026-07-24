import type {
  Workflow,
  WorkflowDependency,
  WorkflowDispatchDecision,
  WorkflowDispatchItemType,
  WorkflowDispatchReason,
  WorkflowDispatchResult,
  WorkflowEscalationDecision,
  WorkflowEscalationReason,
  WorkflowStep,
  WorkflowStepStatus,
  WorkflowTask,
  WorkflowTaskStatus,
} from '../models/types';
import { OrchestratorValidationError } from '../errors/orchestrator-errors';

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Statuses considered structurally eligible for dispatch, for both
 * steps and tasks. Any other status (including `in-progress`,
 * `completed`, `failed`, `cancelled`, `skipped`, `blocked`) is not
 * eligible.
 */
const DISPATCH_ELIGIBLE_STEP_STATUSES: readonly WorkflowStepStatus[] = ['pending', 'ready'];
const DISPATCH_ELIGIBLE_TASK_STATUSES: readonly WorkflowTaskStatus[] = ['pending', 'ready'];

/**
 * `WorkflowDependency` types treated as dispatch preconditions: an
 * item that is the `targetId` of one of these dependency types is
 * only dispatch-ready once the referenced `sourceId` item's status
 * indicates the precondition is satisfied.
 */
const DISPATCH_PRECONDITION_DEPENDENCY_TYPES: ReadonlySet<WorkflowDependency['type']> = new Set([
  'blocks',
  'requires',
  'sequential',
]);

/**
 * Statuses that indicate a source item has satisfied a dispatch
 * precondition it participates in.
 */
const SATISFYING_STEP_STATUSES: ReadonlySet<WorkflowStepStatus> = new Set(['completed', 'skipped']);
const SATISFYING_TASK_STATUSES: ReadonlySet<WorkflowTaskStatus> = new Set(['completed']);

/**
 * Throws `OrchestratorValidationError` for malformed input: `null`,
 * `undefined`, or a non-object value. Returns the (still-unvalidated
 * for deeper structure) value otherwise.
 */
function requireWorkflowObject(workflow: Workflow): Workflow {
  if (workflow === null || workflow === undefined || !isPlainObject(workflow)) {
    throw new OrchestratorValidationError('Workflow must be a non-null object.', [
      {
        field: 'workflow',
        code: 'MALFORMED_INPUT',
        message: 'workflow must be a non-null object.',
      },
    ]);
  }

  return workflow;
}

/**
 * A resolved status lookup by item id, populated once per `dispatch`
 * call from the `Workflow`'s own `steps` and `tasks` arrays.
 */
interface ItemStatusIndex {
  readonly stepStatusById: ReadonlyMap<string, WorkflowStepStatus>;
  readonly taskStatusById: ReadonlyMap<string, WorkflowTaskStatus>;
}

function buildItemStatusIndex(workflow: Workflow): ItemStatusIndex {
  const stepStatusById = new Map<string, WorkflowStepStatus>();
  const taskStatusById = new Map<string, WorkflowTaskStatus>();

  for (const step of workflow.steps) {
    stepStatusById.set(step.stepId, step.status);
  }

  for (const task of workflow.tasks) {
    taskStatusById.set(task.taskId, task.status);
  }

  return { stepStatusById, taskStatusById };
}

/**
 * Returns true when the source item referenced by `sourceId` (which
 * may be a step id or a task id) has a status that satisfies a
 * dispatch precondition.
 */
function isSourceSatisfied(sourceId: string, index: ItemStatusIndex): boolean {
  const stepStatus = index.stepStatusById.get(sourceId);
  if (stepStatus !== undefined) {
    return SATISFYING_STEP_STATUSES.has(stepStatus);
  }

  const taskStatus = index.taskStatusById.get(sourceId);
  if (taskStatus !== undefined) {
    return SATISFYING_TASK_STATUSES.has(taskStatus);
  }

  // Unknown reference: cannot be confirmed satisfied.
  return false;
}

/**
 * `WorkflowDispatcher` performs deterministic, offline structural
 * dispatch-readiness and escalation determination for a `Workflow` —
 * Milestone 7.
 *
 * For every `WorkflowStep` and `WorkflowTask` already present on the
 * input `Workflow`, `dispatch` computes:
 *
 * - A `WorkflowDispatchDecision` reporting whether the item is
 *   structurally dispatch-ready. An item is dispatch-ready only when
 *   both of the following are true:
 *   1. Its own status is `pending` or `ready` (for steps or tasks
 *      respectively).
 *   2. Every `WorkflowDependency` of type `blocks`, `requires`, or
 *      `sequential` that targets the item (`targetId === item id`)
 *      has a source item (`sourceId`) whose status already indicates
 *      the precondition is satisfied (`completed` or `skipped` for
 *      steps; `completed` for tasks).
 * - A `WorkflowEscalationDecision` for any item whose status is
 *   `blocked`, or whose parent `Workflow.priority` is `critical` and
 *   whose own status is not `completed`, `failed`, `cancelled`, or
 *   `skipped` (i.e. is not yet in a terminal state) while remaining
 *   not-dispatch-ready.
 *
 * `dispatch` never mutates its input, performs no execution, no
 * scheduling, no retries, no concurrency, no persistence, no
 * networking, and calls no other Titan engine. Every decision is a
 * pure data record describing a structural condition already present
 * on the input `Workflow` — nothing is inferred, notified, or acted
 * upon.
 */
export class WorkflowDispatcher {
  /**
   * Compute a deterministic `WorkflowDispatchResult` for the given
   * `Workflow`.
   *
   * Throws `OrchestratorValidationError` only for malformed input:
   * `null`, `undefined`, or a non-object value.
   */
  dispatch(workflow: Workflow): WorkflowDispatchResult {
    const validated = requireWorkflowObject(workflow);

    const index = buildItemStatusIndex(validated);

    const stepDecisions = validated.steps.map((step) => this.evaluateStep(step, validated, index));
    const taskDecisions = validated.tasks.map((task) => this.evaluateTask(task, validated, index));

    const decisions: readonly WorkflowDispatchDecision[] = [...stepDecisions, ...taskDecisions];

    const dispatchable: readonly string[] = decisions
      .filter((decision) => decision.ready)
      .map((decision) => decision.itemId);

    const escalations: readonly WorkflowEscalationDecision[] = [
      ...this.escalationsForSteps(validated),
      ...this.escalationsForTasks(validated),
    ];

    return {
      workflowId: typeof validated.workflowId === 'string' ? validated.workflowId : '',
      dispatchable,
      decisions,
      escalations,
    };
  }

  private evaluateStep(step: WorkflowStep, workflow: Workflow, index: ItemStatusIndex): WorkflowDispatchDecision {
    return this.evaluateItem(step.stepId, 'step', step.status, workflow, index);
  }

  private evaluateTask(task: WorkflowTask, workflow: Workflow, index: ItemStatusIndex): WorkflowDispatchDecision {
    return this.evaluateItem(task.taskId, 'task', task.status, workflow, index);
  }

  private evaluateItem(
    itemId: string,
    itemType: WorkflowDispatchItemType,
    status: WorkflowStepStatus | WorkflowTaskStatus,
    workflow: Workflow,
    index: ItemStatusIndex,
  ): WorkflowDispatchDecision {
    const reasons: WorkflowDispatchReason[] = [];

    const eligibleStatuses: readonly (WorkflowStepStatus | WorkflowTaskStatus)[] =
      itemType === 'step' ? DISPATCH_ELIGIBLE_STEP_STATUSES : DISPATCH_ELIGIBLE_TASK_STATUSES;
    const statusReady = eligibleStatuses.includes(status);
    reasons.push(statusReady ? 'status-ready' : 'status-not-ready');

    const preconditionDependencies = workflow.dependencies.filter(
      (dependency) => dependency.targetId === itemId && DISPATCH_PRECONDITION_DEPENDENCY_TYPES.has(dependency.type),
    );

    const dependenciesSatisfied = preconditionDependencies.every((dependency) =>
      isSourceSatisfied(dependency.sourceId, index),
    );
    reasons.push(dependenciesSatisfied ? 'dependencies-satisfied' : 'dependencies-unsatisfied');

    return {
      itemId,
      itemType,
      ready: statusReady && dependenciesSatisfied,
      reasons,
    };
  }

  private escalationsForSteps(workflow: Workflow): readonly WorkflowEscalationDecision[] {
    return workflow.steps
      .map((step) => this.escalationForItem(step.stepId, 'step', step.status, workflow))
      .filter((decision): decision is WorkflowEscalationDecision => decision !== undefined);
  }

  private escalationsForTasks(workflow: Workflow): readonly WorkflowEscalationDecision[] {
    return workflow.tasks
      .map((task) => this.escalationForItem(task.taskId, 'task', task.status, workflow))
      .filter((decision): decision is WorkflowEscalationDecision => decision !== undefined);
  }

  private escalationForItem(
    itemId: string,
    itemType: WorkflowDispatchItemType,
    status: WorkflowStepStatus | WorkflowTaskStatus,
    workflow: Workflow,
  ): WorkflowEscalationDecision | undefined {
    const reason = this.escalationReasonFor(status, workflow.priority);

    if (reason === undefined) {
      return undefined;
    }

    return { itemId, itemType, reason };
  }

  /**
   * Determine the fixed, explicit escalation reason for a single
   * item's status given the parent `Workflow.priority`, or `undefined`
   * if no escalation condition is met.
   *
   * Escalation rules (exhaustive, explicit, and fixed — never
   * inferred):
   *
   * 1. `status === 'blocked'` → `'blocked-status'`.
   * 2. `priority === 'critical'` AND `status` is not a terminal
   *    status (`completed`, `failed`, `cancelled`, `skipped`) AND not
   *    already covered by rule 1 → `'critical-priority-not-progressing'`.
   */
  private escalationReasonFor(
    status: WorkflowStepStatus | WorkflowTaskStatus,
    priority: Workflow['priority'],
  ): WorkflowEscalationReason | undefined {
    if (status === 'blocked') {
      return 'blocked-status';
    }

    const terminalStatuses: ReadonlySet<WorkflowStepStatus | WorkflowTaskStatus> = new Set([
      'completed',
      'failed',
      'cancelled',
      'skipped',
    ]);

    if (priority === 'critical' && !terminalStatuses.has(status)) {
      return 'critical-priority-not-progressing';
    }

    return undefined;
  }
}
