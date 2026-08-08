import { searchKnowledge } from '../../../services/knowledge-service';
import { formatKnowledgeTable, summarizeKnowledgeRecord } from './format';
import type { FlagSpec } from '../../command-parser';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

const FLAGS: readonly FlagSpec[] = [
  { name: 'limit', type: 'number', alias: 'n' },
];

export const knowledgeSearchCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'search',
  usage: 'knowledge search <query> [--limit N]',
  description: 'Rank knowledge records by relevance to a text query.',
  flags: FLAGS,
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const text = context.args.join(' ').trim();
    const limit =
      typeof context.flags.limit === 'number' ? context.flags.limit : undefined;

    if (text.length === 0) {
      return {
        success: false,
        output: 'Usage: knowledge search <query> [--limit N]',
      };
    }

    try {
      const records = await searchKnowledge(context.shell, text, limit);
      return {
        success: true,
        output: `${records.length} matching record(s):\n\n${formatKnowledgeTable(records)}`,
        data: records.map(summarizeKnowledgeRecord),
      };
    } catch (error) {
      context.logger.error('knowledge.search.failed', error);
      return {
        success: false,
        output: `Failed to search knowledge records: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
