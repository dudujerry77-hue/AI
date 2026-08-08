import { getWorkflowStatus } from '../../../services/orchestration-service';
import { formatWorkflowSummary } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const workflowStatusCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'status',
  usage: 'workflow status',
  description: 'Show structural status for the current workflow.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const workflow = context.session.lastWorkflow;
    if (!workflow) {
      return {
        success: false,
        output: 'No workflow yet. Run "workflow orchestrate" first.',
      };
    }

    try {
      const summary = await getWorkflowStatus(context.shell, workflow);
      return {
        success: true,
        output: formatWorkflowSummary(summary),
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to get workflow status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
