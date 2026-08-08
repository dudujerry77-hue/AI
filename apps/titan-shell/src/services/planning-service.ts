import { randomUUID } from 'node:crypto';
import { PlannerEngine, PlanningValidationError } from '@titan/planner';
import type {
  Goal,
  Plan,
  PlanExplanation,
  PlanValidationResult,
} from '@titan/planner';
import type { TitanShell } from '../index';

const PLANNER_ENGINE_ID = 'planner-engine';

/**
 * Thin CLI-side adapter over the Planner Engine's already-public methods:
 * request shaping in, plain data out. No business logic lives here — goal
 * decomposition, validation, and explanation all stay inside the engine.
 */
export class PlanningServiceError extends Error {}

function getEngine(shell: TitanShell): PlannerEngine {
  const engine = shell.registry.get(PLANNER_ENGINE_ID);
  if (!engine || !(engine instanceof PlannerEngine)) {
    throw new PlanningServiceError('Planner Engine is not registered.');
  }
  return engine;
}

/**
 * `PlannerEngine.createPlan()` requires a fully-formed `Goal`, not a plain
 * string (see engines/planner/src/models/types.ts). Builds one from free
 * text using documented, reasonable defaults — nothing here is inferred
 * or hidden from the caller.
 */
export function buildGoalFromText(text: string): Goal {
  const now = new Date().toISOString();
  return {
    goalId: `goal-${randomUUID()}`,
    title: text.length > 80 ? `${text.slice(0, 77)}...` : text,
    description: text,
    type: 'feature',
    priority: 'medium',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    tags: [],
  };
}

export async function createPlanFromGoal(
  shell: TitanShell,
  goal: Goal,
): Promise<Plan> {
  return getEngine(shell).createPlan({ goal });
}

export async function explainPlan(
  shell: TitanShell,
  plan: Plan,
): Promise<PlanExplanation> {
  return getEngine(shell).explainPlan({ plan });
}

export async function validatePlan(
  shell: TitanShell,
  plan: Plan,
): Promise<PlanValidationResult> {
  return getEngine(shell).validatePlan({ plan });
}

export function describePlanningError(error: unknown): string {
  if (error instanceof PlanningValidationError) {
    const issues = error.issues.map((issue) => issue.message).join('; ');
    return issues.length > 0 ? `${error.message} (${issues})` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
