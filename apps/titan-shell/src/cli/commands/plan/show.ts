import { summarizePlan } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const planShowCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'show',
  usage: 'plan show',
  description: 'Re-display the most recently created plan (no engine call).',
  execute: (context: CommandContext): CommandResult => {
    const plan = context.session.lastPlan;
    if (!plan) {
      return {
        success: false,
        output: 'No plan has been created yet. Run "plan create <goal>" first.',
      };
    }
    return { success: true, output: summarizePlan(plan), data: plan };
  },
};
