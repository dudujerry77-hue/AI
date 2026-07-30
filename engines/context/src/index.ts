import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';

export interface VersionedContext {
  readonly version: string;
}

export interface ProjectContext extends VersionedContext {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export interface SessionContext extends VersionedContext {
  readonly id: string;
  readonly name: string;
  readonly phaseId?: string;
}

export interface TaskContext extends VersionedContext {
  readonly id: string;
  readonly name: string;
  readonly status?: string;
}

export interface PhaseContext extends VersionedContext {
  readonly id: string;
  readonly name: string;
  readonly status?: string;
}

export interface UserContext extends VersionedContext {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
}

export interface EngineContext extends VersionedContext {
  readonly id: string;
  readonly name: string;
  readonly status?: string;
}

export interface ContextSnapshot extends VersionedContext {
  readonly project?: ProjectContext;
  readonly session?: SessionContext;
  readonly task?: TaskContext;
  readonly phase?: PhaseContext;
  readonly user?: UserContext;
  readonly engine?: EngineContext;
}

export interface ContextStorageAdapter {
  save(payload: string): void;
  load(): string | null;
}

export interface ContextManagerOptions {
  readonly project?: ProjectContext;
  readonly session?: SessionContext;
  readonly task?: TaskContext;
  readonly phase?: PhaseContext;
  readonly user?: UserContext;
  readonly engine?: EngineContext;
}

export interface ContextManager {
  createSnapshot(): ContextSnapshot;
  serialize(): string;
  save(storage: ContextStorageAdapter): void;
  load(storage: ContextStorageAdapter): void;
  setProjectContext(context: ProjectContext): void;
  setSessionContext(context: SessionContext): void;
  setTaskContext(context: TaskContext): void;
  setPhaseContext(context: PhaseContext): void;
  setUserContext(context: UserContext): void;
  setEngineContext(context: EngineContext): void;
}

const CONTEXT_VERSION = '1.0.0';

function createVersionedContext<T extends Record<string, unknown>>(value: T): T {
  return Object.freeze({ ...value, version: CONTEXT_VERSION }) as T;
}

export function createProjectContext(input: Omit<ProjectContext, 'version'>): ProjectContext {
  return createVersionedContext({ ...input, version: CONTEXT_VERSION });
}

export function createSessionContext(input: Omit<SessionContext, 'version'>): SessionContext {
  return createVersionedContext({ ...input, version: CONTEXT_VERSION });
}

export function createTaskContext(input: Omit<TaskContext, 'version'>): TaskContext {
  return createVersionedContext({ ...input, version: CONTEXT_VERSION });
}

export function createPhaseContext(input: Omit<PhaseContext, 'version'>): PhaseContext {
  return createVersionedContext({ ...input, version: CONTEXT_VERSION });
}

export function createUserContext(input: Omit<UserContext, 'version'>): UserContext {
  return createVersionedContext({ ...input, version: CONTEXT_VERSION });
}

export function createEngineContext(input: Omit<EngineContext, 'version'>): EngineContext {
  return createVersionedContext({ ...input, version: CONTEXT_VERSION });
}

export function createInMemoryContextStorage(): ContextStorageAdapter {
  let payload: string | null = null;

  return {
    save(nextPayload: string): void {
      payload = nextPayload;
    },
    load(): string | null {
      return payload;
    },
  };
}

export function createContextManager(options: ContextManagerOptions = {}): ContextManager {
  let project: ProjectContext | undefined = options.project;
  let session: SessionContext | undefined = options.session;
  let task: TaskContext | undefined = options.task;
  let phase: PhaseContext | undefined = options.phase;
  let user: UserContext | undefined = options.user;
  let engine: EngineContext | undefined = options.engine;

  return {
    createSnapshot(): ContextSnapshot {
      return Object.freeze({
        version: CONTEXT_VERSION,
        project,
        session,
        task,
        phase,
        user,
        engine,
      });
    },
    serialize(): string {
      return JSON.stringify(this.createSnapshot());
    },
    save(storage: ContextStorageAdapter): void {
      storage.save(this.serialize());
    },
    load(storage: ContextStorageAdapter): void {
      const raw = storage.load();
      if (!raw) {
        return;
      }

      const snapshot = JSON.parse(raw) as Partial<ContextSnapshot>;
      project = snapshot.project ? (snapshot.project as ProjectContext) : undefined;
      session = snapshot.session ? (snapshot.session as SessionContext) : undefined;
      task = snapshot.task ? (snapshot.task as TaskContext) : undefined;
      phase = snapshot.phase ? (snapshot.phase as PhaseContext) : undefined;
      user = snapshot.user ? (snapshot.user as UserContext) : undefined;
      engine = snapshot.engine ? (snapshot.engine as EngineContext) : undefined;
    },
    setProjectContext(context: ProjectContext): void {
      project = context;
    },
    setSessionContext(context: SessionContext): void {
      session = context;
    },
    setTaskContext(context: TaskContext): void {
      task = context;
    },
    setPhaseContext(context: PhaseContext): void {
      phase = context;
    },
    setUserContext(context: UserContext): void {
      user = context;
    },
    setEngineContext(context: EngineContext): void {
      engine = context;
    },
  };
}

export interface ContextEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
  readonly context?: ContextManagerOptions;
}

/**
 * Context Engine — Phase 013 Milestone 1 (Framework Contract).
 *
 * Implements the shared Titan runtime engine contract required by
 * `specification/engine_api.md` §3.1 (`initialize`, `start`, `stop`,
 * `health`, `metadata`, `version`), inherited unchanged from
 * `BaseEngine` exactly as every other Titan engine does. This closes
 * the gap identified in Phase 013 planning: prior to this milestone,
 * the Context Engine package exposed no class satisfying the
 * mandatory lifecycle contract.
 *
 * `ContextEngine` composes (does not replace or rewrite) the existing
 * `ContextManager` as internal state, constructed via
 * `createContextManager`. No `ContextManager` behavior changes.
 *
 * `capabilities` is declared as `[]`: no repository document
 * (`phase-013-titan-core-integration-and-hardening.md`,
 * `architecture.md`, `specification/engine_api.md`) names any Context
 * Engine business method or capability string, so none is invented —
 * mirroring the Learning Engine's Milestone 1 precedent
 * (`phases/phase-012-learning-engine-implementation.md`). No new
 * public business method is added in this milestone.
 */
export class ContextEngine extends BaseEngine {
  private readonly contextManager: ContextManager;

  constructor(options: ContextEngineOptions = {}) {
    super({
      id: options.id ?? 'context-engine',
      name: options.name ?? 'Context Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Context Engine for Titan AI. Milestone 1 (Phase 013) implements the shared runtime lifecycle contract via BaseEngine, composing the existing ContextManager as internal state. No business methods are declared in this milestone.',
      capabilities: options.capabilities ?? [],
      lifecycleManager: options.lifecycleManager,
      eventBus: options.eventBus,
      logger: options.logger,
      config: options.config,
      metrics: options.metrics,
      healthMonitor: options.healthMonitor,
      authenticationProvider: options.authenticationProvider,
      authorizationProvider: options.authorizationProvider,
      auditLogger: options.auditLogger,
      permissionChecker: options.permissionChecker,
      secretProvider: options.secretProvider,
    });

    this.contextManager = createContextManager(options.context);
  }
}

export const contextEngine = {
  name: 'context' as const,
  description: 'Runtime context manager for Titan AI session state.',
};
