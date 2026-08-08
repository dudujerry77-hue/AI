import type { KnowledgeRecord } from '@titan/knowledge';

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
export function formatKnowledgeTable(
  records: readonly KnowledgeRecord[],
): string {
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

export function summarizeKnowledgeRecord(record: KnowledgeRecord) {
  return {
    recordId: record.recordId,
    category: record.category,
    title: record.title,
    authority: record.authority,
    status: record.approvalStatus,
  };
}
