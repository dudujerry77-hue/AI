import {
  buildGoalFromText,
  createPlanFromGoal,
  describePlanningError,
} from '../../../services/planning-service';
import { summarizePlan } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const planCreateCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'create',
  usage: 'plan create <goal>',
  description: 'Create a plan from a goal via the Planner Engine.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const goalText = context.args.join(' ').trim();
    if (goalText.length === 0) {
      return { success: false, output: 'Usage: plan create <goal>' };
    }

    try {
      const goal = buildGoalFromText(goalText);
      const plan = await createPlanFromGoal(context.shell, goal);
      context.session.lastGoal = goal;
      context.session.lastPlan = plan;
      context.session.plans.push(plan);
      return { success: true, output: summarizePlan(plan), data: plan };
    } catch (error) {
      return {
        success: false,
        output: `Failed to create plan: ${describePlanningError(error)}`,
      };
    }
  },
};
