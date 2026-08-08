import { getExecutionStatus } from '../../../services/execution-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const taskStatusCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'status',
  usage: 'task status',
  description: 'Structurally validate the current execution record.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const record = context.session.lastExecution;
    if (!record) {
      return {
        success: false,
        output: 'No execution yet. Run "task execute" first.',
      };
    }

    try {
      const result = await getExecutionStatus(context.shell, record);
      const lines = [
        `Execution ${result.executionId}: ${result.valid ? 'valid' : 'invalid'}`,
        ...result.issues.map((issue) => `  - ${issue.field}: ${issue.message}`),
      ];
      return { success: result.valid, output: lines.join('\n'), data: result };
    } catch (error) {
      return {
        success: false,
        output: `Failed to get execution status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
