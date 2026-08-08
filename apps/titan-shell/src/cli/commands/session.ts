import type { CommandContext, CommandLeaf, CommandResult } from '../types';

function presence(label: string, value: unknown): string {
  return `  ${label}: ${value === undefined ? '(not set)' : 'set'}`;
}

export const sessionCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'session',
  usage: 'session',
  description: 'Show this session’s lifecycle state and command history.',
  execute: (context: CommandContext): CommandResult => {
    const s = context.session;

    const lines = [
      `Plans created: ${s.plans.length}`,
      `Executions: ${s.executions.length}`,
      'Lifecycle chain:',
      presence('Goal', s.lastGoal),
      presence('Plan', s.lastPlan),
      presence('Workflow', s.lastWorkflow),
      presence('Dispatch', s.lastDispatch),
      presence('Execution', s.lastExecution),
      presence('Validation', s.lastValidation),
      presence('Learning', s.lastLearning),
      `Commands run: ${s.history.length}`,
      ...s.history
        .slice(-10)
        .map(
          (entry) =>
            `  - [${entry.success ? 'ok' : 'fail'}] ${entry.command} (${entry.timestamp})`,
        ),
    ];

    return {
      success: true,
      output: lines.join('\n'),
      data: {
        plansCreated: s.plans.length,
        chain: {
          goal: Boolean(s.lastGoal),
          plan: Boolean(s.lastPlan),
          workflow: Boolean(s.lastWorkflow),
          dispatch: Boolean(s.lastDispatch),
          execution: Boolean(s.lastExecution),
          validation: Boolean(s.lastValidation),
          learning: Boolean(s.lastLearning),
        },
        history: s.history,
      },
    };
  },
};
