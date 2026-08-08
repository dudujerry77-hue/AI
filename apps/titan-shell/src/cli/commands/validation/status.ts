import { getValidationStatus } from '../../../services/validation-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const validationStatusCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'status',
  usage: 'validation status',
  description: 'Structurally validate the current validation verdict.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const verdict = context.session.lastValidation;
    if (!verdict) {
      return {
        success: false,
        output: 'No validation yet. Run "validate" first.',
      };
    }

    try {
      const result = await getValidationStatus(context.shell, verdict);
      const lines = [
        `Validation ${result.validationId}: ${result.valid ? 'valid' : 'invalid'}`,
        ...result.issues.map((issue) => `  - ${issue.field}: ${issue.message}`),
      ];
      return { success: result.valid, output: lines.join('\n'), data: result };
    } catch (error) {
      return {
        success: false,
        output: `Failed to get validation status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
