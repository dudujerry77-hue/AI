import { pauseWorkflow } from '../../../services/orchestration-service';
import { summarizeWorkflow } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const workflowPauseCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'pause',
  usage: 'workflow pause [reason ...]',
  description: 'Transition the current workflow to paused.',
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
      const updated = await pauseWorkflow(context.shell, workflow, reason);
      context.session.lastWorkflow = updated;
      return {
        success: true,
        output: summarizeWorkflow(updated),
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to pause workflow: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
