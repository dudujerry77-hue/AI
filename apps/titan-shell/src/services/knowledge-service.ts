import { KnowledgeEngine } from '@titan/knowledge';
import type { KnowledgeRecord } from '@titan/knowledge';
import type { TitanShell } from '../index';

const KNOWLEDGE_ENGINE_ID = 'knowledge-engine';

/**
 * Thin CLI-side adapter over the Knowledge Engine's already-public
 * methods: request shaping in, plain data out. No business logic lives
 * here — validation, ranking, and storage all stay inside the engine.
 */
export class KnowledgeServiceError extends Error {}

function getEngine(shell: TitanShell): KnowledgeEngine {
  const engine = shell.registry.get(KNOWLEDGE_ENGINE_ID);
  if (!engine || !(engine instanceof KnowledgeEngine)) {
    throw new KnowledgeServiceError('Knowledge Engine is not registered.');
  }
  return engine;
}

export async function listKnowledge(
  shell: TitanShell,
): Promise<readonly KnowledgeRecord[]> {
  return getEngine(shell).query({});
}

export async function searchKnowledge(
  shell: TitanShell,
  text: string,
  limit?: number,
): Promise<readonly KnowledgeRecord[]> {
  if (text.trim().length === 0) {
    throw new KnowledgeServiceError('A search query is required.');
  }
  return getEngine(shell).search({ text, limit });
}

export async function getKnowledgeRecord(
  shell: TitanShell,
  recordId: string,
): Promise<KnowledgeRecord | undefined> {
  if (recordId.trim().length === 0) {
    throw new KnowledgeServiceError('A record ID is required.');
  }
  const [record] = await getEngine(shell).load({ recordId });
  return record;
}

export async function exportKnowledge(
  shell: TitanShell,
  recordIds?: readonly string[],
): Promise<string> {
  return getEngine(shell).export({
    recordIds: recordIds && recordIds.length > 0 ? recordIds : undefined,
  });
}

export interface KnowledgeStatusSummary {
  readonly health: string;
  readonly totalRecords: number;
  readonly byCategory: Readonly<Record<string, number>>;
}

export async function getKnowledgeStatus(
  shell: TitanShell,
): Promise<KnowledgeStatusSummary> {
  const engine = getEngine(shell);
  const [health, records] = await Promise.all([
    engine.health(),
    engine.query({}),
  ]);

  const byCategory: Record<string, number> = {};
  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] ?? 0) + 1;
  }

  return { health: health.status, totalRecords: records.length, byCategory };
}
