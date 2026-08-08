import type { Logger } from '@titan/shared';
import type { Goal, Plan } from '@titan/planner';
import type { Workflow, WorkflowDispatchResult } from '@titan/orchestrator';
import type { ExecutionRecord } from '@titan/execution';
import type { ValidationVerdict } from '@titan/validation';
import type { LearningPipelineResult } from '@titan/learning';
import type { TitanShell } from '../index';
import type { FlagSpec, FlagValue } from './command-parser';

export interface SessionHistoryEntry {
  readonly command: string;
  readonly timestamp: string;
  readonly success: boolean;
}

/**
 * Mutable state carried across commands within a single interactive
 * session, modeling the real Titan lifecycle one stage at a time as each
 * producing command runs: Goal -> Plan -> Workflow -> Dispatch ->
 * Execution -> Validation -> Learning. A single active chain is modeled,
 * not multiple concurrent ones — nothing in this phase requires more.
 * Never persisted — a fresh shell process starts empty.
 */
export interface ShellSession {
  lastGoal?: Goal;
  lastPlan?: Plan;
  lastWorkflow?: Workflow;
  lastDispatch?: WorkflowDispatchResult;
  lastExecution?: ExecutionRecord;
  lastValidation?: ValidationVerdict;
  lastLearning?: LearningPipelineResult;
  readonly history: SessionHistoryEntry[];
  /** Every plan created this session, in creation order — `plan list`'s backing store. `lastPlan` is the active one `explain`/`validate` operate on. */
  readonly plans: Plan[];
  /** Every execution record produced this session — `task list`'s backing store. `lastExecution` is the active one `task status`/`task result` operate on. */
  readonly executions: ExecutionRecord[];
}

export type OutputFormat = 'human' | 'json' | 'concise';

export interface CommandContext {
  readonly shell: TitanShell;
  readonly logger: Logger;
  readonly session: ShellSession;
  readonly args: readonly string[];
  readonly flags: Readonly<Record<string, FlagValue>>;
  readonly format: OutputFormat;
  readonly verbose: boolean;
}

export interface CommandResult {
  /** Drives the process exit code — never omit this in a new command. */
  readonly success: boolean;
  readonly output: string;
  /** Structured payload rendered when `--json` is passed. Omit if the command has nothing structured to report. */
  readonly data?: unknown;
  /** When true, the REPL loop closes after printing the rendered result. */
  readonly exit?: boolean;
}

interface CommandNodeBase {
  readonly name: string;
  readonly description: string;
}

export interface CommandLeaf extends CommandNodeBase {
  readonly kind: 'leaf';
  /** Shown in `help` output, e.g. "plan create <goal> | plan explain". */
  readonly usage: string;
  readonly flags?: readonly FlagSpec[];
  readonly execute: (
    context: CommandContext,
  ) => Promise<CommandResult> | CommandResult;
}

export interface CommandGroup extends CommandNodeBase {
  readonly kind: 'group';
  readonly subcommands: ReadonlyMap<string, CommandNode>;
}

export type CommandNode = CommandLeaf | CommandGroup;
