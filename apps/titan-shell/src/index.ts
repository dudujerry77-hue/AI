import { contextEngine } from '@titan/context';
import { knowledgeEngine } from '@titan/knowledge';
import { plannerEngine } from '@titan/planner';
import { orchestratorEngine } from '@titan/orchestrator';
import { executionEngine } from '@titan/execution';
import { validationEngine } from '@titan/validation';
import { learningEngine } from '@titan/learning';
import { createLogger } from '@titan/shared';
import { createRuntimeConfig } from '@titan/shared';
import type { TitanEngineName } from '@titan/shared';

export interface TitanShell {
  readonly name: string;
  readonly engineNames: TitanEngineName[];
  readonly logger: ReturnType<typeof createLogger>;
  readonly config: ReturnType<typeof createRuntimeConfig>;
}

export function createTitanShell(): TitanShell {
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
  };
}
