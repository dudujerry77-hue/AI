import { orchestratePlan } from '../../../services/orchestration-service';
import { summarizeWorkflow } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const workflowOrchestrateCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'orchestrate',
  usage: 'workflow orchestrate',
  description:
    'Translate the last created plan into a workflow via the Orchestrator Engine.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const plan = context.session.lastPlan;
    if (!plan) {
      return {
        success: false,
        output: 'No plan has been created yet. Run "plan create <goal>" first.',
      };
    }

    try {
      const workflow = await orchestratePlan(context.shell, plan);
      context.session.lastWorkflow = workflow;
      return {
        success: true,
        output: summarizeWorkflow(workflow),
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to orchestrate workflow: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
