import { executeDispatchItem } from '../../../services/execution-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const taskExecuteCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'execute',
  usage: 'task execute [itemId]',
  description:
    'Structurally translate a dispatched workflow item into an execution record (defaults to the first dispatchable item).',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const dispatchResult = context.session.lastDispatch;
    if (!dispatchResult) {
      return {
        success: false,
        output: 'No dispatch result yet. Run "workflow dispatch" first.',
      };
    }

    const [requestedItemId] = context.args;
    const itemId = requestedItemId ?? dispatchResult.dispatchable[0];
    if (!itemId) {
      return {
        success: false,
        output: 'No dispatchable item ID given and none are dispatch-ready.',
      };
    }

    try {
      const record = await executeDispatchItem(
        context.shell,
        dispatchResult,
        itemId,
      );
      context.session.lastExecution = record;
      context.session.executions.push(record);
      const lines = [
        `Execution ${record.executionId} (status: ${record.status})`,
        `  Target: ${record.target.itemId} (${record.target.itemType})`,
      ];
      return { success: true, output: lines.join('\n'), data: record };
    } catch (error) {
      return {
        success: false,
        output: `Failed to execute item: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
