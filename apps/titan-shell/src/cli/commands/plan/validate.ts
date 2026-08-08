import {
  validatePlan,
  describePlanningError,
} from '../../../services/planning-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const planValidateCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'validate',
  usage: 'plan validate',
  description: 'Structurally validate the most recently created plan.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const plan = context.session.lastPlan;
    if (!plan) {
      return {
        success: false,
        output: 'No plan has been created yet. Run "plan create <goal>" first.',
      };
    }

    try {
      const result = await validatePlan(context.shell, plan);
      const lines = [
        `Plan ${result.planId}: ${result.valid ? 'valid' : 'invalid'}`,
        ...result.issues.map((issue) => `  - ${issue.message}`),
      ];
      return { success: result.valid, output: lines.join('\n'), data: result };
    } catch (error) {
      return {
        success: false,
        output: `Failed to validate plan: ${describePlanningError(error)}`,
      };
    }
  },
};
