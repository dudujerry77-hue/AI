/**
 * Shared Planner Engine error types.
 *
 * Milestone 3: introduces `PlanningValidationError` for goal-analysis
 * failures and relocates `NotImplementedError` here so all Planner
 * error types share a single module.
 */

/**
 * Thrown by Planner API methods that are not yet implemented.
 */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * A single structured validation issue produced by `GoalAnalyzer`.
 */
export interface GoalValidationIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/**
 * Thrown by `PlannerEngine.createPlan` when `GoalAnalyzer` determines
 * the supplied `Goal` is invalid.
 */
export class PlanningValidationError extends Error {
  public readonly issues: readonly GoalValidationIssue[];

  constructor(message: string, issues: readonly GoalValidationIssue[] = []) {
    super(message);
    this.name = 'PlanningValidationError';
    this.issues = issues;
  }
}
