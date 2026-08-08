import { getKnowledgeStatus } from '../../../services/knowledge-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const knowledgeStatusCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'status',
  usage: 'knowledge status',
  description: 'Show Knowledge Engine health and a per-category record count.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    try {
      const summary = await getKnowledgeStatus(context.shell);
      const categoryLines = Object.entries(summary.byCategory)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, count]) => `    - ${category}: ${count}`);

      const lines = [
        `Health: ${summary.health}`,
        `Total records: ${summary.totalRecords}`,
        'By category:',
        ...categoryLines,
      ];
      return { success: true, output: lines.join('\n'), data: summary };
    } catch (error) {
      context.logger.error('knowledge.status.failed', error);
      return {
        success: false,
        output: `Failed to read Knowledge Engine status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
