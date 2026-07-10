import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  AuthorityManager,
  JsonLoader,
  KnowledgeCache,
  KnowledgeEngine,
  KnowledgeIndexer,
  KnowledgeRepository,
  KnowledgeSearch,
  KnowledgeStore,
  MarkdownLoader,
  Serializer,
  VersionManager,
  type KnowledgeRecord,
} from '../../engines/knowledge/src';

async function seedRepository(rootDir: string): Promise<void> {
  await mkdir(path.join(rootDir, '.titan', 'security'), { recursive: true });
  await mkdir(path.join(rootDir, '.titan', 'sessions'), { recursive: true });
  await mkdir(path.join(rootDir, '.titan', 'knowledge', 'records'), { recursive: true });

  await writeFile(
    path.join(rootDir, '.titan', 'constitution.md'),
    '# Titan Constitution\n\nTitan Core governs repository memory and governance continuity.',
  );
  await writeFile(
    path.join(rootDir, '.titan', 'architecture.md'),
    '# Architecture\n\nKnowledge Engine is the long-term memory layer for Titan Core.',
  );
  await writeFile(
    path.join(rootDir, '.titan', 'decisions.md'),
    '# Decisions\n\nADR-0007 approves the repository-canonical Knowledge Engine architecture.',
  );
  await writeFile(
    path.join(rootDir, '.titan', 'current_phase.md'),
    '# Current Phase\n\nPhase 007 is the Knowledge Engine implementation phase.',
  );
  await writeFile(
    path.join(rootDir, '.titan', 'project_state.json'),
    JSON.stringify({ project: { name: 'Titan AI' }, current_phase: { id: '006a' }, next_phase: { id: '007' } }, null, 2),
  );
  await writeFile(
    path.join(rootDir, '.titan', 'security', 'authorization.md'),
    '# Authorization\n\nOwner and Admin policies govern durable knowledge updates.',
  );
  await writeFile(
    path.join(rootDir, '.titan', 'sessions', '2026-07-08-0100-titan-core-architecture-approval.md'),
    '# Session\n\nArchitecture review noted knowledge retrieval requirements and design trade-offs.',
  );

  const writableKnowledgeDir = path.join(rootDir, '.titan', 'knowledge', 'records', 'user', 'preference-1');
  await mkdir(writableKnowledgeDir, { recursive: true });
  await writeFile(
    path.join(writableKnowledgeDir, '1.0.0.md'),
    [
      '---',
      JSON.stringify({
        recordId: 'user.preference-1',
        kind: 'preference',
        category: 'user',
        title: 'Preferred Review Style',
        canonicalLocation: path.join(writableKnowledgeDir, '1.0.0.md'),
        tags: ['review', 'style'],
        relationships: [],
        summary: 'Use concise, evidence-first updates.',
        bodyFormat: 'markdown',
        securityClass: 'internal',
        source: 'user',
        version: '1.0.0',
        createdAt: '2026-07-10T00:00:00.000Z',
        updatedAt: '2026-07-10T00:00:00.000Z',
        author: 'user-1',
        approvalStatus: 'approved',
        checksum: 'placeholder',
        archived: false,
      }),
      '---',
      '# Preferred Review Style',
      '',
      'Use concise, evidence-first updates.',
      '',
    ].join('\n'),
  );
}

async function createRepositoryRoot(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'titan-knowledge-'));
}

describe('Knowledge Engine components', () => {
  it('serializes and deserializes markdown and json knowledge records', () => {
    const markdownLoader = new MarkdownLoader();
    const jsonLoader = new JsonLoader();
    const serializer = new Serializer();

    const record: KnowledgeRecord = {
      recordId: 'record-1',
      kind: 'note',
      category: 'documentation',
      title: 'Knowledge Note',
      canonicalLocation: '/tmp/record-1.md',
      tags: ['titan', 'memory'],
      relationships: [{ type: 'references', target: 'record-0' }],
      summary: 'A durable knowledge note.',
      body: 'Body text.',
      bodyFormat: 'markdown',
      securityClass: 'internal',
      source: 'repository',
      version: '1.0.0',
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
      author: 'tester',
      approvalStatus: 'approved',
      checksum: 'checksum-1',
      archived: false,
      authority: 'documentation',
      metadata: { extra: true },
    };

    const markdown = serializer.serializeMarkdown(record);
    const parsedMarkdown = markdownLoader.loadFromText(markdown, '/tmp/record-1.md');
    expect(parsedMarkdown.recordId).toBe('record-1');
    expect(parsedMarkdown.body).toBe('Body text.');

    const json = serializer.serializeJson(record);
    const parsedJson = jsonLoader.loadFromText(json, '/tmp/record-1.json');
    expect(parsedJson.recordId).toBe('record-1');
    expect(parsedJson.metadata?.extra).toBe(true);
  });

  it('ranks governance above session history and supports cache and indexing', () => {
    const authority = new AuthorityManager();
    const cache = new KnowledgeCache();
    const indexer = new KnowledgeIndexer();
    const search = new KnowledgeSearch(authority);

    const governanceRecord = authority.freezeRecord({
      recordId: 'architecture-1',
      kind: 'policy',
      category: 'architecture',
      title: 'Architecture Memory',
      canonicalLocation: '/repo/.titan/architecture.md',
      tags: ['architecture'],
      relationships: [],
      summary: 'Architecture memory',
      body: 'Knowledge Engine architecture memory',
      bodyFormat: 'markdown',
      securityClass: 'internal',
      source: 'repository',
      version: '1.0.0',
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
      author: 'system',
      approvalStatus: 'approved',
      checksum: 'checksum-architecture',
      archived: false,
      authority: 'architecture',
      metadata: {},
    });

    const sessionRecord = authority.freezeRecord({
      recordId: 'session-1',
      kind: 'session',
      category: 'sessions',
      title: 'Session History',
      canonicalLocation: '/repo/.titan/sessions/session-1.md',
      tags: ['architecture'],
      relationships: [],
      summary: 'Session history',
      body: 'Architecture memory from a session note',
      bodyFormat: 'markdown',
      securityClass: 'internal',
      source: 'repository',
      version: '1.0.0',
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
      author: 'tester',
      approvalStatus: 'approved',
      checksum: 'checksum-session',
      archived: false,
      authority: 'session',
      metadata: {},
    });

    const snapshot = indexer.index([governanceRecord, sessionRecord]);
    expect(snapshot.byCategory.get('architecture')?.has('architecture-1')).toBe(true);
    expect(snapshot.byTag.get('architecture')?.has('session-1')).toBe(true);

    cache.set(governanceRecord);
    expect(cache.get('architecture-1')?.title).toBe('Architecture Memory');

    const ranked = search.rank('architecture memory', [sessionRecord, governanceRecord]);
    expect(ranked[0].recordId).toBe('architecture-1');
  });
});

describe('Knowledge Engine integration', () => {
  it('loads repository-backed markdown and json knowledge records', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const engine = new KnowledgeEngine({ rootDir, actorId: 'developer-1', roles: ['Developer'] });
    await engine.initialize();

    const searchResults = await engine.search({ text: 'Titan Core', limit: 5 });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].title.length).toBeGreaterThan(0);

    const projectState = await engine.load({ canonicalLocation: path.join(rootDir, '.titan', 'project_state.json') });
    expect(projectState.length).toBe(1);
    expect(projectState[0].category).toBe('project-state');

    const sessionRecord = await engine.load({ canonicalLocation: path.join(rootDir, '.titan', 'sessions', '2026-07-08-0100-titan-core-architecture-approval.md') });
    expect(sessionRecord[0].category).toBe('sessions');
  });

  it('supports safe updates, immutable governance records, versioning, snapshot export, and import', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const auditLogger = { log: vi.fn(async () => undefined) };
    const authorizationProvider = {
      authorize: vi.fn(async () => ({ allowed: true })),
    };

    const engine = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
      auditLogger,
      authorizationProvider,
    });

    await engine.initialize();

    const created = await engine.add({
      kind: 'preference',
      category: 'user',
      title: 'Review Preference',
      tags: ['review'],
      summary: 'Use concise feedback.',
      body: 'Use concise feedback.',
      securityClass: 'internal',
      source: 'user',
      author: 'developer-1',
      approvalStatus: 'approved',
      authority: 'user',
      metadata: { scope: 'default' },
    });

    expect(created.version).toBe('1.0.0');
    expect(Object.isFrozen(created)).toBe(true);

    const updated = await engine.update(created.recordId, { body: 'Use concise, evidence-first feedback.' });
    expect(updated.version).toBe('1.0.1');
    expect(updated.body).toContain('evidence-first');

    const previousVersion = await engine.version(created.recordId, '1.0.0');
    expect(previousVersion?.body).toBe('Use concise feedback.');

    const exported = await engine.export({ recordIds: [created.recordId] });
    expect(exported).toContain('Review Preference');

    const importRoot = await createRepositoryRoot();
    const importedEngine = new KnowledgeEngine({ rootDir: importRoot, actorId: 'developer-2', roles: ['Developer'] });
    await importedEngine.initialize();
    const imported = await importedEngine.import(exported);
    expect(imported.length).toBe(1);
    expect((await importedEngine.search({ text: 'Review Preference' }))[0].recordId).toBe(created.recordId);

    await expect(
      engine.update('constitution', { body: 'mutated constitution' }),
    ).rejects.toThrow();

    expect(auditLogger.log).toHaveBeenCalled();
    expect(authorizationProvider.authorize).toHaveBeenCalled();
  });

  it('exposes repository, store, and version-manager behavior without mutating unrelated runtime components', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const store = new KnowledgeStore({ rootDir });
    const repository = new KnowledgeRepository({ store });
    const snapshot = await repository.snapshot();

    expect(snapshot.records.length).toBeGreaterThan(0);
    expect(snapshot.generatedAt.length).toBeGreaterThan(0);

    const mutableRecord = snapshot.records.find((record) => record.category === 'user');
    expect(mutableRecord).toBeDefined();

    const versionManager = new VersionManager();
    expect(versionManager.nextVersion('1.0.0')).toBe('1.0.1');
    expect(versionManager.nextVersion(undefined)).toBe('1.0.0');
  });
});