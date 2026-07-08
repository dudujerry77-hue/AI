import { type BaseEngineOptions, type TitanEngine } from './types';
import { LifecycleManager } from '../lifecycle/lifecycle-manager';
import { type HealthSnapshot, HealthMonitor } from '../health/health-monitor';
import { Logger } from '../logging/logger';
import { ConfigurationService } from '../config/configuration-service';
import { MetricsCollector } from '../metrics/metrics';
import { EventBus } from '../events/event-bus';
import { InitializationError, ShutdownError } from '../errors/errors';

export class BaseEngine implements TitanEngine {
  public readonly metadata: BaseEngineOptions['id'] extends never ? never : {
    id: string;
    name: string;
    version: string;
    description?: string;
    capabilities: string[];
  };

  private readonly lifecycleManager: LifecycleManager;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly config: ConfigurationService;
  private readonly metrics: MetricsCollector;
  private readonly healthMonitor: HealthMonitor;

  constructor(options: BaseEngineOptions) {
    this.metadata = {
      id: options.id,
      name: options.name,
      version: options.version,
      description: options.description,
      capabilities: options.capabilities ?? [],
    };

    this.lifecycleManager = options.lifecycleManager ?? new LifecycleManager();
    this.eventBus = options.eventBus ?? new EventBus();
    this.logger = options.logger ?? new Logger({ service: options.name });
    this.config = options.config ?? new ConfigurationService();
    this.metrics = options.metrics instanceof MetricsCollector ? options.metrics : new MetricsCollector();
    this.healthMonitor = options.healthMonitor ?? new HealthMonitor();
  }

  async initialize(): Promise<void> {
    try {
      await this.lifecycleManager.initialize();
      this.healthMonitor.markHealthy('initialized');
      await this.eventBus.publish('engine.initialized', { engineId: this.metadata.id });
      this.logger.info('engine.initialized', { engineId: this.metadata.id });
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
      this.logger.info('engine.started', { engineId: this.metadata.id });
      await this.eventBus.publish('engine.started', { engineId: this.metadata.id });
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
      await this.eventBus.publish('engine.stopped', { engineId: this.metadata.id });
      this.logger.info('engine.stopped', { engineId: this.metadata.id });
    } catch (error) {
      this.healthMonitor.markFailed('shutdown failed', error);
      throw error instanceof Error ? error : new ShutdownError('Shutdown failed');
    }
  }

  async health(): Promise<HealthSnapshot> {
    return this.healthMonitor.getSnapshot();
  }

  getState(): 'created' | 'initialized' | 'running' | 'stopped' | 'failed' {
    return this.lifecycleManager.getState();
  }

  version(): string {
    return this.metadata.version;
  }
}
