import { reportExecutionResult } from '../../../services/execution-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

// Registered under both "result" and "output" (see ./index.ts) — same
// leaf, two names. Despite the underlying engine method's name
// (`reportResult`), it performs no real result reporting: it returns a
// structural summary of the ExecutionRecord already held in the session.
export const taskResultCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'result',
  usage: 'task result (alias: task output)',
  description: 'Show a structural summary of the current execution record.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const record = context.session.lastExecution;
    if (!record) {
      return {
        success: false,
        output: 'No execution yet. Run "task execute" first.',
      };
    }

    try {
      const summary = await reportExecutionResult(context.shell, record);
      const lines = [
        `Execution ${summary.executionId} (status: ${summary.status})`,
        `  Target: ${summary.target.itemId} (${summary.target.itemType})`,
        `  Created: ${summary.createdAt}`,
        `  Updated: ${summary.updatedAt}`,
      ];
      return { success: true, output: lines.join('\n'), data: summary };
    } catch (error) {
      return {
        success: false,
        output: `Failed to summarize execution result: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
