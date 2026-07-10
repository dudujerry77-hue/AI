import type { HealthSnapshot } from '../health/health-monitor';
import type { Logger } from '../logging/logger';
import type { ConfigurationService } from '../config/configuration-service';
import type { EventBus } from '../events/event-bus';
import type { LifecycleManager, LifecycleState } from '../lifecycle/lifecycle-manager';
import type { Metrics } from '../metrics/metrics';
import type { HealthMonitor } from '../health/health-monitor';
import type {
  AuthenticationProvider,
  AuthorizationProvider,
  AuditLogger,
  PermissionChecker,
  SecretProvider,
} from '../security/interfaces';

export const ENGINE_API_CONTRACT_VERSION = '1.0.0';

export interface EngineMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly contractVersion: string;
  readonly description?: string;
  readonly capabilities: string[];
}

export interface TitanEngine {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<HealthSnapshot>;
  metadata(): EngineMetadata;
  getState(): LifecycleState;
  version(): string;
  contractVersion(): string;
}

export interface LegacyTitanEngine {
  readonly metadata: Omit<EngineMetadata, 'contractVersion'> & { readonly contractVersion?: string };
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<HealthSnapshot>;
  getState(): LifecycleState;
  version(): string;
  contractVersion?(): string;
}

export type EngineContract = TitanEngine | LegacyTitanEngine;

export function resolveEngineMetadata(engine: EngineContract): EngineMetadata {
  const candidate = engine as TitanEngine;
  if (typeof candidate.metadata === 'function') {
    return candidate.metadata();
  }

  const legacy = engine as LegacyTitanEngine;
  return {
    ...legacy.metadata,
    contractVersion: legacy.metadata.contractVersion ?? legacy.contractVersion?.() ?? ENGINE_API_CONTRACT_VERSION,
  };
}

export interface EngineDependencies {
  readonly lifecycleManager?: LifecycleManager;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
  readonly config?: ConfigurationService;
  readonly metrics?: Metrics;
  readonly healthMonitor?: HealthMonitor;
  readonly authenticationProvider?: AuthenticationProvider;
  readonly authorizationProvider?: AuthorizationProvider;
  readonly auditLogger?: AuditLogger;
  readonly permissionChecker?: PermissionChecker;
  readonly secretProvider?: SecretProvider;
}

export interface BaseEngineOptions extends EngineDependencies {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly contractVersion?: string;
  readonly description?: string;
  readonly capabilities?: string[];
}
