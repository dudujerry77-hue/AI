import {
  explainPlan,
  describePlanningError,
} from '../../../services/planning-service';
import { summarizeExplanation } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const planExplainCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'explain',
  usage: 'plan explain',
  description: 'Explain the most recently created plan via the Planner Engine.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const plan = context.session.lastPlan;
    if (!plan) {
      return {
        success: false,
        output: 'No plan has been created yet. Run "plan create <goal>" first.',
      };
    }

    try {
      const explanation = await explainPlan(context.shell, plan);
      return {
        success: true,
        output: summarizeExplanation(explanation),
        data: explanation,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to explain plan: ${describePlanningError(error)}`,
      };
    }
  },
};
