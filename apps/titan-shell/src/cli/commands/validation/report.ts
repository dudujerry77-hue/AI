import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const validationReportCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'report',
  usage: 'validation report',
  description: 'Re-display the current validation verdict (no engine call).',
  execute: (context: CommandContext): CommandResult => {
    const verdict = context.session.lastValidation;
    if (!verdict) {
      return {
        success: false,
        output: 'No validation yet. Run "validate" first.',
      };
    }

    const lines = [
      `Validation ${verdict.validationId} (status: ${verdict.status})`,
      `  Target: ${verdict.target.itemId}`,
      `  Checks: ${verdict.checks.length}`,
      `  Updated: ${verdict.updatedAt}`,
      ...verdict.checks.map(
        (check) =>
          `    - [${check.status}] ${check.checkType}: ${check.message}`,
      ),
    ];
    return { success: true, output: lines.join('\n'), data: verdict };
  },
};
