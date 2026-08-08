import { ExecutionEngine } from '@titan/execution';
import type {
  ExecutionRecord,
  ExecutionSummary,
  ExecutionValidationResult,
} from '@titan/execution';
import type { WorkflowDispatchResult } from '@titan/orchestrator';
import type { TitanShell } from '../index';

const EXECUTION_ENGINE_ID = 'execution-engine';

/**
 * Thin CLI-side adapter over the Execution Engine's already-public
 * methods: request shaping in, plain data out. No business logic lives
 * here — structural translation, validation, and summarization all stay
 * inside the engine. `cancelExecution` is deliberately not wrapped here:
 * it is a confirmed, unconditional `NotImplementedError` stub, and this
 * phase does not fabricate a working `task cancel` command around it.
 */
export class ExecutionServiceError extends Error {}

function getEngine(shell: TitanShell): ExecutionEngine {
  const engine = shell.registry.get(EXECUTION_ENGINE_ID);
  if (!engine || !(engine instanceof ExecutionEngine)) {
    throw new ExecutionServiceError('Execution Engine is not registered.');
  }
  return engine;
}

export async function executeDispatchItem(
  shell: TitanShell,
  dispatchResult: WorkflowDispatchResult,
  itemId: string,
): Promise<ExecutionRecord> {
  return getEngine(shell).execute({ dispatchResult, itemId });
}

export async function getExecutionStatus(
  shell: TitanShell,
  record: ExecutionRecord,
): Promise<ExecutionValidationResult> {
  return getEngine(shell).getExecutionStatus({ record });
}

export async function reportExecutionResult(
  shell: TitanShell,
  record: ExecutionRecord,
): Promise<ExecutionSummary> {
  return getEngine(shell).reportResult({ record });
}
