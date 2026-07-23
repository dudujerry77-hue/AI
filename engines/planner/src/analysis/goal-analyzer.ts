import type { Goal, GoalPriority, GoalStatus, GoalType } from '../models/types';
import type { GoalValidationIssue } from '../errors/planner-errors';

/**
 * Structured result returned by `GoalAnalyzer.analyze`.
 *
 * Milestone 3 scope: pure, synchronous, deterministic structural
 * validation of a single `Goal` object. No Context Engine, no
 * Knowledge Engine, no AI, and no optimization.
 */
export interface GoalAnalysisResult {
  readonly goalId: string;
  readonly valid: boolean;
  readonly issues: readonly GoalValidationIssue[];
}

const VALID_GOAL_TYPES: readonly GoalType[] = [
  'feature',
  'bugfix',
  'refactor',
  'maintenance',
  'research',
  'compliance',
];

const VALID_GOAL_PRIORITIES: readonly GoalPriority[] = ['low', 'medium', 'high', 'critical'];

const VALID_GOAL_STATUSES: readonly GoalStatus[] = [
  'draft',
  'ready',
  'in-progress',
  'blocked',
  'completed',
  'cancelled',
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
 * `GoalAnalyzer` performs deterministic, offline structural validation
 * of a `Goal` object.
 *
 * Out of scope for Milestone 3 (intentionally not implemented here):
 * - Context Engine access.
 * - Knowledge Engine access.
 * - AI-assisted analysis.
 * - Optimization or ranking of goals.
 */
export class GoalAnalyzer {
  /**
   * Analyze a single `Goal` and return a structured result describing
   * whether it is valid and, if not, exactly why.
   */
  analyze(goal: Goal): GoalAnalysisResult {
    const issues: GoalValidationIssue[] = [];

    this.checkRequiredFields(goal, issues);
    this.checkEnumValues(goal, issues);
    this.checkTimestamps(goal, issues);

    return {
      goalId: typeof goal?.goalId === 'string' ? goal.goalId : '',
      valid: issues.length === 0,
      issues,
    };
  }

  private checkRequiredFields(goal: Goal, issues: GoalValidationIssue[]): void {
    if (!isNonEmptyString(goal?.goalId)) {
      issues.push({
        field: 'goalId',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'goalId is required and must be a non-empty string.',
      });
    }

    if (!isNonEmptyString(goal?.title)) {
      issues.push({
        field: 'title',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'title is required and must be a non-empty string.',
      });
    }

    if (!isNonEmptyString(goal?.description)) {
      issues.push({
        field: 'description',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'description is required and must be a non-empty string.',
      });
    }

    if (goal?.type === undefined || goal?.type === null) {
      issues.push({
        field: 'type',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'type is required.',
      });
    }

    if (goal?.priority === undefined || goal?.priority === null) {
      issues.push({
        field: 'priority',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'priority is required.',
      });
    }

    if (goal?.status === undefined || goal?.status === null) {
      issues.push({
        field: 'status',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'status is required.',
      });
    }

    if (!isNonEmptyString(goal?.createdAt)) {
      issues.push({
        field: 'createdAt',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'createdAt is required and must be a non-empty string.',
      });
    }

    if (!isNonEmptyString(goal?.updatedAt)) {
      issues.push({
        field: 'updatedAt',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'updatedAt is required and must be a non-empty string.',
      });
    }
  }

  private checkEnumValues(goal: Goal, issues: GoalValidationIssue[]): void {
    if (goal?.type !== undefined && goal?.type !== null && !VALID_GOAL_TYPES.includes(goal.type)) {
      issues.push({
        field: 'type',
        code: 'INVALID_ENUM_VALUE',
        message: `type must be one of: ${VALID_GOAL_TYPES.join(', ')}.`,
      });
    }

    if (
      goal?.priority !== undefined &&
      goal?.priority !== null &&
      !VALID_GOAL_PRIORITIES.includes(goal.priority)
    ) {
      issues.push({
        field: 'priority',
        code: 'INVALID_ENUM_VALUE',
        message: `priority must be one of: ${VALID_GOAL_PRIORITIES.join(', ')}.`,
      });
    }

    if (
      goal?.status !== undefined &&
      goal?.status !== null &&
      !VALID_GOAL_STATUSES.includes(goal.status)
    ) {
      issues.push({
        field: 'status',
        code: 'INVALID_ENUM_VALUE',
        message: `status must be one of: ${VALID_GOAL_STATUSES.join(', ')}.`,
      });
    }
  }

  private checkTimestamps(goal: Goal, issues: GoalValidationIssue[]): void {
    if (isNonEmptyString(goal?.createdAt) && !isValidIsoTimestamp(goal.createdAt)) {
      issues.push({
        field: 'createdAt',
        code: 'INVALID_TIMESTAMP',
        message: 'createdAt must be a valid ISO-8601 timestamp.',
      });
    }

    if (isNonEmptyString(goal?.updatedAt) && !isValidIsoTimestamp(goal.updatedAt)) {
      issues.push({
        field: 'updatedAt',
        code: 'INVALID_TIMESTAMP',
        message: 'updatedAt must be a valid ISO-8601 timestamp.',
      });
    }

    if (
      isNonEmptyString(goal?.createdAt) &&
      isNonEmptyString(goal?.updatedAt) &&
      isValidIsoTimestamp(goal.createdAt) &&
      isValidIsoTimestamp(goal.updatedAt) &&
      Date.parse(goal.updatedAt) < Date.parse(goal.createdAt)
    ) {
      issues.push({
        field: 'updatedAt',
        code: 'TIMESTAMP_ORDER_INVALID',
        message: 'updatedAt must not be earlier than createdAt.',
      });
    }
  }
}
