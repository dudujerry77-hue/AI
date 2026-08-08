import { cancelWorkflow } from '../../../services/orchestration-service';
import { summarizeWorkflow } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const workflowCancelCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'cancel',
  usage: 'workflow cancel [reason ...]',
  description: 'Transition the current workflow to cancelled.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const workflow = context.session.lastWorkflow;
    if (!workflow) {
      return {
        success: false,
        output: 'No workflow yet. Run "workflow orchestrate" first.',
      };
    }

    const reason = context.args.join(' ').trim() || undefined;

    try {
      const updated = await cancelWorkflow(context.shell, workflow, reason);
      context.session.lastWorkflow = updated;
      return {
        success: true,
        output: summarizeWorkflow(updated),
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to cancel workflow: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
