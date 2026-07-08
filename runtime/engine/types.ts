import type { HealthSnapshot } from '../health/health-monitor';
import type { Logger } from '../logging/logger';
import type { ConfigurationService } from '../config/configuration-service';
import type { EventBus } from '../events/event-bus';
import type { LifecycleManager, LifecycleState } from '../lifecycle/lifecycle-manager';
import type { Metrics } from '../metrics/metrics';
import type { HealthMonitor } from '../health/health-monitor';

export interface EngineMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly capabilities: string[];
}

export interface TitanEngine {
  readonly metadata: EngineMetadata;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<HealthSnapshot>;
  getState(): LifecycleState;
  version(): string;
}

export interface EngineDependencies {
  readonly lifecycleManager?: LifecycleManager;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
  readonly config?: ConfigurationService;
  readonly metrics?: Metrics;
  readonly healthMonitor?: HealthMonitor;
}

export interface BaseEngineOptions extends EngineDependencies {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly capabilities?: string[];
}
