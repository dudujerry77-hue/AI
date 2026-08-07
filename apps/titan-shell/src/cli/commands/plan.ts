import { randomUUID } from 'node:crypto';
import { PlannerEngine, PlanningValidationError } from '@titan/planner';
import type { Goal, Plan, PlanExplanation } from '@titan/planner';
import type {
  CommandContext,
  CommandDefinition,
  CommandResult,
} from '../types';

const PLANNER_ENGINE_ID = 'planner-engine';
const DEFAULT_USAGE = 'plan create <goal> | plan explain (also: "plan <goal>")';

/**
 * `PlannerEngine.createPlan()` requires a fully-formed `Goal`, not a plain
 * string (see engines/planner/src/models/types.ts). Builds one from free
 * text using documented, reasonable defaults — nothing here is inferred
 * or hidden from the caller.
 */
function buildGoal(text: string): Goal {
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

function summarizePlan(plan: Plan): string {
  const lines = [
    `Plan ${plan.planId} (status: ${plan.status})`,
    `  Steps: ${plan.steps.length}`,
    `  Tasks: ${plan.tasks.length}`,
    `  Dependencies: ${plan.dependencies.length}`,
    '',
    ...plan.steps.map((step) => `  - [${step.status}] ${step.title}`),
  ];
  return lines.join('\n');
}

function summarizeExplanation(explanation: PlanExplanation): string {
  const lines = [
    `Plan ${explanation.planId}`,
    explanation.summary,
    '',
    `Rationale: ${explanation.rationale}`,
  ];
  if (explanation.stepCount !== undefined) {
    lines.push(`Steps: ${explanation.stepCount}`);
  }
  if (explanation.taskCount !== undefined) {
    lines.push(`Tasks: ${explanation.taskCount}`);
  }
  if (explanation.executionOrder && explanation.executionOrder.length > 0) {
    lines.push(`Execution order: ${explanation.executionOrder.join(' -> ')}`);
  }
  return lines.join('\n');
}

function describeError(error: unknown): string {
  if (error instanceof PlanningValidationError) {
    const issues = error.issues.map((issue) => issue.message).join('; ');
    return issues.length > 0 ? `${error.message} (${issues})` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export const planCommand: CommandDefinition = {
  name: 'plan',
  usage: 'plan create <goal> | plan explain',
  description:
    'Create a plan from a goal via the Planner Engine, or explain the last one.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const engine = context.shell.registry.get(PLANNER_ENGINE_ID);
    if (!engine || !(engine instanceof PlannerEngine)) {
      return { output: 'Planner Engine is not registered.' };
    }

    const [first, ...rest] = context.args;

    if (first === 'explain') {
      const plan = context.session.lastPlan;
      if (!plan) {
        return {
          output:
            'No plan has been created yet. Run "plan create <goal>" first.',
        };
      }
      try {
        const explanation = await engine.explainPlan({ plan });
        return { output: summarizeExplanation(explanation) };
      } catch (error) {
        return { output: `Failed to explain plan: ${describeError(error)}` };
      }
    }

    // "plan create <goal>" and bare "plan <goal>" are equivalent shorthand.
    const goalText = (first === 'create' ? rest : context.args)
      .join(' ')
      .trim();
    if (goalText.length === 0) {
      return { output: `Usage: ${DEFAULT_USAGE}` };
    }

    try {
      const plan = await engine.createPlan({ goal: buildGoal(goalText) });
      context.session.lastPlan = plan;
      return { output: summarizePlan(plan) };
    } catch (error) {
      return { output: `Failed to create plan: ${describeError(error)}` };
    }
  },
};
