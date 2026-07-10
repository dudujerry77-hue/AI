import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
  readonly body?: string;
  readonly bodyRef?: string;
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
  readonly authority?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly mutable?: boolean;
  readonly schemaVersion?: string;
  readonly score?: number;
}

export interface KnowledgeLoadRequest {
  readonly recordId?: string;
  readonly canonicalLocation?: string;
  readonly category?: string;
  readonly version?: string;
}

export interface KnowledgeSearchRequest {
  readonly text?: string;
  readonly tags?: readonly string[];
  readonly categories?: readonly string[];
  readonly limit?: number;
}

export interface KnowledgeExportRequest {
  readonly recordIds?: readonly string[];
}

export interface KnowledgeEngineOptions {
  readonly rootDir: string;
  readonly actorId: string;
  readonly roles: readonly string[];
  readonly auditLogger?: {
    log(entry: Record<string, unknown>): Promise<void> | void;
  };
  readonly authorizationProvider?: {
    authorize(request: Record<string, unknown>): Promise<{ allowed: boolean }> | { allowed: boolean };
  };
}

interface NormalizedRecordInput {
  recordId: string;
  kind: string;
  category: string;
  title: string;
  canonicalLocation: string;
  tags: readonly string[];
  relationships: readonly KnowledgeRelationship[];
  summary: string;
  body?: string;
  bodyRef?: string;
  bodyFormat: 'markdown' | 'json' | 'text';
  securityClass: string;
  source: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  approvalStatus: string;
  checksum: string;
  archived: boolean;
  authority?: string;
  metadata?: Readonly<Record<string, unknown>>;
  mutable?: boolean;
  schemaVersion?: string;
}

interface IndexSnapshot {
  readonly byCategory: Map<string, Set<string>>;
  readonly byTag: Map<string, Set<string>>;
  readonly byRecordId: Map<string, KnowledgeRecord>;
}

const ENGINE_VERSION = '0.1.0';
const ENGINE_CONTRACT_VERSION = '1.0.0';
const DEFAULT_SCHEMA_VERSION = '1.0.0';

const HIGH_AUTHORITY_CATEGORIES = new Set([
  'governance',
  'architecture',
  'decisions',
  'security',
  'project-state',
  'rules',
  'templates',
]);

function now(): string {
  return new Date().toISOString();
}

function cloneRecord(record: KnowledgeRecord): KnowledgeRecord {
  return Object.freeze({
    ...record,
    tags: [...record.tags],
    relationships: record.relationships.map((relationship) => ({ ...relationship })),
    metadata: record.metadata ? { ...record.metadata } : undefined,
  });
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '') || 'record';
}

function extensionForFormat(bodyFormat: KnowledgeRecord['bodyFormat']): string {
  return bodyFormat === 'json' ? '.json' : '.md';
}

function parseVersionParts(version: string): [number, number, number] {
  const [major = '0', minor = '0', patch = '0'] = version.split('.');
  return [Number(major) || 0, Number(minor) || 0, Number(patch) || 0];
}

function compareVersions(left: string, right: string): number {
  const [leftMajor, leftMinor, leftPatch] = parseVersionParts(left);
  const [rightMajor, rightMinor, rightPatch] = parseVersionParts(right);

  if (leftMajor !== rightMajor) {
    return leftMajor - rightMajor;
  }

  if (leftMinor !== rightMinor) {
    return leftMinor - rightMinor;
  }

  return leftPatch - rightPatch;
}

function deriveVersionFromLocation(canonicalLocation: string): string {
  const baseName = path.basename(canonicalLocation, path.extname(canonicalLocation));
  return /^\d+\.\d+\.\d+$/.test(baseName) ? baseName : DEFAULT_SCHEMA_VERSION;
}

function deriveRecordId(canonicalLocation: string): string {
  const segments = canonicalLocation.split(path.sep).filter(Boolean);
  const fileName = path.basename(canonicalLocation, path.extname(canonicalLocation));

  if (segments.includes('.titan')) {
    const titanIndex = segments.lastIndexOf('.titan');
    const relativeSegments = segments.slice(titanIndex + 1, -1);

    if (relativeSegments[0] === 'knowledge' && relativeSegments[1] === 'records') {
      const category = relativeSegments[2] ?? 'knowledge';
      const recordFolder = relativeSegments[3] ?? fileName;
      return `${category}.${recordFolder}`;
    }

    if (relativeSegments[0] === 'sessions') {
      return `session-${fileName}`;
    }

    if (relativeSegments[0] === 'security') {
      return fileName;
    }

    if (fileName === 'project_state') {
      return 'project-state';
    }

    if (fileName === 'current_phase') {
      return 'current-phase';
    }

    return fileName.replace(/_/g, '-');
  }

  return fileName.replace(/_/g, '-');
}

function deriveCategory(canonicalLocation: string): string {
  const normalized = canonicalLocation.split(path.sep).join('/');

  if (normalized.includes('/.titan/security/')) {
    return 'security';
  }

  if (normalized.includes('/.titan/sessions/')) {
    return 'sessions';
  }

  if (normalized.includes('/.titan/knowledge/records/')) {
    const match = normalized.match(/\.titan\/knowledge\/records\/([^/]+)/);
    return match?.[1] ?? 'knowledge';
  }

  if (normalized.endsWith('/.titan/project_state.json') || normalized.endsWith('/.titan/project_state')) {
    return 'project-state';
  }

  if (normalized.endsWith('/.titan/current_phase.md') || normalized.endsWith('/.titan/current_phase')) {
    return 'governance';
  }

  if (normalized.endsWith('/.titan/constitution.md')) {
    return 'governance';
  }

  if (normalized.endsWith('/.titan/architecture.md')) {
    return 'architecture';
  }

  if (normalized.endsWith('/.titan/decisions.md')) {
    return 'decisions';
  }

  return 'documentation';
}

function deriveAuthority(category: string): string {
  if (category === 'sessions') {
    return 'session';
  }

  if (category === 'project-state') {
    return 'project-state';
  }

  return category;
}

function deriveBodyFormat(canonicalLocation: string): KnowledgeRecord['bodyFormat'] {
  return path.extname(canonicalLocation).toLowerCase() === '.json' ? 'json' : 'markdown';
}

function firstHeading(text: string): string | undefined {
  const match = text.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function firstParagraph(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'));

  return lines[0] ?? '';
}

function normalizeRecord(input: Partial<KnowledgeRecord> & { canonicalLocation: string; category?: string; recordId?: string }): KnowledgeRecord {
  const category = input.category ?? deriveCategory(input.canonicalLocation);
  const recordId = input.recordId ?? deriveRecordId(input.canonicalLocation);
  const bodyFormat = input.bodyFormat ?? deriveBodyFormat(input.canonicalLocation);
  const version = input.version ?? DEFAULT_SCHEMA_VERSION;
  const createdAt = input.createdAt ?? now();
  const updatedAt = input.updatedAt ?? createdAt;

  return cloneRecord({
    recordId,
    kind: input.kind ?? 'note',
    category,
    title: input.title ?? recordId,
    canonicalLocation: input.canonicalLocation,
    tags: input.tags ?? [],
    relationships: input.relationships ?? [],
    summary: input.summary ?? input.title ?? recordId,
    body: input.body,
    bodyRef: input.bodyRef,
    bodyFormat,
    securityClass: input.securityClass ?? 'internal',
    source: input.source ?? 'repository',
    version,
    createdAt,
    updatedAt,
    author: input.author ?? 'system',
    approvalStatus: input.approvalStatus ?? 'approved',
    checksum: input.checksum ?? `${recordId}:${version}`,
    archived: input.archived ?? false,
    authority: input.authority ?? deriveAuthority(category),
    metadata: input.metadata ?? {},
    mutable: input.mutable ?? false,
    schemaVersion: input.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
    score: input.score,
  });
}

function parseFrontmatterMarkdown(text: string, canonicalLocation: string): KnowledgeRecord {
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (frontmatterMatch) {
    const rawFrontmatter = frontmatterMatch[1].trim();
    const body = frontmatterMatch[2].trimEnd();
    const metadata = JSON.parse(rawFrontmatter) as Partial<KnowledgeRecord>;

    return normalizeRecord({
      ...metadata,
      canonicalLocation,
      body: body.length > 0 ? body : undefined,
      bodyFormat: 'markdown',
      metadata: metadata.metadata ?? {},
      recordId: metadata.recordId,
      category: metadata.category,
      title: metadata.title,
      summary: metadata.summary,
    });
  }

  const title = firstHeading(text) ?? path.basename(canonicalLocation, path.extname(canonicalLocation));
  const summary = firstParagraph(text) || title;

  return normalizeRecord({
    canonicalLocation,
    title,
    summary,
    body: text.trimEnd(),
    bodyFormat: 'markdown',
  });
}

function parseJsonRecord(text: string, canonicalLocation: string): KnowledgeRecord {
  const parsed = JSON.parse(text) as Record<string, unknown>;

  if ('project' in parsed || 'current_phase' in parsed || 'next_phase' in parsed) {
    return normalizeRecord({
      canonicalLocation,
      recordId: 'project-state',
      category: 'project-state',
      title: 'Project State',
      summary: 'Machine-readable project state snapshot.',
      body: JSON.stringify(parsed, null, 2),
      bodyFormat: 'json',
      metadata: parsed,
      source: 'repository',
      authority: 'project-state',
    });
  }

  return normalizeRecord({
    canonicalLocation,
    title: String(parsed.title ?? path.basename(canonicalLocation, path.extname(canonicalLocation))),
    summary: String(parsed.summary ?? ''),
    body: JSON.stringify(parsed, null, 2),
    bodyFormat: 'json',
    metadata: (parsed.metadata as Record<string, unknown> | undefined) ?? parsed,
    recordId: String(parsed.recordId ?? deriveRecordId(canonicalLocation)),
    category: String(parsed.category ?? deriveCategory(canonicalLocation)),
    source: String(parsed.source ?? 'repository'),
    authority: String(parsed.authority ?? deriveAuthority(deriveCategory(canonicalLocation))),
  });
}

async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

async function listFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      results.push(entryPath);
    }
  }

  await walk(rootDir);
  return results;
}

export class Serializer {
  serializeMarkdown(record: KnowledgeRecord): string {
    const payload = {
      recordId: record.recordId,
      kind: record.kind,
      category: record.category,
      title: record.title,
      canonicalLocation: record.canonicalLocation,
      tags: [...record.tags],
      relationships: [...record.relationships],
      summary: record.summary,
      bodyFormat: record.bodyFormat,
      securityClass: record.securityClass,
      source: record.source,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      author: record.author,
      approvalStatus: record.approvalStatus,
      checksum: record.checksum,
      archived: record.archived,
      authority: record.authority,
      metadata: record.metadata ?? {},
      mutable: record.mutable ?? false,
      schemaVersion: record.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
    };

    return `---\n${JSON.stringify(payload, null, 2)}\n---\n${record.body ?? record.bodyRef ?? record.summary}\n`;
  }

  serializeJson(record: KnowledgeRecord): string {
    return JSON.stringify(record, null, 2);
  }
}

export class MarkdownLoader {
  loadFromText(text: string, canonicalLocation: string): KnowledgeRecord {
    return parseFrontmatterMarkdown(text, canonicalLocation);
  }
}

export class JsonLoader {
  loadFromText(text: string, canonicalLocation: string): KnowledgeRecord {
    return parseJsonRecord(text, canonicalLocation);
  }
}

export class KnowledgeCache {
  private readonly records = new Map<string, KnowledgeRecord>();

  set(record: KnowledgeRecord): void {
    this.records.set(record.recordId, cloneRecord(record));
  }

  get(recordId: string): KnowledgeRecord | undefined {
    const record = this.records.get(recordId);
    return record ? cloneRecord(record) : undefined;
  }

  values(): KnowledgeRecord[] {
    return [...this.records.values()].map((record) => cloneRecord(record));
  }

  clear(): void {
    this.records.clear();
  }
}

export class VersionManager {
  nextVersion(current?: string): string {
    if (!current) {
      return DEFAULT_SCHEMA_VERSION;
    }

    const [major, minor, patch] = parseVersionParts(current);
    return `${major}.${minor}.${patch + 1}`;
  }

  compare(left: string, right: string): number {
    return compareVersions(left, right);
  }
}

export class AuthorityManager {
  private readonly categoryPriority = new Map<string, number>([
    ['governance', 100],
    ['security', 95],
    ['architecture', 90],
    ['decisions', 85],
    ['project-state', 80],
    ['rules', 75],
    ['templates', 70],
    ['documentation', 60],
    ['sessions', 50],
    ['user', 45],
    ['history', 30],
  ]);

  freezeRecord(record: KnowledgeRecord): KnowledgeRecord {
    return cloneRecord({
      ...record,
      mutable: record.mutable ?? false,
      authority: record.authority ?? deriveAuthority(record.category),
      schemaVersion: record.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
    });
  }

  isImmutable(record: KnowledgeRecord): boolean {
    return !record.mutable || HIGH_AUTHORITY_CATEGORIES.has(record.category);
  }

  rank(record: KnowledgeRecord): number {
    return this.categoryPriority.get(record.category) ?? 0;
  }
}

export class KnowledgeIndexer {
  index(records: readonly KnowledgeRecord[]): IndexSnapshot {
    const byCategory = new Map<string, Set<string>>();
    const byTag = new Map<string, Set<string>>();
    const byRecordId = new Map<string, KnowledgeRecord>();

    for (const record of records) {
      byRecordId.set(record.recordId, cloneRecord(record));

      if (!byCategory.has(record.category)) {
        byCategory.set(record.category, new Set<string>());
      }

      byCategory.get(record.category)?.add(record.recordId);

      for (const tag of record.tags) {
        if (!byTag.has(tag)) {
          byTag.set(tag, new Set<string>());
        }

        byTag.get(tag)?.add(record.recordId);
      }
    }

    return {
      byCategory,
      byTag,
      byRecordId,
    };
  }
}

export class KnowledgeSearch {
  constructor(private readonly authorityManager: AuthorityManager = new AuthorityManager()) {}

  rank(text: string, records: readonly KnowledgeRecord[]): KnowledgeRecord[] {
    const terms = normalizeText(text).split(' ').filter(Boolean);

    return [...records]
      .map((record) => {
        const haystack = normalizeText([
          record.recordId,
          record.kind,
          record.category,
          record.title,
          record.summary,
          record.body ?? '',
          record.authority ?? '',
          ...(record.tags ?? []),
        ].join(' '));

        let score = this.authorityManager.rank(record);

        for (const term of terms) {
          if (!term) {
            continue;
          }

          if (haystack.includes(term)) {
            score += 10;
          }

          if (normalizeText(record.title).includes(term)) {
            score += 15;
          }

          if (normalizeText(record.summary).includes(term)) {
            score += 8;
          }

          if (record.tags.some((tag) => normalizeText(tag).includes(term))) {
            score += 7;
          }
        }

        if (record.approvalStatus === 'approved') {
          score += 5;
        }

        if (!record.archived) {
          score += 2;
        }

        return { ...record, score };
      })
      .sort((left, right) => {
        const scoreDifference = (right.score ?? 0) - (left.score ?? 0);
        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return compareVersions(right.version, left.version);
      })
      .map((record) => cloneRecord(record));
  }
}

export class KnowledgeStore {
  readonly rootDir: string;
  private readonly markdownLoader = new MarkdownLoader();
  private readonly jsonLoader = new JsonLoader();
  private readonly serializer = new Serializer();

  constructor(options: { rootDir: string }) {
    this.rootDir = options.rootDir;
  }

  private get knowledgeRoot(): string {
    return path.join(this.rootDir, '.titan');
  }

  pathForRecord(record: KnowledgeRecord): string {
    return path.join(this.knowledgeRoot, 'knowledge', 'records', record.category, slugify(record.recordId), `${record.version}${extensionForFormat(record.bodyFormat)}`);
  }

  async readRecord(filePath: string): Promise<KnowledgeRecord | null> {
    try {
      const content = await readTextFile(filePath);
      return path.extname(filePath).toLowerCase() === '.json'
        ? this.jsonLoader.loadFromText(content, filePath)
        : this.markdownLoader.loadFromText(content, filePath);
    } catch {
      return null;
    }
  }

  async readAllRecords(): Promise<KnowledgeRecord[]> {
    if (!(await this.exists(this.knowledgeRoot))) {
      return [];
    }

    const files = await listFiles(this.knowledgeRoot);
    const latestById = new Map<string, KnowledgeRecord>();

    for (const filePath of files) {
      if (!['.md', '.json'].includes(path.extname(filePath).toLowerCase())) {
        continue;
      }

      const record = await this.readRecord(filePath);
      if (!record) {
        continue;
      }

      const existing = latestById.get(record.recordId);
      if (!existing || compareVersions(record.version, existing.version) >= 0) {
        latestById.set(record.recordId, record);
      }
    }

    return [...latestById.values()].map((record) => cloneRecord(record));
  }

  async readVersions(recordId: string): Promise<KnowledgeRecord[]> {
    if (!(await this.exists(this.knowledgeRoot))) {
      return [];
    }

    const files = await listFiles(this.knowledgeRoot);
    const versions: KnowledgeRecord[] = [];

    for (const filePath of files) {
      if (!['.md', '.json'].includes(path.extname(filePath).toLowerCase())) {
        continue;
      }

      const record = await this.readRecord(filePath);
      if (record?.recordId === recordId) {
        versions.push(record);
      }
    }

    return versions.sort((left, right) => compareVersions(left.version, right.version)).map((record) => cloneRecord(record));
  }

  async findByLocation(canonicalLocation: string): Promise<KnowledgeRecord | null> {
    return this.readRecord(canonicalLocation);
  }

  async writeRecord(record: KnowledgeRecord): Promise<KnowledgeRecord> {
    const location = this.pathForRecord(record);
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, record.bodyFormat === 'json' ? this.serializer.serializeJson(record) : this.serializer.serializeMarkdown(record), 'utf8');
    return cloneRecord({ ...record, canonicalLocation: location });
  }

  async exists(targetPath: string): Promise<boolean> {
    try {
      await stat(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}

export class KnowledgeRepository {
  constructor(private readonly options: { store: KnowledgeStore }) {}

  async snapshot(): Promise<{ records: KnowledgeRecord[]; generatedAt: string }> {
    const records = await this.options.store.readAllRecords();
    return {
      records,
      generatedAt: now(),
    };
  }
}

export class KnowledgeEngine {
  readonly options: KnowledgeEngineOptions;
  private readonly store: KnowledgeStore;
  private readonly repository: KnowledgeRepository;
  private readonly cache = new KnowledgeCache();
  private readonly indexer = new KnowledgeIndexer();
  private readonly searcher = new KnowledgeSearch();
  private readonly authorityManager = new AuthorityManager();
  private readonly versionManager = new VersionManager();
  private readonly versions = new Map<string, Map<string, KnowledgeRecord>>();
  private indexSnapshot: IndexSnapshot = {
    byCategory: new Map<string, Set<string>>(),
    byTag: new Map<string, Set<string>>(),
    byRecordId: new Map<string, KnowledgeRecord>(),
  };
  private initialized = false;

  constructor(options: KnowledgeEngineOptions) {
    this.options = options;
    this.store = new KnowledgeStore({ rootDir: options.rootDir });
    this.repository = new KnowledgeRepository({ store: this.store });
  }

  metadata(): Record<string, unknown> {
    return {
      name: 'knowledge',
      description: 'Repository-backed durable knowledge engine.',
      engineVersion: ENGINE_VERSION,
      contractVersion: ENGINE_CONTRACT_VERSION,
    };
  }

  contractVersion(): string {
    return ENGINE_CONTRACT_VERSION;
  }

  version(): string;
  version(recordId: string, selector?: string): Promise<KnowledgeRecord | null>;
  version(recordId?: string, selector?: string): string | Promise<KnowledgeRecord | null> {
    if (recordId === undefined) {
      return ENGINE_VERSION;
    }

    const requestedVersion = selector;
    return this.getVersion(recordId, requestedVersion);
  }

  health(): Record<string, unknown> {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      recordCount: this.cache.values().length,
    };
  }

  async initialize(): Promise<void> {
    const snapshot = await this.repository.snapshot();
    this.cache.clear();
    this.versions.clear();

    for (const record of snapshot.records) {
      const frozen = this.authorityManager.freezeRecord(record);
      this.cache.set(frozen);
      this.trackVersion(frozen);
    }

    this.indexSnapshot = this.indexer.index(this.cache.values());
    this.initialized = true;
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async stop(): Promise<void> {
    return undefined;
  }

  async load(request: KnowledgeLoadRequest): Promise<KnowledgeRecord[]> {
    if (request.canonicalLocation) {
      const record = await this.store.findByLocation(request.canonicalLocation);
      return record ? [this.authorityManager.freezeRecord(record)] : [];
    }

    const values = this.cache.values();

    return values.filter((record) => {
      if (request.recordId && record.recordId !== request.recordId) {
        return false;
      }

      if (request.category && record.category !== request.category) {
        return false;
      }

      if (request.version && record.version !== request.version) {
        return false;
      }

      return true;
    });
  }

  async search(request: KnowledgeSearchRequest): Promise<KnowledgeRecord[]> {
    const candidates = this.cache.values().filter((record) => {
      if (request.categories && request.categories.length > 0 && !request.categories.includes(record.category)) {
        return false;
      }

      if (request.tags && request.tags.length > 0 && !request.tags.every((tag) => record.tags.includes(tag))) {
        return false;
      }

      return true;
    });

    const ranked = request.text ? this.searcher.rank(request.text, candidates) : candidates;
    return ranked.slice(0, request.limit ?? 25).map((record) => cloneRecord(record));
  }

  async query(expression: string | KnowledgeSearchRequest): Promise<KnowledgeRecord[]> {
    if (typeof expression === 'string') {
      return this.search({ text: expression });
    }

    return this.search(expression);
  }

  async save(record: Partial<KnowledgeRecord> & { body?: string; canonicalLocation?: string; recordId?: string; category?: string }): Promise<KnowledgeRecord> {
    const normalized = normalizeRecord({
      ...record,
      canonicalLocation: record.canonicalLocation ?? this.store.pathForRecord(normalizeRecord({
        canonicalLocation: path.join(this.options.rootDir, '.titan', 'knowledge', 'records', record.category ?? 'knowledge', slugify(record.recordId ?? record.title ?? 'record'), `${record.version ?? DEFAULT_SCHEMA_VERSION}${extensionForFormat(record.bodyFormat ?? 'markdown')}`),
        recordId: record.recordId,
        category: record.category,
        title: record.title,
        version: record.version,
      })),
      mutable: record.mutable ?? true,
    });

    const allowed = await this.authorize('save', normalized);
    if (!allowed) {
      throw new Error('Knowledge write denied.');
    }

    const written = await this.store.writeRecord(normalized);
    this.cache.set(written);
    this.trackVersion(written);
    this.indexSnapshot = this.indexer.index(this.cache.values());
    await this.audit('save', written.recordId, 'success');
    return written;
  }

  async add(record: Partial<KnowledgeRecord> & { body?: string; title: string; category: string }): Promise<KnowledgeRecord> {
    const recordId = record.recordId ?? slugify(record.title);
    const canonicalLocation = record.canonicalLocation ?? path.join(
      this.options.rootDir,
      '.titan',
      'knowledge',
      'records',
      record.category,
      slugify(record.recordId ?? record.title),
      `${record.version ?? DEFAULT_SCHEMA_VERSION}${extensionForFormat(record.bodyFormat ?? 'markdown')}`,
    );

    return this.save({
      ...record,
      recordId,
      canonicalLocation,
      version: record.version ?? DEFAULT_SCHEMA_VERSION,
      mutable: true,
      source: record.source ?? 'user',
    });
  }

  async update(recordId: string, patch: Partial<KnowledgeRecord>): Promise<KnowledgeRecord> {
    const current = this.cache.get(recordId);
    if (!current) {
      throw new Error(`Knowledge record not found: ${recordId}`);
    }

    if (this.authorityManager.isImmutable(current)) {
      throw new Error(`Knowledge record is immutable: ${recordId}`);
    }

    const allowed = await this.authorize('update', current);
    if (!allowed) {
      throw new Error('Knowledge update denied.');
    }

    const updatedVersion = this.versionManager.nextVersion(current.version);
    const nextRecord = normalizeRecord({
      ...current,
      ...patch,
      recordId: current.recordId,
      category: current.category,
      canonicalLocation: path.join(
        this.options.rootDir,
        '.titan',
        'knowledge',
        'records',
        current.category,
        slugify(current.recordId),
        `${updatedVersion}${extensionForFormat(current.bodyFormat)}`,
      ),
      version: updatedVersion,
      updatedAt: now(),
      mutable: true,
    });

    const written = await this.store.writeRecord(nextRecord);
    this.cache.set(written);
    this.trackVersion(written);
    this.indexSnapshot = this.indexer.index(this.cache.values());
    await this.audit('update', written.recordId, 'success');
    return written;
  }

  async remove(recordId: string): Promise<KnowledgeRecord> {
    return this.archive(recordId);
  }

  async archive(recordId: string): Promise<KnowledgeRecord> {
    const updated = await this.update(recordId, { archived: true, approvalStatus: 'archived' });
    await this.audit('archive', updated.recordId, 'success');
    return updated;
  }

  async export(request: KnowledgeExportRequest): Promise<string> {
    const allowed = await this.authorize('export', { recordIds: request.recordIds ?? [] });
    if (!allowed) {
      throw new Error('Knowledge export denied.');
    }

    const records = request.recordIds && request.recordIds.length > 0
      ? request.recordIds.map((recordId) => this.cache.get(recordId)).filter((record): record is KnowledgeRecord => Boolean(record))
      : this.cache.values();

    await this.audit('export', 'knowledge', 'success');
    return JSON.stringify(records, null, 2);
  }

  async import(source: string): Promise<KnowledgeRecord[]> {
    const allowed = await this.authorize('import', { source: 'knowledge-export' });
    if (!allowed) {
      throw new Error('Knowledge import denied.');
    }

    const parsed = JSON.parse(source) as Partial<KnowledgeRecord>[];
    const imported: KnowledgeRecord[] = [];

    for (const item of parsed) {
      if (!item.title || !item.category) {
        continue;
      }

      const record = await this.save({
        ...item,
        recordId: item.recordId ?? slugify(item.title),
        body: item.body ?? item.bodyRef ?? item.summary ?? item.title,
        source: item.source ?? 'import',
        mutable: item.mutable ?? true,
      });

      imported.push(record);
    }

    await this.audit('import', 'knowledge', 'success');
    return imported;
  }

  async getVersion(recordId: string, selector?: string): Promise<KnowledgeRecord | null> {
    const versions = await this.store.readVersions(recordId);
    if (versions.length === 0) {
      return null;
    }

    if (!selector) {
      return cloneRecord(versions[versions.length - 1]);
    }

    const requested = versions.find((record) => record.version === selector) ?? null;
    return requested ? cloneRecord(requested) : null;
  }

  private trackVersion(record: KnowledgeRecord): void {
    if (!this.versions.has(record.recordId)) {
      this.versions.set(record.recordId, new Map<string, KnowledgeRecord>());
    }

    this.versions.get(record.recordId)?.set(record.version, cloneRecord(record));
  }

  private async authorize(action: string, target: object): Promise<boolean> {
    const provider = this.options.authorizationProvider;
    if (!provider) {
      return true;
    }

    const result = await provider.authorize({ action, actorId: this.options.actorId, roles: [...this.options.roles], ...(target as Record<string, unknown>) });
    return Boolean(result.allowed);
  }

  private async audit(action: string, target: string, result: string): Promise<void> {
    await this.options.auditLogger?.log({
      action,
      target,
      result,
      actorId: this.options.actorId,
      timestamp: now(),
    });
  }
}

export const knowledgeEngine = {
  name: 'knowledge' as const,
  description: 'Repository-backed durable knowledge engine.',
};
