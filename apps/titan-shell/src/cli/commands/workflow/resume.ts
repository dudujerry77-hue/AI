import { resumeWorkflow } from '../../../services/orchestration-service';
import { summarizeWorkflow } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const workflowResumeCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'resume',
  usage: 'workflow resume',
  description: 'Transition the current workflow out of paused.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const workflow = context.session.lastWorkflow;
    if (!workflow) {
      return {
        success: false,
        output: 'No workflow yet. Run "workflow orchestrate" first.',
      };
    }

    try {
      const updated = await resumeWorkflow(context.shell, workflow);
      context.session.lastWorkflow = updated;
      return {
        success: true,
        output: summarizeWorkflow(updated),
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to resume workflow: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
