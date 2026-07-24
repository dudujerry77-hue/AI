/**
 * Shared Validation Engine error types.
 *
 * Milestone 1: introduces `NotImplementedError`, thrown by every
 * Validation Engine public API stub, and `ValidationRequestError`,
 * reserved for future request-validation use. No runtime behavior
 * beyond simple error classes exists in this module.
 */

/**
 * Thrown by Validation Engine API methods that are not yet
 * implemented.
 */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * A single structured issue describing why a Validation Engine
 * request was malformed. Reserved for future use; not thrown or
 * populated anywhere in Milestone 1.
 */
export interface ValidationRequestIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/**
 * Reserved for future milestones: to be thrown when a request to a
 * Validation Engine public API method is malformed or cannot be
 * processed. Not thrown anywhere in Milestone 1, since every public
 * API method is an unconditional `NotImplementedError` stub that
 * never reads its request.
 */
export class ValidationRequestError extends Error {
  public readonly issues: readonly ValidationRequestIssue[];

  constructor(message: string, issues: readonly ValidationRequestIssue[] = []) {
    super(message);
    this.name = 'ValidationRequestError';
    this.issues = issues;
  }
}
