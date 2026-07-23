import type {
  ConstraintType,
  DependencyType,
  Plan,
  PlanStatus,
  StepStatus,
  StepType,
  TaskStatus,
} from '../models/types';
import { PlanningValidationError, type GoalValidationIssue } from '../errors/planner-errors';

/**
 * Structured result returned by `PlanValidator.validate`.
 *
 * Milestone 4 scope: pure, synchronous, deterministic structural
 * validation of a single `Plan` object. No graph traversal, no cycle
 * detection, no optimization, no scheduling, no execution, and no
 * calls to any other engine.
 */
export interface PlanValidationResult {
  readonly planId: string;
  readonly valid: boolean;
  readonly issues: readonly GoalValidationIssue[];
}

const VALID_PLAN_STATUSES: readonly PlanStatus[] = [
  'draft',
  'validated',
  'approved',
  'active',
  'completed',
  'cancelled',
  'failed',
];

const VALID_STEP_TYPES: readonly StepType[] = [
  'analysis',
  'design',
  'implementation',
  'validation',
  'documentation',
  'release',
];

const VALID_STEP_STATUSES: readonly StepStatus[] = [
  'pending',
  'ready',
  'in-progress',
  'blocked',
  'completed',
  'skipped',
  'cancelled',
];

const VALID_TASK_STATUSES: readonly TaskStatus[] = [
  'pending',
  'ready',
  'in-progress',
  'blocked',
  'completed',
  'failed',
  'cancelled',
];

const VALID_DEPENDENCY_TYPES: readonly DependencyType[] = [
  'blocks',
  'requires',
  'related',
  'sequential',
  'parallel',
];

const VALID_CONSTRAINT_TYPES: readonly ConstraintType[] = [
  'time',
  'cost',
  'resource',
  'policy',
  'security',
  'quality',
  'compliance',
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
 * Extracts the `stepId` string from an unknown array entry, or `undefined`
 * if the entry is not a plain object with a non-empty `stepId` string.
 */
function extractStepId(step: unknown): string | undefined {
  if (!isPlainObject(step)) {
    return undefined;
  }
  const stepId = (step as Record<string, unknown>).stepId;
  return isNonEmptyString(stepId) ? stepId : undefined;
}

/**
 * Extracts the `taskId` string from an unknown array entry, or `undefined`
 * if the entry is not a plain object with a non-empty `taskId` string.
 */
function extractTaskId(task: unknown): string | undefined {
  if (!isPlainObject(task)) {
    return undefined;
  }
  const taskId = (task as Record<string, unknown>).taskId;
  return isNonEmptyString(taskId) ? taskId : undefined;
}

/**
 * `PlanValidator` performs deterministic, offline structural validation
 * of a `Plan` object.
 *
 * Out of scope for Milestone 4 (intentionally not implemented here):
 * - Graph traversal.
 * - Cycle detection.
 * - Optimization.
 * - Scheduling.
 * - Execution.
 * - Calls to any other engine.
 */
export class PlanValidator {
  /**
   * Validate a single `Plan` and return a structured result describing
   * whether it is valid and, if not, exactly why.
   *
   * Throws `PlanningValidationError` only for malformed input: `null`,
   * `undefined`, or a non-object value. Structural issues within an
   * otherwise object-shaped `Plan` are reported via the returned
   * `PlanValidationResult` instead of being thrown.
   */
  validate(plan: Plan): PlanValidationResult {
    if (plan === null || plan === undefined || !isPlainObject(plan)) {
      throw new PlanningValidationError('Plan must be a non-null object.', [
        {
          field: 'plan',
          code: 'MALFORMED_INPUT',
          message: 'plan must be a non-null object.',
        },
      ]);
    }

    const issues: GoalValidationIssue[] = [];

    this.checkRequiredFields(plan, issues);
    this.checkEnumValues(plan, issues);
    this.checkMetadata(plan, issues);
    this.checkSteps(plan, issues);
    this.checkTasks(plan, issues);
    this.checkDependencies(plan, issues);

    return {
      planId: typeof plan.planId === 'string' ? plan.planId : '',
      valid: issues.length === 0,
      issues,
    };
  }

  private checkRequiredFields(plan: Plan, issues: GoalValidationIssue[]): void {
    if (!isNonEmptyString(plan.planId)) {
      issues.push({
        field: 'planId',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'planId is required and must be a non-empty string.',
      });
    }

    if (!isNonEmptyString(plan.goalId)) {
      issues.push({
        field: 'goalId',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'goalId is required and must be a non-empty string.',
      });
    }

    if (plan.status === undefined || plan.status === null) {
      issues.push({
        field: 'status',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'status is required.',
      });
    }

    if (!isPlainObject(plan.metadata)) {
      issues.push({
        field: 'metadata',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'metadata is required and must be an object.',
      });
    }

    if (!Array.isArray(plan.steps)) {
      issues.push({
        field: 'steps',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'steps is required and must be an array.',
      });
    }

    if (!Array.isArray(plan.tasks)) {
      issues.push({
        field: 'tasks',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'tasks is required and must be an array.',
      });
    }

    if (!Array.isArray(plan.dependencies)) {
      issues.push({
        field: 'dependencies',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'dependencies is required and must be an array.',
      });
    }

    if (!Array.isArray(plan.constraints)) {
      issues.push({
        field: 'constraints',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'constraints is required and must be an array.',
      });
    }
  }

  private checkEnumValues(plan: Plan, issues: GoalValidationIssue[]): void {
    if (
      plan.status !== undefined &&
      plan.status !== null &&
      !VALID_PLAN_STATUSES.includes(plan.status)
    ) {
      issues.push({
        field: 'status',
        code: 'INVALID_ENUM_VALUE',
        message: `status must be one of: ${VALID_PLAN_STATUSES.join(', ')}.`,
      });
    }

    if (Array.isArray(plan.constraints)) {
      plan.constraints.forEach((constraint, index) => {
        if (!isPlainObject(constraint)) {
          return;
        }
        const constraintType = (constraint as Record<string, unknown>).type;
        if (
          constraintType !== undefined &&
          constraintType !== null &&
          !VALID_CONSTRAINT_TYPES.includes(constraintType as ConstraintType)
        ) {
          issues.push({
            field: `constraints[${index}].type`,
            code: 'INVALID_ENUM_VALUE',
            message: `constraints[${index}].type must be one of: ${VALID_CONSTRAINT_TYPES.join(', ')}.`,
          });
        }
      });
    }
  }

  private checkMetadata(plan: Plan, issues: GoalValidationIssue[]): void {
    if (!isPlainObject(plan.metadata)) {
      return;
    }

    const metadata = plan.metadata as Record<string, unknown>;

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

    if (
      typeof metadata.revision !== 'number' ||
      !Number.isFinite(metadata.revision) ||
      metadata.revision < 1
    ) {
      issues.push({
        field: 'metadata.revision',
        code: 'INVALID_FIELD_VALUE',
        message: 'metadata.revision is required and must be a number >= 1.',
      });
    }
  }

  private checkSteps(plan: Plan, issues: GoalValidationIssue[]): void {
    if (!Array.isArray(plan.steps)) {
      return;
    }

    const seenStepIds = new Set<string>();

    plan.steps.forEach((step, index) => {
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
      const description = candidate.description;
      const type = candidate.type;
      const status = candidate.status;
      const taskIds = candidate.taskIds;

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

      if (!isNonEmptyString(description)) {
        issues.push({
          field: `steps[${index}].description`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `steps[${index}].description is required and must be a non-empty string.`,
        });
      }

      if (type === undefined || type === null) {
        issues.push({
          field: `steps[${index}].type`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `steps[${index}].type is required.`,
        });
      } else if (!VALID_STEP_TYPES.includes(type as StepType)) {
        issues.push({
          field: `steps[${index}].type`,
          code: 'INVALID_ENUM_VALUE',
          message: `steps[${index}].type must be one of: ${VALID_STEP_TYPES.join(', ')}.`,
        });
      }

      if (status === undefined || status === null) {
        issues.push({
          field: `steps[${index}].status`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `steps[${index}].status is required.`,
        });
      } else if (!VALID_STEP_STATUSES.includes(status as StepStatus)) {
        issues.push({
          field: `steps[${index}].status`,
          code: 'INVALID_ENUM_VALUE',
          message: `steps[${index}].status must be one of: ${VALID_STEP_STATUSES.join(', ')}.`,
        });
      }

      if (!Array.isArray(taskIds)) {
        issues.push({
          field: `steps[${index}].taskIds`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `steps[${index}].taskIds is required and must be an array.`,
        });
      }
    });
  }

  private checkTasks(plan: Plan, issues: GoalValidationIssue[]): void {
    if (!Array.isArray(plan.tasks)) {
      return;
    }

    const stepIds = new Set(
      Array.isArray(plan.steps)
        ? plan.steps
            .map((step) => extractStepId(step))
            .filter((stepId): stepId is string => stepId !== undefined)
        : [],
    );

    const seenTaskIds = new Set<string>();

    plan.tasks.forEach((task, index) => {
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
      const stepId = candidate.stepId;
      const title = candidate.title;
      const description = candidate.description;
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

      if (!isNonEmptyString(stepId)) {
        issues.push({
          field: `tasks[${index}].stepId`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `tasks[${index}].stepId is required and must be a non-empty string.`,
        });
      } else if (!stepIds.has(stepId)) {
        issues.push({
          field: `tasks[${index}].stepId`,
          code: 'UNKNOWN_REFERENCE',
          message: `tasks[${index}].stepId "${stepId}" does not reference an existing step.`,
        });
      }

      if (!isNonEmptyString(title)) {
        issues.push({
          field: `tasks[${index}].title`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `tasks[${index}].title is required and must be a non-empty string.`,
        });
      }

      if (!isNonEmptyString(description)) {
        issues.push({
          field: `tasks[${index}].description`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `tasks[${index}].description is required and must be a non-empty string.`,
        });
      }

      if (status === undefined || status === null) {
        issues.push({
          field: `tasks[${index}].status`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `tasks[${index}].status is required.`,
        });
      } else if (!VALID_TASK_STATUSES.includes(status as TaskStatus)) {
        issues.push({
          field: `tasks[${index}].status`,
          code: 'INVALID_ENUM_VALUE',
          message: `tasks[${index}].status must be one of: ${VALID_TASK_STATUSES.join(', ')}.`,
        });
      }
    });
  }

  private checkDependencies(plan: Plan, issues: GoalValidationIssue[]): void {
    if (!Array.isArray(plan.dependencies)) {
      return;
    }

    const knownIds = new Set<string>([
      ...(Array.isArray(plan.steps)
        ? plan.steps
            .map((step) => extractStepId(step))
            .filter((stepId): stepId is string => stepId !== undefined)
        : []),
      ...(Array.isArray(plan.tasks)
        ? plan.tasks
            .map((task) => extractTaskId(task))
            .filter((taskId): taskId is string => taskId !== undefined)
        : []),
    ]);

    const seenDependencyIds = new Set<string>();
    const seenDependencyEdges = new Set<string>();

    plan.dependencies.forEach((dependency, index) => {
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
      } else if (!VALID_DEPENDENCY_TYPES.includes(type as DependencyType)) {
        issues.push({
          field: `dependencies[${index}].type`,
          code: 'INVALID_ENUM_VALUE',
          message: `dependencies[${index}].type must be one of: ${VALID_DEPENDENCY_TYPES.join(', ')}.`,
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

      if (
        isNonEmptyString(sourceId) &&
        isNonEmptyString(targetId) &&
        sourceId === targetId
      ) {
        issues.push({
          field: `dependencies[${index}]`,
          code: 'SELF_DEPENDENCY',
          message: `dependencies[${index}] references the same ID ("${sourceId}") as both sourceId and targetId.`,
        });
      }

      if (
        isNonEmptyString(sourceId) &&
        isNonEmptyString(targetId) &&
        type !== undefined &&
        type !== null
      ) {
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
