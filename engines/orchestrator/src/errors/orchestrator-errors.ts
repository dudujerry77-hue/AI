/**
 * Shared Orchestrator Engine error types.
 *
 * Milestone 1: introduces `NotImplementedError`, thrown by every
 * Orchestrator public API stub. No orchestration-specific error types
 * exist yet; those will be introduced in later milestones alongside
 * their corresponding behavior.
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
