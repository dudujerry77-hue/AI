/**
 * Shared Orchestrator Engine error types.
 *
 * Milestone 1: introduces `NotImplementedError`, thrown by every
 * Orchestrator public API stub.
 *
 * Milestone 3: introduces `OrchestratorValidationError`, thrown by
 * `OrchestratorEngine.orchestrate` and `WorkflowBuilder` when a
 * request or input `Plan` is malformed. No other orchestration
 * behavior or error type is introduced yet.
 */

/**
 * Thrown by Orchestrator API methods that are not yet implemented.
 */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * A single structured validation issue produced during Orchestrator
 * request or `Plan`-to-`Workflow` translation validation.
 */
export interface OrchestratorValidationIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/**
 * Thrown by `OrchestratorEngine.orchestrate` and `WorkflowBuilder`
 * when a request is malformed or the supplied `Plan` cannot be
 * structurally translated into a `Workflow`.
 */
export class OrchestratorValidationError extends Error {
  public readonly issues: readonly OrchestratorValidationIssue[];

  constructor(message: string, issues: readonly OrchestratorValidationIssue[] = []) {
    super(message);
    this.name = 'OrchestratorValidationError';
    this.issues = issues;
  }
}
