import { validateExecutionRecord } from '../../services/validation-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../types';

export const validateCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'validate',
  usage: 'validate',
  description:
    'Run the Validation Engine against the current execution record.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const record = context.session.lastExecution;
    if (!record) {
      return {
        success: false,
        output: 'No execution yet. Run "task execute" first.',
      };
    }

    try {
      const result = await validateExecutionRecord(context.shell, record);
      context.session.lastValidation = result.verdict;
      const lines = [
        `Validation ${result.verdict.validationId}: ${result.verdict.status}`,
        `  Checks: ${result.verdict.checks.length}`,
        `  Evidence: ${result.evidence.length}`,
        `  Escalations: ${result.escalations.length}`,
      ];
      return {
        success: result.verdict.status === 'pass',
        output: lines.join('\n'),
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to run validation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
