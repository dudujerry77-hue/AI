/**
 * Shared Execution Engine error types.
 *
 * Milestone 1: introduces `NotImplementedError`, thrown by every
 * Execution Engine public API stub, and `ExecutionValidationError`,
 * reserved for future request-validation use.
 *
 * Milestone 3: activates `ExecutionValidationError`, now thrown by
 * `ExecutionBuilder` and `ExecutionEngine.execute` when a
 * `WorkflowDispatchResult` input or execute request is malformed. No
 * other execution behavior is introduced.
 */

/**
 * Thrown by Execution API methods that are not yet implemented.
 */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * A single structured validation issue produced during Execution
 * request validation.
 */
export interface ExecutionValidationIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/**
 * Thrown by `ExecutionBuilder.build` and `ExecutionEngine.execute`
 * when a request or input `WorkflowDispatchResult` is malformed or
 * cannot be structurally translated into an `ExecutionRecord`.
 */
export class ExecutionValidationError extends Error {
  public readonly issues: readonly ExecutionValidationIssue[];

  constructor(message: string, issues: readonly ExecutionValidationIssue[] = []) {
    super(message);
    this.name = 'ExecutionValidationError';
    this.issues = issues;
  }
}
