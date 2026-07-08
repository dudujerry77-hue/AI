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

export const contextEngine = {
  name: 'context' as const,
  description: 'Runtime context manager for Titan AI session state.',
};
