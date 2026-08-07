import type { Logger } from '@titan/shared';
import type { Plan } from '@titan/planner';
import type { TitanShell } from '../index';

/**
 * Mutable state carried across commands within a single interactive
 * session (e.g. so "plan explain" can refer to the plan "plan create"
 * just produced). Never persisted — a fresh shell process starts empty.
 */
export interface ShellSession {
  lastPlan?: Plan;
}

export interface CommandContext {
  readonly shell: TitanShell;
  readonly logger: Logger;
  readonly session: ShellSession;
  readonly args: readonly string[];
}

export interface CommandResult {
  readonly output: string;
  /** When true, the REPL loop closes after printing `output`. */
  readonly exit?: boolean;
}

export interface CommandDefinition {
  readonly name: string;
  /** Shown in `help` output, e.g. "plan create <goal> | plan explain". */
  readonly usage: string;
  readonly description: string;
  readonly execute: (
    context: CommandContext,
  ) => Promise<CommandResult> | CommandResult;
}
