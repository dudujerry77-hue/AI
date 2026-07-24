import type {
  Workflow,
  WorkflowDependencyType,
  WorkflowExecutionMode,
  WorkflowPriority,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowTaskStatus,
} from '../models/types';
import { OrchestratorValidationError, type OrchestratorValidationIssue } from '../errors/orchestrator-errors';

/**
 * Structured result returned by `WorkflowValidator.validate`.
 *
 * Milestone 4 scope: pure, synchronous, deterministic structural
 * validation of a single `Workflow` object. No graph traversal beyond
 * reference-existence checks, no cycle detection, no scheduling, no
 * execution, and no calls to any other engine.
 */
export interface WorkflowValidationResult {
  readonly workflowId: string;
  readonly valid: boolean;
  readonly issues: readonly OrchestratorValidationIssue[];
}

const VALID_WORKFLOW_STATUSES: readonly WorkflowStatus[] = [
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
];

const VALID_WORKFLOW_PRIORITIES: readonly WorkflowPriority[] = ['low', 'medium', 'high', 'critical'];

const VALID_WORKFLOW_EXECUTION_MODES: readonly WorkflowExecutionMode[] = ['sequential', 'parallel', 'conditional'];

const VALID_WORKFLOW_STEP_STATUSES: readonly WorkflowStepStatus[] = [
  'pending',
  'ready',
  'in-progress',
  'blocked',
  'completed',
  'failed',
  'skipped',
  'cancelled',
];

const VALID_WORKFLOW_TASK_STATUSES: readonly WorkflowTaskStatus[] = [
  'pending',
  'ready',
  'in-progress',
  'blocked',
  'completed',
  'failed',
  'cancelled',
];

const VALID_WORKFLOW_DEPENDENCY_TYPES: readonly WorkflowDependencyType[] = [
  'blocks',
  'requires',
  'related',
  'sequential',
  'parallel',
];

/**
 * Returns true when `value` is a non-empty, non-whitespace-only string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Returns true when `value` is a syntactically valid ISO-8601 timestamp
 * string that parses to a real point in time.
 */
function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

/**
 * Returns true when `value` looks like a plain object (not an array,
 * not null).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extracts the `stepId` string from an unknown array entry, or
 * `undefined` if the entry is not a plain object with a non-empty
 * `stepId` string.
 */
function extractStepId(step: unknown): string | undefined {
  if (!isPlainObject(step)) {
    return undefined;
  }
  const stepId = step.stepId;
  return isNonEmptyString(stepId) ? stepId : undefined;
}

/**
 * Extracts the `taskId` string from an unknown array entry, or
 * `undefined` if the entry is not a plain object with a non-empty
 * `taskId` string.
 */
function extractTaskId(task: unknown): string | undefined {
  if (!isPlainObject(task)) {
    return undefined;
  }
  const taskId = task.taskId;
  return isNonEmptyString(taskId) ? taskId : undefined;
}

/**
 * `WorkflowValidator` performs deterministic, offline structural
 * validation of a `Workflow` object — Milestone 4.
 *
 * Out of scope for Milestone 4 (intentionally not implemented here):
 * - Graph traversal beyond reference-existence checks.
 * - Cycle detection.
 * - Scheduling.
 * - Execution.
 * - Retries.
 * - Concurrency.
 * - Calls to any other engine.
 */
export class WorkflowValidator {
  /**
   * Validate a single `Workflow` and return a structured result
   * describing whether it is valid and, if not, exactly why.
   *
   * Throws `OrchestratorValidationError` only for malformed input:
   * `null`, `undefined`, or a non-object value. Structural issues
   * within an otherwise object-shaped `Workflow` are reported via the
   * returned `WorkflowValidationResult` instead of being thrown.
   */
  validate(workflow: Workflow): WorkflowValidationResult {
    if (workflow === null || workflow === undefined || !isPlainObject(workflow)) {
      throw new OrchestratorValidationError('Workflow must be a non-null object.', [
        {
          field: 'workflow',
          code: 'MALFORMED_INPUT',
          message: 'workflow must be a non-null object.',
        },
      ]);
    }

    const issues: OrchestratorValidationIssue[] = [];

    this.checkRequiredFields(workflow, issues);
    this.checkEnumValues(workflow, issues);
    this.checkMetadata(workflow, issues);
    this.checkSteps(workflow, issues);
    this.checkTasks(workflow, issues);
    this.checkDependencies(workflow, issues);

    return {
      workflowId: typeof workflow.workflowId === 'string' ? workflow.workflowId : '',
      valid: issues.length === 0,
      issues,
    };
  }

  private checkRequiredFields(workflow: Workflow, issues: OrchestratorValidationIssue[]): void {
    if (!isNonEmptyString(workflow.workflowId)) {
      issues.push({
        field: 'workflowId',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'workflowId is required and must be a non-empty string.',
      });
    }

    if (!isNonEmptyString(workflow.planId)) {
      issues.push({
        field: 'planId',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'planId is required and must be a non-empty string.',
      });
    }

    if (workflow.status === undefined || workflow.status === null) {
      issues.push({
        field: 'status',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'status is required.',
      });
    }

    if (workflow.priority === undefined || workflow.priority === null) {
      issues.push({
        field: 'priority',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'priority is required.',
      });
    }

    if (workflow.executionMode === undefined || workflow.executionMode === null) {
      issues.push({
        field: 'executionMode',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'executionMode is required.',
      });
    }

    if (!isPlainObject(workflow.metadata)) {
      issues.push({
        field: 'metadata',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'metadata is required and must be an object.',
      });
    }

    if (!Array.isArray(workflow.steps)) {
      issues.push({
        field: 'steps',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'steps is required and must be an array.',
      });
    }

    if (!Array.isArray(workflow.tasks)) {
      issues.push({
        field: 'tasks',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'tasks is required and must be an array.',
      });
    }

    if (!Array.isArray(workflow.dependencies)) {
      issues.push({
        field: 'dependencies',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'dependencies is required and must be an array.',
      });
    }
  }

  private checkEnumValues(workflow: Workflow, issues: OrchestratorValidationIssue[]): void {
    if (
      workflow.status !== undefined &&
      workflow.status !== null &&
      !VALID_WORKFLOW_STATUSES.includes(workflow.status)
    ) {
      issues.push({
        field: 'status',
        code: 'INVALID_ENUM_VALUE',
        message: `status must be one of: ${VALID_WORKFLOW_STATUSES.join(', ')}.`,
      });
    }

    if (
      workflow.priority !== undefined &&
      workflow.priority !== null &&
      !VALID_WORKFLOW_PRIORITIES.includes(workflow.priority)
    ) {
      issues.push({
        field: 'priority',
        code: 'INVALID_ENUM_VALUE',
        message: `priority must be one of: ${VALID_WORKFLOW_PRIORITIES.join(', ')}.`,
      });
    }

    if (
      workflow.executionMode !== undefined &&
      workflow.executionMode !== null &&
      !VALID_WORKFLOW_EXECUTION_MODES.includes(workflow.executionMode)
    ) {
      issues.push({
        field: 'executionMode',
        code: 'INVALID_ENUM_VALUE',
        message: `executionMode must be one of: ${VALID_WORKFLOW_EXECUTION_MODES.join(', ')}.`,
      });
    }
  }

  private checkMetadata(workflow: Workflow, issues: OrchestratorValidationIssue[]): void {
    if (!isPlainObject(workflow.metadata)) {
      return;
    }

    const metadata = workflow.metadata as Record<string, unknown>;

    if (!isNonEmptyString(metadata.createdAt)) {
      issues.push({
        field: 'metadata.createdAt',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'metadata.createdAt is required and must be a non-empty string.',
      });
    } else if (!isValidIsoTimestamp(metadata.createdAt)) {
      issues.push({
        field: 'metadata.createdAt',
        code: 'INVALID_TIMESTAMP',
        message: 'metadata.createdAt must be a valid ISO-8601 timestamp.',
      });
    }

    if (!isNonEmptyString(metadata.updatedAt)) {
      issues.push({
        field: 'metadata.updatedAt',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'metadata.updatedAt is required and must be a non-empty string.',
      });
    } else if (!isValidIsoTimestamp(metadata.updatedAt)) {
      issues.push({
        field: 'metadata.updatedAt',
        code: 'INVALID_TIMESTAMP',
        message: 'metadata.updatedAt must be a valid ISO-8601 timestamp.',
      });
    }

    if (
      isNonEmptyString(metadata.createdAt) &&
      isNonEmptyString(metadata.updatedAt) &&
      isValidIsoTimestamp(metadata.createdAt) &&
      isValidIsoTimestamp(metadata.updatedAt) &&
      Date.parse(metadata.updatedAt) < Date.parse(metadata.createdAt)
    ) {
      issues.push({
        field: 'metadata.updatedAt',
        code: 'TIMESTAMP_ORDER_INVALID',
        message: 'metadata.updatedAt must not be earlier than metadata.createdAt.',
      });
    }

    if (!isNonEmptyString(metadata.createdBy)) {
      issues.push({
        field: 'metadata.createdBy',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'metadata.createdBy is required and must be a non-empty string.',
      });
    }

    if (typeof metadata.revision !== 'number' || !Number.isFinite(metadata.revision)) {
      issues.push({
        field: 'metadata.revision',
        code: 'INVALID_FIELD_VALUE',
        message: 'metadata.revision is required and must be a number.',
      });
    }
  }

  private checkSteps(workflow: Workflow, issues: OrchestratorValidationIssue[]): void {
    if (!Array.isArray(workflow.steps)) {
      return;
    }

    const seenStepIds = new Set<string>();

    workflow.steps.forEach((step, index) => {
      if (!isPlainObject(step)) {
        issues.push({
          field: `steps[${index}]`,
          code: 'INVALID_FIELD_VALUE',
          message: `steps[${index}] must be an object.`,
        });
        return;
      }

      const candidate = step as unknown as Record<string, unknown>;
      const stepId = candidate.stepId;
      const title = candidate.title;
      const status = candidate.status;

      if (!isNonEmptyString(stepId)) {
        issues.push({
          field: `steps[${index}].stepId`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `steps[${index}].stepId is required and must be a non-empty string.`,
        });
      } else {
        if (seenStepIds.has(stepId)) {
          issues.push({
            field: `steps[${index}].stepId`,
            code: 'DUPLICATE_ID',
            message: `Duplicate stepId "${stepId}" found in steps.`,
          });
        }
        seenStepIds.add(stepId);
      }

      if (!isNonEmptyString(title)) {
        issues.push({
          field: `steps[${index}].title`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `steps[${index}].title is required and must be a non-empty string.`,
        });
      }

      if (status === undefined || status === null) {
        issues.push({
          field: `steps[${index}].status`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `steps[${index}].status is required.`,
        });
      } else if (!VALID_WORKFLOW_STEP_STATUSES.includes(status as WorkflowStepStatus)) {
        issues.push({
          field: `steps[${index}].status`,
          code: 'INVALID_ENUM_VALUE',
          message: `steps[${index}].status must be one of: ${VALID_WORKFLOW_STEP_STATUSES.join(', ')}.`,
        });
      }
    });
  }

  private checkTasks(workflow: Workflow, issues: OrchestratorValidationIssue[]): void {
    if (!Array.isArray(workflow.tasks)) {
      return;
    }

    const seenTaskIds = new Set<string>();

    workflow.tasks.forEach((task, index) => {
      if (!isPlainObject(task)) {
        issues.push({
          field: `tasks[${index}]`,
          code: 'INVALID_FIELD_VALUE',
          message: `tasks[${index}] must be an object.`,
        });
        return;
      }

      const candidate = task as unknown as Record<string, unknown>;
      const taskId = candidate.taskId;
      const title = candidate.title;
      const status = candidate.status;

      if (!isNonEmptyString(taskId)) {
        issues.push({
          field: `tasks[${index}].taskId`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `tasks[${index}].taskId is required and must be a non-empty string.`,
        });
      } else {
        if (seenTaskIds.has(taskId)) {
          issues.push({
            field: `tasks[${index}].taskId`,
            code: 'DUPLICATE_ID',
            message: `Duplicate taskId "${taskId}" found in tasks.`,
          });
        }
        seenTaskIds.add(taskId);
      }

      if (!isNonEmptyString(title)) {
        issues.push({
          field: `tasks[${index}].title`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `tasks[${index}].title is required and must be a non-empty string.`,
        });
      }

      if (status === undefined || status === null) {
        issues.push({
          field: `tasks[${index}].status`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `tasks[${index}].status is required.`,
        });
      } else if (!VALID_WORKFLOW_TASK_STATUSES.includes(status as WorkflowTaskStatus)) {
        issues.push({
          field: `tasks[${index}].status`,
          code: 'INVALID_ENUM_VALUE',
          message: `tasks[${index}].status must be one of: ${VALID_WORKFLOW_TASK_STATUSES.join(', ')}.`,
        });
      }
    });
  }

  private checkDependencies(workflow: Workflow, issues: OrchestratorValidationIssue[]): void {
    if (!Array.isArray(workflow.dependencies)) {
      return;
    }

    const knownIds = new Set<string>([
      ...(Array.isArray(workflow.steps)
        ? workflow.steps.map((step) => extractStepId(step)).filter((stepId): stepId is string => stepId !== undefined)
        : []),
      ...(Array.isArray(workflow.tasks)
        ? workflow.tasks.map((task) => extractTaskId(task)).filter((taskId): taskId is string => taskId !== undefined)
        : []),
    ]);

    const seenDependencyIds = new Set<string>();
    const seenDependencyEdges = new Set<string>();

    workflow.dependencies.forEach((dependency, index) => {
      if (!isPlainObject(dependency)) {
        issues.push({
          field: `dependencies[${index}]`,
          code: 'INVALID_FIELD_VALUE',
          message: `dependencies[${index}] must be an object.`,
        });
        return;
      }

      const candidate = dependency as unknown as Record<string, unknown>;
      const dependencyId = candidate.dependencyId;
      const type = candidate.type;
      const sourceId = candidate.sourceId;
      const targetId = candidate.targetId;

      if (!isNonEmptyString(dependencyId)) {
        issues.push({
          field: `dependencies[${index}].dependencyId`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `dependencies[${index}].dependencyId is required and must be a non-empty string.`,
        });
      } else {
        if (seenDependencyIds.has(dependencyId)) {
          issues.push({
            field: `dependencies[${index}].dependencyId`,
            code: 'DUPLICATE_ID',
            message: `Duplicate dependencyId "${dependencyId}" found in dependencies.`,
          });
        }
        seenDependencyIds.add(dependencyId);
      }

      if (type === undefined || type === null) {
        issues.push({
          field: `dependencies[${index}].type`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `dependencies[${index}].type is required.`,
        });
      } else if (!VALID_WORKFLOW_DEPENDENCY_TYPES.includes(type as WorkflowDependencyType)) {
        issues.push({
          field: `dependencies[${index}].type`,
          code: 'INVALID_ENUM_VALUE',
          message: `dependencies[${index}].type must be one of: ${VALID_WORKFLOW_DEPENDENCY_TYPES.join(', ')}.`,
        });
      }

      if (!isNonEmptyString(sourceId)) {
        issues.push({
          field: `dependencies[${index}].sourceId`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `dependencies[${index}].sourceId is required and must be a non-empty string.`,
        });
      } else if (!knownIds.has(sourceId)) {
        issues.push({
          field: `dependencies[${index}].sourceId`,
          code: 'UNKNOWN_REFERENCE',
          message: `dependencies[${index}].sourceId "${sourceId}" does not reference an existing step or task.`,
        });
      }

      if (!isNonEmptyString(targetId)) {
        issues.push({
          field: `dependencies[${index}].targetId`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `dependencies[${index}].targetId is required and must be a non-empty string.`,
        });
      } else if (!knownIds.has(targetId)) {
        issues.push({
          field: `dependencies[${index}].targetId`,
          code: 'UNKNOWN_REFERENCE',
          message: `dependencies[${index}].targetId "${targetId}" does not reference an existing step or task.`,
        });
      }

      if (isNonEmptyString(sourceId) && isNonEmptyString(targetId) && sourceId === targetId) {
        issues.push({
          field: `dependencies[${index}]`,
          code: 'SELF_DEPENDENCY',
          message: `dependencies[${index}] references the same ID ("${sourceId}") as both sourceId and targetId.`,
        });
      }

      if (isNonEmptyString(sourceId) && isNonEmptyString(targetId) && type !== undefined && type !== null) {
        const edgeKey = `${String(type)}:${sourceId}->${targetId}`;
        if (seenDependencyEdges.has(edgeKey)) {
          issues.push({
            field: `dependencies[${index}]`,
            code: 'DUPLICATE_DEPENDENCY',
            message: `dependencies[${index}] duplicates an existing "${String(type)}" dependency from "${sourceId}" to "${targetId}".`,
          });
        }
        seenDependencyEdges.add(edgeKey);
      }
    });
  }
}
