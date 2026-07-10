import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  AuthorityManager,
  JsonLoader,
  KnowledgeCache,
  KnowledgeEngine,
  KnowledgeError,
  KnowledgeIndexer,
  KnowledgeRepository,
  KnowledgeSearch,
  KnowledgeStore,
  MarkdownLoader,
  Serializer,
  VersionManager,
  type KnowledgeRecord,
} from '../../engines/knowledge/src';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

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
        authority: 'user',
      }),
      '---',
      '# Preferred Review Style',
      '',
      'Use concise, evidence-first updates.',
      '',
    ].join('\n'),
  );
}

function createWriteProviders(allowed = true) {
  return {
    auditLogger: { log: vi.fn(async () => undefined) },
    authorizationProvider: {
      authorize: vi.fn(async () => ({ allowed, reason: allowed ? undefined : 'Denied by policy' })),
    },
  };
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

  it('increments semantic versions', () => {
    const versionManager = new VersionManager();
    expect(versionManager.nextVersion('1.0.0')).toBe('1.0.1');
    expect(versionManager.nextVersion(undefined)).toBe('1.0.0');
  });
});

describe('Knowledge Engine runtime and API compliance', () => {
  it('implements Titan engine lifecycle and metadata contract', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const engine = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
      ...createWriteProviders(true),
    });

    expect(engine.contractVersion()).toBe(ENGINE_API_CONTRACT_VERSION);
    expect(engine.metadata().id).toBe('knowledge-engine');
    expect(engine.getState()).toBe('created');

    await engine.initialize();
    expect(engine.getState()).toBe('initialized');

    await engine.start();
    expect(engine.getState()).toBe('running');

    const health = await engine.health();
    expect(health.status).toBe('healthy');
    expect(health.ready).toBe(true);

    await engine.stop();
    expect(engine.getState()).toBe('stopped');
    const stoppedHealth = await engine.health();
    expect(stoppedHealth.ready).toBe(false);
    expect(engine.version()).toBe('1.0.0');
  });
});

describe('Knowledge Engine integration', () => {
  it('loads repository-backed markdown and json knowledge records', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const engine = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
      ...createWriteProviders(true),
    });
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

  it('supports save/query/remove/archive/version operations', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const providers = createWriteProviders(true);
    const engine = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
      ...providers,
    });

    await engine.initialize();

    const added = await engine.add({
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

    const saved = await engine.save({
      ...added,
      body: 'Use concise, evidence-first feedback.',
      summary: 'Updated preference',
      updatedAt: new Date().toISOString(),
      checksum: 'ignore',
    });
    expect(saved.version).toBe('1.0.1');

    const queried = await engine.query({ category: 'user', tags: ['review'], archived: false });
    expect(queried.some((record) => record.recordId === saved.recordId)).toBe(true);

    const archived = await engine.archive(saved.recordId);
    expect(archived.archived).toBe(true);

    const removed = await engine.remove(saved.recordId);
    expect(removed.approvalStatus).toBe('removed');
    expect(removed.archived).toBe(true);

    const previousVersion = await engine.version(saved.recordId, '1.0.1');
    expect(previousVersion?.body).toContain('evidence-first');

    expect(providers.authorizationProvider.authorize).toHaveBeenCalled();
    expect(providers.auditLogger.log).toHaveBeenCalled();
  });

  it('rejects write operations without authorization or audit dependencies', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const engineWithoutSecurity = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
    });
    await engineWithoutSecurity.initialize();

    await expect(
      engineWithoutSecurity.add({
        kind: 'preference',
        category: 'user',
        title: 'Blocked Write',
        tags: ['review'],
        summary: 'Blocked write',
        body: 'Blocked write',
        securityClass: 'internal',
        source: 'user',
        author: 'developer-1',
        approvalStatus: 'approved',
        authority: 'user',
      }),
    ).rejects.toBeInstanceOf(KnowledgeError);
  });

  it('rejects authorization failures and logs denied write attempts', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const providers = createWriteProviders(false);
    const engine = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
      ...providers,
    });
    await engine.initialize();

    await expect(
      engine.add({
        kind: 'preference',
        category: 'user',
        title: 'Denied Write',
        tags: ['review'],
        summary: 'Denied write',
        body: 'Denied write',
        securityClass: 'internal',
        source: 'user',
        author: 'developer-1',
        approvalStatus: 'approved',
        authority: 'user',
      }),
    ).rejects.toBeInstanceOf(KnowledgeError);

    expect(providers.authorizationProvider.authorize).toHaveBeenCalled();
    expect(providers.auditLogger.log).toHaveBeenCalled();
  });

  it('enforces import security validation and classification rules', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const providers = createWriteProviders(true);
    const engine = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
      ...providers,
    });
    await engine.initialize();

    await expect(
      engine.import(
        JSON.stringify({
          records: [
            {
              recordId: 'security.bad-1',
              kind: 'policy',
              category: 'security',
              title: 'Bad Security Record',
              canonicalLocation: '/tmp/security.bad-1.json',
              tags: [],
              relationships: [],
              summary: 'bad',
              body: 'bad',
              bodyFormat: 'json',
              securityClass: 'invalid-class',
              source: 'import',
              version: '1.0.0',
              createdAt: '2026-07-10T00:00:00.000Z',
              updatedAt: '2026-07-10T00:00:00.000Z',
              author: 'tester',
              approvalStatus: 'approved',
              checksum: 'x',
              archived: false,
              authority: 'security',
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(KnowledgeError);

    expect(providers.authorizationProvider.authorize).toHaveBeenCalled();
    expect(providers.auditLogger.log).toHaveBeenCalled();
  });

  it('exports and imports validated records', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);
    const providers = createWriteProviders(true);

    const engine = new KnowledgeEngine({
      rootDir,
      actorId: 'developer-1',
      roles: ['Developer'],
      ...providers,
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

    const exported = await engine.export({ recordIds: [created.recordId] });

    const importRoot = await createRepositoryRoot();
    await seedRepository(importRoot);
    const importEngine = new KnowledgeEngine({
      rootDir: importRoot,
      actorId: 'developer-2',
      roles: ['Developer'],
      ...createWriteProviders(true),
    });
    await importEngine.initialize();

    const imported = await importEngine.import(exported);
    expect(imported.length).toBe(1);
    expect((await importEngine.search({ text: 'Review Preference' }))[0].recordId).toBe(created.recordId);
  });

  it('exposes repository, store, and read-model snapshot behavior', async () => {
    const rootDir = await createRepositoryRoot();
    await seedRepository(rootDir);

    const store = new KnowledgeStore({ rootDir });
    const repository = new KnowledgeRepository({ store });
    const snapshot = await repository.snapshot();

    expect(snapshot.records.length).toBeGreaterThan(0);
    expect(snapshot.generatedAt.length).toBeGreaterThan(0);
    expect(snapshot.records.every((record) => Object.isFrozen(record))).toBe(true);
  });
});
