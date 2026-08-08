import { exportKnowledge } from '../../../services/knowledge-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const knowledgeExportCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'export',
  usage: 'knowledge export [recordId ...]',
  description:
    'Export knowledge records as JSON (all records if none are named).',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    try {
      const json = await exportKnowledge(context.shell, context.args);
      return { success: true, output: json, data: JSON.parse(json) as unknown };
    } catch (error) {
      context.logger.error('knowledge.export.failed', error);
      return {
        success: false,
        output: `Failed to export knowledge records: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
