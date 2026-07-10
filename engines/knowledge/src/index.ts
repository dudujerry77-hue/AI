/**
 * Knowledge Engine module: repository-canonical durable memory with typed retrieval helpers.
 */

import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { EngineDependencies, EngineMetadata } from '../../../runtime/engine/types';
import { ENGINE_API_CONTRACT_VERSION } from '../../../runtime/engine/types';
import { ConfigurationService } from '../../../runtime/config/configuration-service';
import { ConfigurationError } from '../../../runtime/errors/errors';
import { EventBus, type EventPublishOptions } from '../../../runtime/events/event-bus';
import { HealthMonitor, type HealthSnapshot } from '../../../runtime/health/health-monitor';
import { LifecycleManager, type LifecycleState } from '../../../runtime/lifecycle/lifecycle-manager';
import { Logger } from '../../../runtime/logging/logger';
import { MetricsCollector } from '../../../runtime/metrics/metrics';

export type KnowledgeRole = 'owner' | 'admin' | 'developer' | 'reviewer' | 'guest' | 'ai-agent';

type EngineLifecycleState = LifecycleState;

type WriteAction = 'add' | 'update' | 'remove' | 'archive' | 'import' | 'save';

const ALLOWED_SECURITY_CLASSES = new Set(['public', 'internal', 'restricted', 'confidential']);

export interface KnowledgeRelationship {
  readonly type: string;
  readonly target: string;
}

export interface KnowledgeRecord {
  readonly recordId: string;
  readonly kind: string;
  readonly category: string;
  readonly title: string;
  readonly canonicalLocation: string;
  readonly tags: readonly string[];
  readonly relationships: readonly KnowledgeRelationship[];
  readonly summary: string;
  readonly body: string;
  readonly bodyFormat: 'markdown' | 'json' | 'text';
  readonly securityClass: string;
  readonly source: string;
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly author: string;
  readonly approvalStatus: string;
  readonly checksum: string;
  readonly archived: boolean;
  readonly authority: string;
  readonly metadata?: Record<string, unknown>;
}

export interface KnowledgeSnapshot {
  readonly generatedAt: string;
  readonly records: readonly KnowledgeRecord[];
}

export interface KnowledgeSearchQuery {
  readonly text: string;
  readonly limit?: number;
}

export interface KnowledgeLoadQuery {
  readonly recordId?: string;
  readonly canonicalLocation?: string;
}

export interface KnowledgeExportQuery {
  readonly recordIds?: readonly string[];
}

export interface KnowledgeQuery {
  readonly text?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly author?: string;
  readonly approvalStatus?: string;
  readonly authority?: string;
  readonly securityClass?: string;
  readonly archived?: boolean;
  readonly limit?: number;
}

export interface KnowledgeUpdatePatch {
  readonly kind?: string;
  readonly category?: string;
  readonly title?: string;
  readonly tags?: readonly string[];
  readonly relationships?: readonly KnowledgeRelationship[];
  readonly summary?: string;
  readonly body?: string;
  readonly bodyFormat?: 'markdown' | 'json' | 'text';
  readonly securityClass?: string;
  readonly source?: string;
  readonly author?: string;
  readonly approvalStatus?: string;
  readonly authority?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface KnowledgeCreateInput {
  readonly kind: string;
  readonly category: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly body: string;
  readonly securityClass: string;
  readonly source: string;
  readonly author: string;
  readonly approvalStatus: string;
  readonly authority?: string;
  readonly metadata?: Record<string, unknown>;
  readonly relationships?: readonly KnowledgeRelationship[];
  readonly canonicalLocation?: string;
}

export interface KnowledgeRepositoryOptions {
  readonly rootDir?: string;
  readonly store: KnowledgeStore;
}

export interface KnowledgeStoreOptions {
  readonly rootDir?: string;
}

export interface KnowledgeEngineOptions extends EngineDependencies {
  readonly rootDir: string;
  readonly actorId: string;
  readonly roles: readonly string[];
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
  readonly contractVersion?: string;
  readonly description?: string;
  readonly capabilities?: string[];
}

export class KnowledgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnowledgeError';
  }
}

function checksumFor(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function toIsoNow(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRole(role: string): KnowledgeRole | undefined {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'owner') return 'owner';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'developer') return 'developer';
  if (normalized === 'reviewer') return 'reviewer';
  if (normalized === 'guest') return 'guest';
  if (normalized === 'ai-agent' || normalized === 'ai agent') return 'ai-agent';
  return undefined;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new KnowledgeError(`Invalid ${field}: must be non-empty`);
  }
}

function deepFreezeRecord(record: KnowledgeRecord): KnowledgeRecord {
  const frozen: KnowledgeRecord = {
    ...record,
    tags: Object.freeze([...record.tags]),
    relationships: Object.freeze(record.relationships.map((entry) => Object.freeze({ ...entry }))),
    metadata: record.metadata ? Object.freeze({ ...record.metadata }) : undefined,
  };

  return Object.freeze(frozen);
}

function inferCategory(canonicalLocation: string): string {
  const normalizedPath = canonicalLocation.replace(/\\/g, '/').toLowerCase();
  if (normalizedPath.endsWith('/project_state.json')) return 'project-state';
  if (normalizedPath.includes('/.titan/sessions/')) return 'sessions';
  if (normalizedPath.includes('/.titan/security/')) return 'security';
  if (normalizedPath.endsWith('/constitution.md')) return 'governance';
  if (normalizedPath.endsWith('/architecture.md')) return 'architecture';
  if (normalizedPath.endsWith('/decisions.md')) return 'decisions';
  if (normalizedPath.endsWith('/current_phase.md')) return 'project-state';
  if (normalizedPath.includes('/.titan/knowledge/records/user/')) return 'user';
  if (normalizedPath.endsWith('.json')) return 'runtime';
  return 'documentation';
}

function inferAuthority(category: string, canonicalLocation: string): string {
  const normalizedPath = canonicalLocation.replace(/\\/g, '/').toLowerCase();
  if (normalizedPath.endsWith('/constitution.md')) return 'constitution';
  if (category === 'security') return 'security';
  if (category === 'architecture' || category === 'decisions') return 'architecture';
  if (category === 'governance' || category === 'project-state') return 'governance';
  if (category === 'sessions') return 'session';
  if (category === 'user') return 'user';
  return 'documentation';
}

function assertClassification(authority: string, category: string, securityClass: string): void {
  if (!ALLOWED_SECURITY_CLASSES.has(securityClass)) {
    throw new KnowledgeError(`Invalid securityClass: ${securityClass}`);
  }

  if (category === 'security' && authority !== 'security') {
    throw new KnowledgeError('Security category records must use security authority');
  }

  if ((category === 'architecture' || category === 'decisions') && authority !== 'architecture') {
    throw new KnowledgeError('Architecture and decisions records must use architecture authority');
  }

  if ((category === 'governance' || category === 'project-state') && authority !== 'governance' && authority !== 'constitution') {
    throw new KnowledgeError('Governance and project-state records must use governance or constitution authority');
  }
}

function isKnowledgeRecordCandidate(value: unknown): value is Partial<KnowledgeRecord> & { recordId: string } {
  return typeof value === 'object' && value !== null && 'recordId' in value;
}

function normalizeRecord(candidate: Partial<KnowledgeRecord> & { recordId: string }, canonicalLocation: string): KnowledgeRecord {
  const category = candidate.category ?? inferCategory(canonicalLocation);
  const body = candidate.body ?? '';
  const authority = candidate.authority ?? inferAuthority(category, canonicalLocation);

  const normalized: KnowledgeRecord = {
    recordId: candidate.recordId,
    kind: candidate.kind ?? 'document',
    category,
    title: candidate.title ?? candidate.recordId,
    canonicalLocation,
    tags: candidate.tags ?? [],
    relationships: candidate.relationships ?? [],
    summary: candidate.summary ?? '',
    body,
    bodyFormat: candidate.bodyFormat ?? 'markdown',
    securityClass: candidate.securityClass ?? 'internal',
    source: candidate.source ?? 'repository',
    version: candidate.version ?? '1.0.0',
    createdAt: candidate.createdAt ?? toIsoNow(),
    updatedAt: candidate.updatedAt ?? toIsoNow(),
    author: candidate.author ?? 'system',
    approvalStatus: candidate.approvalStatus ?? 'approved',
    checksum: candidate.checksum ?? checksumFor(body),
    archived: candidate.archived ?? false,
    authority,
    metadata: candidate.metadata,
  };

  assertNonEmpty(normalized.recordId, 'recordId');
  assertNonEmpty(normalized.kind, 'kind');
  assertNonEmpty(normalized.category, 'category');
  assertNonEmpty(normalized.title, 'title');
  assertNonEmpty(normalized.canonicalLocation, 'canonicalLocation');
  assertNonEmpty(normalized.summary, 'summary');
  assertNonEmpty(normalized.body, 'body');
  assertNonEmpty(normalized.source, 'source');
  assertNonEmpty(normalized.author, 'author');
  assertNonEmpty(normalized.approvalStatus, 'approvalStatus');
  assertClassification(normalized.authority, normalized.category, normalized.securityClass);

  if (!Array.isArray(normalized.tags) || !Array.isArray(normalized.relationships)) {
    throw new KnowledgeError('Invalid record: tags and relationships must be arrays');
  }

  return deepFreezeRecord(normalized);
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const pending: string[] = [rootDir];
  const files: string[] = [];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(nextPath);
      } else if (entry.isFile()) {
        files.push(nextPath);
      }
    }
  }

  return files;
}

export class Serializer {
  serializeMarkdown(record: KnowledgeRecord): string {
    const metadata = {
      ...record,
      body: undefined,
    };

    return ['---', JSON.stringify(metadata), '---', record.body, ''].join('\n');
  }

  serializeJson(record: KnowledgeRecord): string {
    return JSON.stringify(record, null, 2);
  }
}

export class MarkdownLoader {
  loadFromText(content: string, canonicalLocation: string): KnowledgeRecord {
    const trimmed = content.trimStart();
    if (!trimmed.startsWith('---\n')) {
      const recordId = slugify(path.basename(canonicalLocation, path.extname(canonicalLocation))) || randomUUID();
      const category = inferCategory(canonicalLocation);
      return normalizeRecord(
        {
          recordId,
          kind: 'markdown',
          category,
          title: path.basename(canonicalLocation),
          canonicalLocation,
          tags: [],
          relationships: [],
          summary: path.basename(canonicalLocation),
          body: content.trim(),
          bodyFormat: 'markdown',
          source: 'repository',
          author: 'system',
          approvalStatus: 'approved',
          archived: false,
          authority: inferAuthority(category, canonicalLocation),
        },
        canonicalLocation,
      );
    }

    const lines = trimmed.split('\n');
    const metadataLines: string[] = [];
    let cursor = 1;
    while (cursor < lines.length && lines[cursor] !== '---') {
      metadataLines.push(lines[cursor]);
      cursor += 1;
    }

    if (cursor >= lines.length) {
      throw new KnowledgeError(`Invalid markdown front matter: ${canonicalLocation}`);
    }

    const body = lines.slice(cursor + 1).join('\n').trim();
    let metadata: unknown;
    try {
      metadata = JSON.parse(metadataLines.join('\n'));
    } catch {
      throw new KnowledgeError(`Invalid markdown metadata JSON: ${canonicalLocation}`);
    }

    if (!isKnowledgeRecordCandidate(metadata)) {
      throw new KnowledgeError(`Markdown metadata missing recordId: ${canonicalLocation}`);
    }

    return normalizeRecord(
      {
        ...metadata,
        summary: typeof metadata.summary === 'string' ? metadata.summary : (metadata.title as string) ?? metadata.recordId,
        body,
        bodyFormat: 'markdown',
      },
      canonicalLocation,
    );
  }
}

export class JsonLoader {
  loadFromText(content: string, canonicalLocation: string): KnowledgeRecord {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new KnowledgeError(`Invalid JSON content: ${canonicalLocation}`);
    }

    if (isKnowledgeRecordCandidate(parsed)) {
      return normalizeRecord(
        {
          ...parsed,
          summary: typeof parsed.summary === 'string' ? parsed.summary : (parsed.title as string) ?? parsed.recordId,
          body:
            typeof parsed.body === 'string'
              ? parsed.body
              : JSON.stringify((parsed as Record<string, unknown>).body ?? '', null, 2),
          bodyFormat: 'json',
        },
        canonicalLocation,
      );
    }

    const category = inferCategory(canonicalLocation);
    const recordId = slugify(path.basename(canonicalLocation, '.json')) || randomUUID();
    return normalizeRecord(
      {
        recordId,
        kind: 'json',
        category,
        title: path.basename(canonicalLocation),
        canonicalLocation,
        tags: [],
        relationships: [],
        summary: path.basename(canonicalLocation),
        body: JSON.stringify(parsed, null, 2),
        bodyFormat: 'json',
        securityClass: 'internal',
        source: 'repository',
        author: 'system',
        approvalStatus: 'approved',
        archived: false,
        authority: inferAuthority(category, canonicalLocation),
        metadata: { raw: parsed as Record<string, unknown> },
      },
      canonicalLocation,
    );
  }
}

export class AuthorityManager {
  private readonly immutableAuthorities = new Set(['constitution']);

  freezeRecord(record: KnowledgeRecord): KnowledgeRecord {
    return deepFreezeRecord(record);
  }

  canWrite(roles: readonly string[], authority: string, category: string): boolean {
    const normalizedRoles = roles.map(normalizeRole).filter((role): role is KnowledgeRole => role !== undefined);
    if (normalizedRoles.includes('owner') || normalizedRoles.includes('admin')) {
      return true;
    }

    if (normalizedRoles.includes('guest')) {
      return false;
    }

    if (this.immutableAuthorities.has(authority)) {
      return false;
    }

    if (authority === 'governance' || authority === 'security' || authority === 'architecture') {
      return false;
    }

    return category === 'user' || category === 'documentation' || category === 'sessions' || category === 'runtime';
  }

  authorityRank(authority: string): number {
    if (authority === 'constitution') return 60;
    if (authority === 'security') return 55;
    if (authority === 'architecture') return 50;
    if (authority === 'governance') return 45;
    if (authority === 'project-state') return 40;
    if (authority === 'documentation') return 30;
    if (authority === 'session') return 20;
    return 10;
  }
}

export class KnowledgeCache {
  private readonly cache = new Map<string, KnowledgeRecord>();

  set(record: KnowledgeRecord): void {
    this.cache.set(record.recordId, deepFreezeRecord(record));
  }

  get(recordId: string): KnowledgeRecord | undefined {
    return this.cache.get(recordId);
  }
}

export interface KnowledgeIndexSnapshot {
  readonly byCategory: ReadonlyMap<string, ReadonlySet<string>>;
  readonly byTag: ReadonlyMap<string, ReadonlySet<string>>;
}

export class KnowledgeIndexer {
  index(records: readonly KnowledgeRecord[]): KnowledgeIndexSnapshot {
    const byCategory = new Map<string, Set<string>>();
    const byTag = new Map<string, Set<string>>();

    for (const record of records) {
      const categorySet = byCategory.get(record.category) ?? new Set<string>();
      categorySet.add(record.recordId);
      byCategory.set(record.category, categorySet);

      for (const tag of record.tags) {
        const tagSet = byTag.get(tag) ?? new Set<string>();
        tagSet.add(record.recordId);
        byTag.set(tag, tagSet);
      }
    }

    return {
      byCategory,
      byTag,
    };
  }
}

function scoreTextMatch(query: string, record: KnowledgeRecord): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;
  const title = record.title.toLowerCase();
  const body = record.body.toLowerCase();
  const tags = record.tags.map((value) => value.toLowerCase());

  if (title.includes(normalizedQuery)) {
    score += 40;
  }

  if (body.includes(normalizedQuery)) {
    score += 20;
  }

  for (const term of normalizedQuery.split(/\s+/).filter((term) => term.length > 0)) {
    if (title.includes(term)) {
      score += 6;
    }
    if (body.includes(term)) {
      score += 3;
    }
    if (tags.some((tag) => tag.includes(term))) {
      score += 8;
    }
  }

  return score;
}

export class KnowledgeSearch {
  constructor(private readonly authorityManager: AuthorityManager) {}

  rank(query: string, records: readonly KnowledgeRecord[]): KnowledgeRecord[] {
    return [...records]
      .map((record) => ({
        record,
        score: scoreTextMatch(query, record) + this.authorityManager.authorityRank(record.authority),
      }))
      .sort((left, right) => right.score - left.score || left.record.title.localeCompare(right.record.title))
      .map((entry) => entry.record);
  }
}

export class VersionManager {
  nextVersion(previousVersion: string | undefined): string {
    if (!previousVersion) {
      return '1.0.0';
    }

    const [major, minor, patch] = previousVersion.split('.').map((token) => Number.parseInt(token, 10));
    if ([major, minor, patch].some((value) => Number.isNaN(value))) {
      throw new KnowledgeError(`Invalid semantic version: ${previousVersion}`);
    }

    return `${major}.${minor}.${patch + 1}`;
  }
}

export class KnowledgeStore {
  readonly rootDir?: string;

  private readonly records = new Map<string, KnowledgeRecord>();
  private readonly versions = new Map<string, Map<string, KnowledgeRecord>>();

  constructor(options: KnowledgeStoreOptions = {}) {
    this.rootDir = options.rootDir;
  }

  upsert(record: KnowledgeRecord): KnowledgeRecord {
    const frozen = deepFreezeRecord(record);
    this.records.set(frozen.recordId, frozen);

    const versions = this.versions.get(frozen.recordId) ?? new Map<string, KnowledgeRecord>();
    versions.set(frozen.version, frozen);
    this.versions.set(frozen.recordId, versions);
    return frozen;
  }

  get(recordId: string): KnowledgeRecord | undefined {
    return this.records.get(recordId);
  }

  getVersion(recordId: string, version: string): KnowledgeRecord | undefined {
    return this.versions.get(recordId)?.get(version);
  }

  all(): KnowledgeRecord[] {
    return [...this.records.values()];
  }
}

export class KnowledgeRepository {
  private readonly markdownLoader = new MarkdownLoader();
  private readonly jsonLoader = new JsonLoader();

  private readonly rootDir?: string;

  constructor(private readonly options: KnowledgeRepositoryOptions) {
    this.rootDir = options.rootDir ?? options.store.rootDir;
  }

  async snapshot(): Promise<KnowledgeSnapshot> {
    if (this.rootDir) {
      await this.ingestFromFileSystem();
    }

    return Object.freeze({
      generatedAt: toIsoNow(),
      records: Object.freeze(this.options.store.all().map((record) => deepFreezeRecord(record))),
    });
  }

  private async ingestFromFileSystem(): Promise<void> {
    const titanRoot = path.join(this.rootDir as string, '.titan');
    let files: string[];
    let content: string;
    try {
      files = await walkFiles(titanRoot);
    } catch {
      return;
    }

    for (const file of files) {
      const extension = path.extname(file).toLowerCase();
      if (extension !== '.md' && extension !== '.json') {
        continue;
      }

      content = await readFile(file, 'utf8');
      const loaded = extension === '.md' ? this.markdownLoader.loadFromText(content, file) : this.jsonLoader.loadFromText(content, file);
      this.options.store.upsert(loaded);
    }
  }
}

export class KnowledgeEngine {
  private readonly authorityManager = new AuthorityManager();
  private readonly versionManager = new VersionManager();
  private readonly cache = new KnowledgeCache();
  private readonly searchService = new KnowledgeSearch(this.authorityManager);
  private readonly metadataValue: EngineMetadata;
  private readonly store: KnowledgeStore;
  private readonly repository: KnowledgeRepository;
  private readonly config: ConfigurationService;
  private readonly healthMonitor: HealthMonitor;
  private readonly eventBus: EventBus;
  private readonly lifecycleManager: LifecycleManager;
  private readonly logger: Logger;
  private readonly metrics: MetricsCollector;
  private readonly rootDir: string;

  private initialized = false;

  constructor(private readonly options: KnowledgeEngineOptions) {
    this.config = options.config ?? new ConfigurationService();

    this.rootDir = this.config.get<string>('knowledge.rootDir', options.rootDir) ?? options.rootDir;
    const engineId = this.config.get<string>('knowledge.id', options.id ?? 'knowledge-engine') ?? (options.id ?? 'knowledge-engine');
    const engineName =
      this.config.get<string>('knowledge.name', options.name ?? 'Knowledge Engine') ??
      (options.name ?? 'Knowledge Engine');
    const engineVersion = this.config.get<string>('knowledge.version', options.version ?? '1.0.0') ?? (options.version ?? '1.0.0');
    const engineContractVersion =
      this.config.get<string>('knowledge.contractVersion', options.contractVersion ?? ENGINE_API_CONTRACT_VERSION) ??
      (options.contractVersion ?? ENGINE_API_CONTRACT_VERSION);
    const engineDescription = this.config.get<string>('knowledge.description', options.description);
    const configuredCapabilities = this.config.get<string[]>('knowledge.capabilities', options.capabilities);

    this.store = new KnowledgeStore({ rootDir: this.rootDir });
    this.repository = new KnowledgeRepository({ store: this.store, rootDir: this.rootDir });
    this.healthMonitor = options.healthMonitor ?? new HealthMonitor();
    this.eventBus = options.eventBus ?? new EventBus();
    this.logger = options.logger ?? new Logger({ service: engineName.toLowerCase().replace(/\s+/g, '-') });
    this.lifecycleManager =
      options.lifecycleManager ??
      new LifecycleManager({
        eventBus: this.eventBus,
        logger: this.logger,
        supportedContractVersions: [engineContractVersion],
      });
    this.metrics = options.metrics instanceof MetricsCollector ? options.metrics : new MetricsCollector();
    this.healthMonitor.markDegraded('created');
    this.logger.info('knowledge.lifecycle.created', { state: 'created' });
    this.metadataValue = {
      id: engineId,
      name: engineName,
      version: engineVersion,
      contractVersion: engineContractVersion,
      description: engineDescription,
      capabilities: configuredCapabilities ?? ['knowledge.load', 'knowledge.search', 'knowledge.write'],
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const startedAt = Date.now();
    try {
      this.validateConfiguration();
      const repositoryLoadStartedAt = Date.now();
      await this.repository.snapshot();
      this.metrics.timer('knowledge.repository.load.duration_ms', Date.now() - repositoryLoadStartedAt);
      await this.lifecycleManager.initialize(this.metadataValue.contractVersion);
      this.initialized = true;
      this.healthMonitor.markHealthy('initialized');
      this.metrics.counter('knowledge.initialize.success').increment();
      this.metrics.timer('knowledge.initialize.duration_ms', Date.now() - startedAt);
      this.logger.info('knowledge.lifecycle.initialized', {
        state: 'initialized',
        durationMs: Date.now() - startedAt,
      });
      this.publishEvent('titan.engine.knowledge.initialize', {
        state: 'initialized',
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      this.lifecycleManager.markFailed(error instanceof Error ? error : new Error(String(error ?? 'unknown error')));
      this.healthMonitor.markFailed('initialization failed', error);
      this.metrics.counter('knowledge.initialize.failure').increment();
      this.metrics.timer('knowledge.initialize.duration_ms', Date.now() - startedAt);
      this.logger.error('knowledge.lifecycle.initialize.failed', {
        state: 'failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error ?? 'unknown error'),
      });
      this.logger.error('knowledge.repository.load.failed', {
        error: error instanceof Error ? error.message : String(error ?? 'unknown error'),
      });
      this.publishEvent('titan.engine.knowledge.failure', {
        phase: 'initialize',
        state: 'failed',
        error: error instanceof Error ? error.message : String(error ?? 'unknown error'),
      });
      throw error;
    }
  }

  private validateConfiguration(): void {
    if (typeof this.rootDir !== 'string' || this.rootDir.trim().length === 0) {
      const error = new ConfigurationError('Invalid required configuration value: knowledge.rootDir');
      this.logger.error('knowledge.configuration.invalid', {
        key: 'knowledge.rootDir',
        reason: 'must_be_non_empty_string',
      });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const currentState = this.lifecycleManager.getState();
    if (currentState === 'failed') {
      this.metrics.counter('knowledge.start.failure').increment();
      this.logger.error('knowledge.lifecycle.start.failed', {
        state: currentState,
        reason: 'failed_state',
      });
      this.publishEvent('titan.engine.knowledge.failure', {
        phase: 'start',
        state: currentState,
        reason: 'failed_state',
      });
      throw new KnowledgeError('Cannot start while engine is in failed state');
    }

    if (currentState === 'stopped') {
      await this.lifecycleManager.initialize(this.metadataValue.contractVersion);
    }
    await this.lifecycleManager.start();
    this.healthMonitor.markHealthy('running');
    this.metrics.counter('knowledge.start.success').increment();
    this.logger.info('knowledge.lifecycle.running', { state: 'running' });
    this.publishEvent('titan.engine.knowledge.start', { state: 'running' });
  }

  async stop(): Promise<void> {
    await this.lifecycleManager.stop();
    this.healthMonitor.markDegraded('stopped');
    this.logger.info('knowledge.lifecycle.stopped', { state: 'stopped' });
    this.publishEvent('titan.engine.knowledge.stop', { state: 'stopped' });
  }

  async health(): Promise<HealthSnapshot> {
    return this.healthMonitor.getSnapshot();
  }

  metadata(): EngineMetadata {
    return this.metadataValue;
  }

  contractVersion(): string {
    return this.metadataValue.contractVersion;
  }

  getState(): EngineLifecycleState {
    return this.lifecycleManager.getState();
  }

  version(): string;
  version(recordId: string, recordVersion: string): Promise<KnowledgeRecord | undefined>;
  version(recordId?: string, recordVersion?: string): string | Promise<KnowledgeRecord | undefined> {
    if (!recordId && !recordVersion) {
      return this.metadataValue.version;
    }

    if (!recordId || !recordVersion) {
      throw new KnowledgeError('version(recordId, recordVersion) requires both parameters');
    }

    return this.initialize().then(() => this.store.getVersion(recordId, recordVersion));
  }

  async load(query: KnowledgeLoadQuery): Promise<KnowledgeRecord[]> {
    await this.initialize();
    let result: KnowledgeRecord[];

    if (query.recordId) {
      const record = this.store.get(query.recordId);
      result = record ? [record] : [];
      this.publishEvent('titan.engine.knowledge.load', {
        query: {
          recordId: query.recordId,
          canonicalLocation: query.canonicalLocation,
        },
        resultCount: result.length,
      });
      return result;
    }

    if (query.canonicalLocation) {
      result = this.store.all().filter((record) => record.canonicalLocation === query.canonicalLocation);
      this.publishEvent('titan.engine.knowledge.load', {
        query: {
          recordId: query.recordId,
          canonicalLocation: query.canonicalLocation,
        },
        resultCount: result.length,
      });
      return result;
    }

    result = this.store.all();
    this.publishEvent('titan.engine.knowledge.load', {
      query: {
        recordId: query.recordId,
        canonicalLocation: query.canonicalLocation,
      },
      resultCount: result.length,
    });
    return result;
  }

  async search(query: KnowledgeSearchQuery): Promise<KnowledgeRecord[]> {
    await this.initialize();
    const startedAt = Date.now();
    const ranked = this.searchService.rank(query.text, this.store.all()).filter((record) => !record.archived);
    this.metrics.timer('knowledge.search.duration_ms', Date.now() - startedAt);
    this.publishEvent('titan.engine.knowledge.search', {
      query: { text: query.text, limit: query.limit },
      resultCount: ranked.length,
      durationMs: Date.now() - startedAt,
    });
    if (query.limit === undefined) {
      return ranked;
    }
    return ranked.slice(0, Math.max(query.limit, 0));
  }

  async query(criteria: KnowledgeQuery): Promise<KnowledgeRecord[]> {
    await this.initialize();
    const startedAt = Date.now();

    let records = this.store.all();
    if (criteria.category) {
      records = records.filter((record) => record.category === criteria.category);
    }
    if (criteria.author) {
      records = records.filter((record) => record.author === criteria.author);
    }
    if (criteria.approvalStatus) {
      records = records.filter((record) => record.approvalStatus === criteria.approvalStatus);
    }
    if (criteria.authority) {
      records = records.filter((record) => record.authority === criteria.authority);
    }
    if (criteria.securityClass) {
      records = records.filter((record) => record.securityClass === criteria.securityClass);
    }
    if (criteria.archived !== undefined) {
      records = records.filter((record) => record.archived === criteria.archived);
    }
    if (criteria.tags && criteria.tags.length > 0) {
      records = records.filter((record) => criteria.tags?.every((tag) => record.tags.includes(tag)));
    }

    if (criteria.text) {
      records = this.searchService.rank(criteria.text, records);
    }

    if (criteria.limit === undefined) {
      this.metrics.timer('knowledge.query.duration_ms', Date.now() - startedAt);
      this.publishEvent('titan.engine.knowledge.query', {
        criteria: {
          text: criteria.text,
          category: criteria.category,
          tags: criteria.tags,
          author: criteria.author,
          approvalStatus: criteria.approvalStatus,
          authority: criteria.authority,
          securityClass: criteria.securityClass,
          archived: criteria.archived,
          limit: criteria.limit,
        },
        resultCount: records.length,
        durationMs: Date.now() - startedAt,
      });
      return records;
    }

    this.metrics.timer('knowledge.query.duration_ms', Date.now() - startedAt);
    const sliced = records.slice(0, Math.max(criteria.limit, 0));
    this.publishEvent('titan.engine.knowledge.query', {
      criteria: {
        text: criteria.text,
        category: criteria.category,
        tags: criteria.tags,
        author: criteria.author,
        approvalStatus: criteria.approvalStatus,
        authority: criteria.authority,
        securityClass: criteria.securityClass,
        archived: criteria.archived,
        limit: criteria.limit,
      },
      resultCount: sliced.length,
      durationMs: Date.now() - startedAt,
    });
    return sliced;
  }

  async add(input: KnowledgeCreateInput): Promise<KnowledgeRecord> {
    await this.initialize();
    const authority = input.authority ?? inferAuthority(input.category, input.canonicalLocation ?? input.category);

    return this.executeWrite('add', input.category, async () => {
      this.validateCreateInput(input, authority);
      const recordId = `${slugify(input.category)}.${slugify(input.title)}.${randomUUID().slice(0, 8)}`;
      const now = toIsoNow();
      const canonicalLocation = input.canonicalLocation ?? path.join(this.options.rootDir, '.titan', 'knowledge', 'records', `${recordId}.md`);
      const record = normalizeRecord(
        {
          recordId,
          kind: input.kind,
          category: input.category,
          title: input.title,
          canonicalLocation,
          tags: input.tags,
          relationships: input.relationships ?? [],
          summary: input.summary,
          body: input.body,
          bodyFormat: 'markdown',
          securityClass: input.securityClass,
          source: input.source,
          version: '1.0.0',
          createdAt: now,
          updatedAt: now,
          author: input.author,
          approvalStatus: input.approvalStatus,
          checksum: checksumFor(input.body),
          archived: false,
          authority,
          metadata: input.metadata,
        },
        canonicalLocation,
      );

      return this.storeWrite(record);
    });
  }

  async save(record: KnowledgeRecord): Promise<KnowledgeRecord> {
    await this.initialize();

    return this.executeWrite('save', record.recordId, async () => {
      const existing = this.store.get(record.recordId);
      const authority = record.authority ?? inferAuthority(record.category, record.canonicalLocation);
      this.validateRecordForWrite(record, authority);

      const normalized = normalizeRecord(
        {
          ...record,
          version: this.versionManager.nextVersion(existing?.version),
          createdAt: existing?.createdAt ?? record.createdAt,
          updatedAt: toIsoNow(),
          checksum: checksumFor(record.body),
          authority,
        },
        record.canonicalLocation,
      );

      return this.storeWrite(normalized);
    });
  }

  async update(recordId: string, patch: KnowledgeUpdatePatch): Promise<KnowledgeRecord> {
    await this.initialize();
    const current = this.store.get(recordId);
    if (!current) {
      throw new KnowledgeError(`Record not found: ${recordId}`);
    }

    return this.executeWrite('update', recordId, async () => {
      const nextAuthority = patch.authority ?? current.authority;
      const nextCategory = patch.category ?? current.category;
      const nextSecurityClass = patch.securityClass ?? current.securityClass;
      this.assertWritable(nextAuthority, nextCategory);
      assertClassification(nextAuthority, nextCategory, nextSecurityClass);

      const updatedBody = patch.body ?? current.body;
      const updated = normalizeRecord(
        {
          ...current,
          ...patch,
          recordId: current.recordId,
          version: this.versionManager.nextVersion(current.version),
          updatedAt: toIsoNow(),
          checksum: checksumFor(updatedBody),
          authority: nextAuthority,
          category: nextCategory,
          securityClass: nextSecurityClass,
        },
        current.canonicalLocation,
      );

      return this.storeWrite(updated);
    });
  }

  async remove(recordId: string): Promise<KnowledgeRecord> {
    await this.initialize();
    const current = this.store.get(recordId);
    if (!current) {
      throw new KnowledgeError(`Record not found: ${recordId}`);
    }

    return this.executeWrite('remove', recordId, async () => {
      this.assertWritable(current.authority, current.category);
      const removed = normalizeRecord(
        {
          ...current,
          archived: true,
          approvalStatus: 'removed',
          version: this.versionManager.nextVersion(current.version),
          updatedAt: toIsoNow(),
        },
        current.canonicalLocation,
      );

      return this.storeWrite(removed);
    });
  }

  async archive(recordId: string): Promise<KnowledgeRecord> {
    await this.initialize();
    const current = this.store.get(recordId);
    if (!current) {
      throw new KnowledgeError(`Record not found: ${recordId}`);
    }

    return this.executeWrite('archive', recordId, async () => {
      this.assertWritable(current.authority, current.category);
      if (current.archived) {
        return current;
      }

      const archived = normalizeRecord(
        {
          ...current,
          archived: true,
          version: this.versionManager.nextVersion(current.version),
          updatedAt: toIsoNow(),
        },
        current.canonicalLocation,
      );

      return this.storeWrite(archived);
    });
  }

  async export(query: KnowledgeExportQuery): Promise<string> {
    await this.initialize();
    const startedAt = Date.now();
    const selected =
      query.recordIds && query.recordIds.length > 0
        ? this.store.all().filter((record) => query.recordIds?.includes(record.recordId))
        : this.store.all();

    this.metrics.counter('knowledge.export.success').increment();
    this.metrics.timer('knowledge.export.duration_ms', Date.now() - startedAt);
    this.publishEvent('titan.engine.knowledge.export', {
      query: { recordIds: query.recordIds },
      resultCount: selected.length,
      durationMs: Date.now() - startedAt,
    });

    return JSON.stringify({ records: selected }, null, 2);
  }

  async import(payload: string): Promise<KnowledgeRecord[]> {
    await this.initialize();

    return this.executeWrite('import', 'payload', async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        throw new KnowledgeError('Invalid import payload');
      }

      const records = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { records?: unknown[] }).records)
          ? (parsed as { records: unknown[] }).records
          : [];

      const imported: KnowledgeRecord[] = [];
      for (const candidate of records) {
        if (!isKnowledgeRecordCandidate(candidate)) {
          throw new KnowledgeError('Invalid import payload: each record must include recordId');
        }

        const category = candidate.category ?? inferCategory(candidate.canonicalLocation ?? '');
        const authority = candidate.authority ?? inferAuthority(category, candidate.canonicalLocation ?? '');
        const normalized = normalizeRecord(
          {
            ...candidate,
            category,
            authority,
          },
          candidate.canonicalLocation ?? path.join(this.options.rootDir, '.titan', 'knowledge', 'imported', `${candidate.recordId}.json`),
        );

        this.assertWritable(normalized.authority, normalized.category);
        imported.push(this.storeWrite(normalized));
      }

      return imported;
    });
  }

  private storeWrite(record: KnowledgeRecord): KnowledgeRecord {
    const saved = this.store.upsert(record);
    this.cache.set(saved);
    return saved;
  }

  private validateCreateInput(input: KnowledgeCreateInput, authority: string): void {
    assertNonEmpty(input.kind, 'kind');
    assertNonEmpty(input.category, 'category');
    assertNonEmpty(input.title, 'title');
    assertNonEmpty(input.summary, 'summary');
    assertNonEmpty(input.body, 'body');
    assertNonEmpty(input.source, 'source');
    assertNonEmpty(input.author, 'author');
    assertNonEmpty(input.approvalStatus, 'approvalStatus');
    if (!Array.isArray(input.tags)) {
      this.metrics.counter('knowledge.validation.failure').increment();
      throw new KnowledgeError('Invalid tags: must be an array');
    }

    this.assertWritable(authority, input.category);
    assertClassification(authority, input.category, input.securityClass);
  }

  private validateRecordForWrite(record: KnowledgeRecord, authority: string): void {
    assertNonEmpty(record.recordId, 'recordId');
    assertNonEmpty(record.kind, 'kind');
    assertNonEmpty(record.category, 'category');
    assertNonEmpty(record.title, 'title');
    assertNonEmpty(record.summary, 'summary');
    assertNonEmpty(record.body, 'body');
    assertNonEmpty(record.securityClass, 'securityClass');
    this.assertWritable(authority, record.category);
    assertClassification(authority, record.category, record.securityClass);
  }

  private assertWritable(authority: string, category: string): void {
    if (!this.authorityManager.canWrite(this.options.roles, authority, category)) {
      this.metrics.counter('knowledge.authorization.failure').increment();
      throw new KnowledgeError(`Write denied for authority=${authority} category=${category}`);
    }
  }

  private async executeWrite<T>(
    action: WriteAction,
    target: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const startedAt = Date.now();
    if (!this.options.authorizationProvider) {
      throw new KnowledgeError('Authorization provider is required for write operations');
    }
    if (!this.options.auditLogger) {
      throw new KnowledgeError('Audit logger is required for write operations');
    }

    try {
      await this.assertExternalAuthorization(action, target);
      const result = await Promise.resolve(fn());
      await this.logAudit(action, target, 'success');
      this.metrics.counter(`knowledge.${action}.success`).increment();
      this.metrics.timer(`knowledge.${action}.duration_ms`, Date.now() - startedAt);
      this.logger.info('knowledge.write.success', { action, target, durationMs: Date.now() - startedAt });
      this.publishEvent(`titan.engine.knowledge.${action}`, {
        action,
        target,
        result: 'success',
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const auditResult = error instanceof KnowledgeError && error.message.toLowerCase().includes('denied') ? 'denied' : 'failure';
      await this.logAudit(action, target, auditResult);
      this.metrics.counter(`knowledge.${action}.${auditResult}`).increment();
      this.metrics.timer(`knowledge.${action}.duration_ms`, Date.now() - startedAt);
      this.logger.error('knowledge.write.failure', {
        action,
        target,
        result: auditResult,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error ?? 'unknown error'),
      });
      this.publishEvent(`titan.engine.knowledge.${action}`, {
        action,
        target,
        result: auditResult,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error ?? 'unknown error'),
      });
      throw error;
    }
  }

  private async assertExternalAuthorization(action: string, resource: string): Promise<void> {
    const authorizationProvider = this.options.authorizationProvider;
    if (!authorizationProvider) {
      throw new KnowledgeError('Authorization provider is required for write operations');
    }

    const result = await authorizationProvider.authorize({
      actorId: this.options.actorId,
      roles: this.options.roles,
      resource,
      action,
    });

    if (!result.allowed) {
      this.metrics.counter('knowledge.authorization.failure').increment();
      this.logger.warn('knowledge.authorization.denied', {
        action,
        resource,
        reason: result.reason,
      });
      throw new KnowledgeError(result.reason ?? 'Authorization denied');
    }
  }

  private async logAudit(action: string, target: string, result: 'success' | 'failure' | 'denied'): Promise<void> {
    const auditLogger = this.options.auditLogger;
    if (!auditLogger) {
      throw new KnowledgeError('Audit logger is required for write operations');
    }

    await auditLogger.log({
      timestamp: toIsoNow(),
      actorId: this.options.actorId,
      action,
      target,
      result,
      correlationId: randomUUID(),
      metadata: {
        roles: [...this.options.roles],
      },
    });
  }

  private publishEvent(topic: string, payload: Record<string, unknown>, options: EventPublishOptions = {}): void {
    void this.eventBus
      .publish(topic, payload, {
        engineId: this.metadata().id,
        version: this.version(),
        timestamp: toIsoNow(),
        ...options,
      })
      .catch((error) => {
        this.logger.warn('knowledge.event.publish.failed', {
          topic,
          error: error instanceof Error ? error.message : String(error ?? 'unknown error'),
        });
      });
  }
}

export const knowledgeEngine = {
  name: 'knowledge' as const,
  description: 'Repository-canonical durable memory and retrieval engine for Titan AI.',
};
