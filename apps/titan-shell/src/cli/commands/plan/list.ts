import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const planListCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'list',
  usage: 'plan list',
  description:
    'List every plan created this session (session-local, not persisted).',
  execute: (context: CommandContext): CommandResult => {
    const { plans } = context.session;
    if (plans.length === 0) {
      return {
        success: true,
        output: '(no plans created this session)',
        data: [],
      };
    }

    const lines = plans.map(
      (plan) =>
        `  - ${plan.planId} (status: ${plan.status}, ${plan.steps.length} step(s))`,
    );
    return {
      success: true,
      output: `${plans.length} plan(s) this session:\n\n${lines.join('\n')}`,
      data: plans.map((plan) => ({ planId: plan.planId, status: plan.status })),
    };
  },
};
