import type { EventBus } from '../events/event-bus';
import type { Logger } from '../logging/logger';
import { InitializationError, ShutdownError } from '../errors/errors';

export type LifecycleState = 'created' | 'initialized' | 'running' | 'stopped' | 'failed';

export interface LifecycleManagerOptions {
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

export class LifecycleManager {
  private state: LifecycleState = 'created';
  private startupCompleted = false;

  constructor(private readonly options: LifecycleManagerOptions = {}) {}

  getState(): LifecycleState {
    return this.state;
  }

  async initialize(): Promise<void> {
    if (this.state === 'initialized') {
      return;
    }

    if (this.state === 'running') {
      throw new InitializationError('Engine is already running');
    }

    this.state = 'initialized';
    this.startupCompleted = true;
    await this.emit('initialized');
  }

  async start(): Promise<void> {
    if (this.state === 'running') {
      return;
    }

    if (this.state !== 'initialized') {
      throw new InitializationError('Engine must be initialized before start');
    }

    this.state = 'running';
    await this.emit('running');
  }

  async stop(): Promise<void> {
    if (this.state === 'stopped') {
      return;
    }

    if (this.state === 'failed') {
      throw new ShutdownError('Cannot stop a failed engine');
    }

    this.state = 'stopped';
    await this.emit('stopped');
  }

  markFailed(error: Error): void {
    this.state = 'failed';
    void this.emit('failed', error);
  }

  private async emit(state: LifecycleState, error?: Error): Promise<void> {
    if (this.options.eventBus) {
      await this.options.eventBus.publish('engine.lifecycle', {
        topic: 'engine.lifecycle',
        state,
        error: error?.message,
      });
    }

    if (this.options.logger) {
      this.options.logger.info(`lifecycle:${state}`, { state, error: error?.message });
    }
  }
}
