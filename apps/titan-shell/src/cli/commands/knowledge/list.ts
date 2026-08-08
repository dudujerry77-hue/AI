import { listKnowledge } from '../../../services/knowledge-service';
import { formatKnowledgeTable, summarizeKnowledgeRecord } from './format';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const knowledgeListCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'list',
  usage: 'knowledge list',
  description: 'List a summary of every stored knowledge record.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    try {
      const records = await listKnowledge(context.shell);
      return {
        success: true,
        output: `${records.length} knowledge record(s):\n\n${formatKnowledgeTable(records)}`,
        data: records.map(summarizeKnowledgeRecord),
      };
    } catch (error) {
      context.logger.error('knowledge.list.failed', error);
      return {
        success: false,
        output: `Failed to list knowledge records: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
