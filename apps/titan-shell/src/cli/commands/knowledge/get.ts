import { getKnowledgeRecord } from '../../../services/knowledge-service';
import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const knowledgeGetCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'get',
  usage: 'knowledge get <recordId>',
  description: 'Show a single knowledge record in full.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const [recordId] = context.args;
    if (!recordId) {
      return { success: false, output: 'Usage: knowledge get <recordId>' };
    }

    try {
      const record = await getKnowledgeRecord(context.shell, recordId);
      if (!record) {
        return {
          success: false,
          output: `No knowledge record found: ${recordId}`,
        };
      }

      const lines = [
        `Record ID: ${record.recordId}`,
        `Category: ${record.category}`,
        `Title: ${record.title}`,
        `Authority: ${record.authority}`,
        `Status: ${record.approvalStatus}`,
        `Version: ${record.version}`,
        `Updated: ${record.updatedAt}`,
        `Location: ${record.canonicalLocation}`,
        '',
        record.summary,
      ];
      return { success: true, output: lines.join('\n'), data: record };
    } catch (error) {
      context.logger.error('knowledge.get.failed', error);
      return {
        success: false,
        output: `Failed to load knowledge record: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
