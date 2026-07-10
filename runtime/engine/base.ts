import {
  ENGINE_API_CONTRACT_VERSION,
  type BaseEngineOptions,
  type EngineMetadata,
  type TitanEngine,
} from './types';
import { LifecycleManager } from '../lifecycle/lifecycle-manager';
import { type HealthSnapshot, HealthMonitor } from '../health/health-monitor';
import { Logger } from '../logging/logger';
import { ConfigurationService } from '../config/configuration-service';
import { MetricsCollector } from '../metrics/metrics';
import { EventBus } from '../events/event-bus';
import { InitializationError, ShutdownError } from '../errors/errors';
import type {
  AuthenticationProvider,
  AuthorizationProvider,
  AuditLogger,
  PermissionChecker,
  SecretProvider,
} from '../security/interfaces';

export class BaseEngine implements TitanEngine {
  private readonly metadataValue: EngineMetadata;

  private readonly lifecycleManager: LifecycleManager;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly config: ConfigurationService;
  private readonly metrics: MetricsCollector;
  private readonly healthMonitor: HealthMonitor;
  protected readonly authenticationProvider?: AuthenticationProvider;
  protected readonly authorizationProvider?: AuthorizationProvider;
  protected readonly auditLogger?: AuditLogger;
  protected readonly permissionChecker?: PermissionChecker;
  protected readonly secretProvider?: SecretProvider;

  constructor(options: BaseEngineOptions) {
    this.metadataValue = {
      id: options.id,
      name: options.name,
      version: options.version,
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description: options.description,
      capabilities: options.capabilities ?? [],
    };

    this.lifecycleManager = options.lifecycleManager ?? new LifecycleManager();
    this.eventBus = options.eventBus ?? new EventBus();
    this.logger = options.logger ?? new Logger({ service: options.name });
    this.config = options.config ?? new ConfigurationService();
    this.metrics = options.metrics instanceof MetricsCollector ? options.metrics : new MetricsCollector();
    this.healthMonitor = options.healthMonitor ?? new HealthMonitor();
    this.authenticationProvider = options.authenticationProvider;
    this.authorizationProvider = options.authorizationProvider;
    this.auditLogger = options.auditLogger;
    this.permissionChecker = options.permissionChecker;
    this.secretProvider = options.secretProvider;
  }

  async initialize(): Promise<void> {
    try {
      await this.lifecycleManager.initialize(this.contractVersion());
      this.healthMonitor.markHealthy('initialized');
      await this.eventBus.publish(
        'engine.initialized',
        { engineId: this.metadata().id },
        {
          engineId: this.metadata().id,
          version: this.version(),
        },
      );
      this.logger.info('engine.initialized', { engineId: this.metadata().id });
    } catch (error) {
      this.healthMonitor.markFailed('initialization failed', error);
      this.lifecycleManager.markFailed(error instanceof Error ? error : new InitializationError('Initialization failed'));
      throw error instanceof Error ? error : new InitializationError('Initialization failed');
    }
  }

  async start(): Promise<void> {
    try {
      await this.lifecycleManager.start();
      this.healthMonitor.markHealthy('running');
      this.logger.info('engine.started', { engineId: this.metadata().id });
      await this.eventBus.publish(
        'engine.started',
        { engineId: this.metadata().id },
        {
          engineId: this.metadata().id,
          version: this.version(),
        },
      );
    } catch (error) {
      this.healthMonitor.markFailed('start failed', error);
      this.lifecycleManager.markFailed(error instanceof Error ? error : new InitializationError('Start failed'));
      throw error instanceof Error ? error : new InitializationError('Start failed');
    }
  }

  async stop(): Promise<void> {
    try {
      await this.lifecycleManager.stop();
      this.healthMonitor.markHealthy('stopped');
      await this.eventBus.publish(
        'engine.stopped',
        { engineId: this.metadata().id },
        {
          engineId: this.metadata().id,
          version: this.version(),
        },
      );
      this.logger.info('engine.stopped', { engineId: this.metadata().id });
    } catch (error) {
      this.healthMonitor.markFailed('shutdown failed', error);
      throw error instanceof Error ? error : new ShutdownError('Shutdown failed');
    }
  }

  async health(): Promise<HealthSnapshot> {
    return this.healthMonitor.getSnapshot();
  }

  metadata(): EngineMetadata {
    return this.metadataValue;
  }

  getState(): 'created' | 'initialized' | 'running' | 'stopped' | 'failed' {
    return this.lifecycleManager.getState();
  }

  version(): string {
    return this.metadata().version;
  }

  contractVersion(): string {
    return this.metadata().contractVersion;
  }
}
