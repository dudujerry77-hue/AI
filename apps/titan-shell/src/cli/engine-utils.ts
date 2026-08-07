// Single point of contact with `runtime/engine/*`, which has no `@titan/*`
// path alias (see tsconfig.json's `paths` — only apps/engines/packages are
// aliased). Every CLI command imports these from here instead of repeating
// the deep relative path.
export {
  resolveEngineMetadata,
  type EngineContract,
  type EngineMetadata,
} from '../../../../runtime/engine/types';
export type { HealthSnapshot } from '../../../../runtime/health/health-monitor';
