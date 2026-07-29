/**
 * Shared Learning Engine error types.
 *
 * Introduces `LearningRequestError`, thrown by Learning Engine public
 * methods and their delegate builders when a request or input value
 * is missing or malformed. No other runtime behavior exists in this
 * module.
 */

/**
 * A single structured issue describing why a Learning Engine request
 * or input value was malformed.
 */
export interface LearningRequestIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/**
 * Thrown when a request to a Learning Engine public API method, or an
 * input value passed to one of its delegate builders, is malformed or
 * cannot be processed.
 */
export class LearningRequestError extends Error {
  public readonly issues: readonly LearningRequestIssue[];

  constructor(message: string, issues: readonly LearningRequestIssue[] = []) {
    super(message);
    this.name = 'LearningRequestError';
    this.issues = issues;
  }
}
