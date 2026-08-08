import type {
  Workflow,
  WorkflowDispatchResult,
  WorkflowSummary,
} from '@titan/orchestrator';

export function summarizeWorkflow(workflow: Workflow): string {
  return [
    `Workflow ${workflow.workflowId} (status: ${workflow.status})`,
    `  Steps: ${workflow.steps.length}`,
    `  Tasks: ${workflow.tasks.length}`,
  ].join('\n');
}

export function formatWorkflowSummary(summary: WorkflowSummary): string {
  return [
    `Workflow ${summary.workflowId} (status: ${summary.status})`,
    `  Steps: ${summary.completedSteps} completed, ${summary.runningSteps} running, ${summary.pendingSteps} pending, ${summary.failedSteps} failed, ${summary.cancelledSteps} cancelled (of ${summary.totalSteps})`,
    `  Tasks: ${summary.completedTasks} completed (of ${summary.totalTasks})`,
  ].join('\n');
}

export function formatDispatchResult(result: WorkflowDispatchResult): string {
  const lines = [
    `Workflow ${result.workflowId} dispatch:`,
    `  Dispatchable: ${result.dispatchable.length > 0 ? result.dispatchable.join(', ') : '(none)'}`,
    `  Decisions: ${result.decisions.length}`,
    `  Escalations: ${result.escalations.length}`,
  ];
  if (result.escalations.length > 0) {
    lines.push(
      ...result.escalations.map(
        (escalation) =>
          `    - ${escalation.itemId} (${escalation.itemType}): ${escalation.reason}`,
      ),
    );
  }
  return lines.join('\n');
}
