import { OrchestratorEngine } from '@titan/orchestrator';
import type {
  Plan,
  Workflow,
  WorkflowDispatchResult,
  WorkflowSummary,
} from '@titan/orchestrator';
import type { TitanShell } from '../index';

const ORCHESTRATOR_ENGINE_ID = 'orchestrator-engine';

/**
 * Thin CLI-side adapter over the Orchestrator Engine's already-public
 * methods: request shaping in, plain data out. No business logic lives
 * here — workflow translation, status, lifecycle transitions, and
 * dispatch determination all stay inside the engine.
 */
export class OrchestrationServiceError extends Error {}

function getEngine(shell: TitanShell): OrchestratorEngine {
  const engine = shell.registry.get(ORCHESTRATOR_ENGINE_ID);
  if (!engine || !(engine instanceof OrchestratorEngine)) {
    throw new OrchestrationServiceError(
      'Orchestrator Engine is not registered.',
    );
  }
  return engine;
}

export async function orchestratePlan(
  shell: TitanShell,
  plan: Plan,
): Promise<Workflow> {
  return getEngine(shell).orchestrate({ plan });
}

export async function getWorkflowStatus(
  shell: TitanShell,
  workflow: Workflow,
): Promise<WorkflowSummary> {
  return getEngine(shell).getWorkflowStatus({ workflow });
}

export async function pauseWorkflow(
  shell: TitanShell,
  workflow: Workflow,
  reason?: string,
): Promise<Workflow> {
  return getEngine(shell).pauseWorkflow({ workflow, reason });
}

export async function resumeWorkflow(
  shell: TitanShell,
  workflow: Workflow,
): Promise<Workflow> {
  return getEngine(shell).resumeWorkflow({ workflow });
}

export async function cancelWorkflow(
  shell: TitanShell,
  workflow: Workflow,
  reason?: string,
): Promise<Workflow> {
  return getEngine(shell).cancelWorkflow({ workflow, reason });
}

export async function dispatchWorkflow(
  shell: TitanShell,
  workflow: Workflow,
): Promise<WorkflowDispatchResult> {
  return getEngine(shell).dispatchWorkflow({ workflow });
}
