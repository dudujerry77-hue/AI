import { KnowledgeEngine } from '@titan/knowledge';
import type { KnowledgeRecord } from '@titan/knowledge';
import type {
  CommandContext,
  CommandDefinition,
  CommandResult,
} from '../types';

const KNOWLEDGE_ENGINE_ID = 'knowledge-engine';
const TABLE_COLUMNS = [
  'Record ID',
  'Category',
  'Title',
  'Authority',
  'Status',
] as const;

function toRow(record: KnowledgeRecord): readonly string[] {
  return [
    record.recordId,
    record.category,
    record.title,
    record.authority,
    record.approvalStatus,
  ];
}

/** Presents a summarized table only — never the raw KnowledgeRecord objects. */
function formatTable(records: readonly KnowledgeRecord[]): string {
  if (records.length === 0) {
    return '(no knowledge records found)';
  }

  const rows = records.map(toRow);
  const widths = TABLE_COLUMNS.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => row[i].length)),
  );
  const formatRow = (cols: readonly string[]): string =>
    cols.map((cell, i) => cell.padEnd(widths[i])).join('  ');

  return [
    formatRow(TABLE_COLUMNS),
    widths.map((w) => '-'.repeat(w)).join('  '),
    ...rows.map(formatRow),
  ].join('\n');
}

export const knowledgeCommand: CommandDefinition = {
  name: 'knowledge',
  usage: 'knowledge list',
  description: 'List a summary of stored knowledge records.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const [subcommand] = context.args;
    if (subcommand && subcommand !== 'list') {
      return {
        output: `Unknown "knowledge" subcommand: ${subcommand}\nUsage: knowledge list`,
      };
    }

    const engine = context.shell.registry.get(KNOWLEDGE_ENGINE_ID);
    if (!engine || !(engine instanceof KnowledgeEngine)) {
      return { output: 'Knowledge Engine is not registered.' };
    }

    try {
      const records = await engine.query({});
      return {
        output: `${records.length} knowledge record(s):\n\n${formatTable(records)}`,
      };
    } catch (error) {
      context.logger.error('knowledge.list.failed', error);
      return {
        output: `Failed to query the Knowledge Engine: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
