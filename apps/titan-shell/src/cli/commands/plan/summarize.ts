import type { Plan, PlanExplanation } from '@titan/planner';

export function summarizePlan(plan: Plan): string {
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

export function summarizeExplanation(explanation: PlanExplanation): string {
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
