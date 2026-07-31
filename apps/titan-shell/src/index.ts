import { ContextEngine, contextEngine } from '@titan/context';
import { KnowledgeEngine, knowledgeEngine } from '@titan/knowledge';
import { PlannerEngine, plannerEngine } from '@titan/planner';
import { OrchestratorEngine, orchestratorEngine } from '@titan/orchestrator';
import { ExecutionEngine, executionEngine } from '@titan/execution';
import { ValidationEngine, validationEngine } from '@titan/validation';
import { LearningEngine, learningEngine } from '@titan/learning';
import { createLogger } from '@titan/shared';
import { createRuntimeConfig } from '@titan/shared';
import type { TitanEngineName } from '@titan/shared';
import { EngineRegistry } from '../../../runtime/registry/engine-registry';

export interface TitanShell {
  readonly name: string;
  readonly engineNames: TitanEngineName[];
  readonly logger: ReturnType<typeof createLogger>;
  readonly config: ReturnType<typeof createRuntimeConfig>;
  readonly registry: EngineRegistry;
}

/**
 * Instantiates all seven Titan Core engine runtime wrappers via their
 * public constructors and registers them in a shared `EngineRegistry`
 * — Phase 013 Milestone 2 ("Wire all seven engines through approved
 * framework contracts"; architecture.md §6.4's "Engine registry — a
 * central registry of available engines and their capabilities").
 *
 * This function only constructs engines and calls `registry.register`.
 * It never calls `initialize()`/`start()`, invokes any business
 * method, or lets one engine call another — every constructor is
 * invoked exactly as each engine's own unit tests already do, with no
 * new coupling introduced.
 *
 * `KnowledgeEngine` is the only engine whose constructor requires
 * `rootDir`/`actorId`/`roles`. No repository document defines what
 * these should be for a shell-level integration point, so minimal,
 * inert placeholders are used here (`process.cwd()`, `'titan-shell'`,
 * `['ai-agent']`) — they are never read, since `initialize()` (which
 * validates `rootDir`) and the write paths (which validate
 * `actorId`/`roles`) are never invoked by this function.
 */
export function createTitanShell(): TitanShell {
  const registry = new EngineRegistry();

  registry.register(new ContextEngine());
  registry.register(
    new KnowledgeEngine({
      rootDir: process.cwd(),
      actorId: 'titan-shell',
      roles: ['ai-agent'],
    }),
  );
  registry.register(new PlannerEngine());
  registry.register(new OrchestratorEngine());
  registry.register(new ExecutionEngine());
  registry.register(new ValidationEngine());
  registry.register(new LearningEngine());

  return {
    name: 'Titan AI shell',
    engineNames: [
      contextEngine.name,
      knowledgeEngine.name,
      plannerEngine.name,
      orchestratorEngine.name,
      executionEngine.name,
      validationEngine.name,
      learningEngine.name,
    ],
    logger: createLogger(),
    config: createRuntimeConfig(),
    registry,
  };
}
