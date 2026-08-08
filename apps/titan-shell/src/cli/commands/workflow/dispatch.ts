import { dispatchWorkflow } from '../../../services/orchestration-service';
import { formatDispatchResult } from './summarize';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const workflowDispatchCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'dispatch',
  usage: 'workflow dispatch',
  description:
    'Compute dispatch-readiness and escalation decisions for the current workflow.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const workflow = context.session.lastWorkflow;
    if (!workflow) {
      return {
        success: false,
        output: 'No workflow yet. Run "workflow orchestrate" first.',
      };
    }

    try {
      const result = await dispatchWorkflow(context.shell, workflow);
      context.session.lastDispatch = result;
      return {
        success: true,
        output: formatDispatchResult(result),
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to dispatch workflow: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
