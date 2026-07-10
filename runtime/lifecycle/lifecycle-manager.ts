import type { EventBus } from '../events/event-bus';
import type { Logger } from '../logging/logger';
import { InitializationError, ShutdownError } from '../errors/errors';

export type LifecycleState = 'created' | 'initialized' | 'running' | 'stopped' | 'failed';

const DEFAULT_SUPPORTED_CONTRACT_VERSIONS = ['1.0.0'];

const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  created: ['initialized'],
  initialized: ['running', 'failed'],
  running: ['stopped', 'failed'],
  stopped: ['initialized'],
  failed: ['initialized'],
};

export interface LifecycleManagerOptions {
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
  readonly supportedContractVersions?: readonly string[];
}

export class LifecycleManager {
  private state: LifecycleState = 'created';

  constructor(private readonly options: LifecycleManagerOptions = {}) {}

  getState(): LifecycleState {
    return this.state;
  }

  async initialize(contractVersion?: string): Promise<void> {
    if (this.state === 'initialized') {
      return;
    }

    if (contractVersion) {
      this.validateContractVersion(contractVersion);
    }

    this.assertTransition('initialized');
    this.state = 'initialized';
    await this.emit('initialized');
  }

  async start(): Promise<void> {
    if (this.state === 'running') {
      return;
    }

    this.assertTransition('running');
    this.state = 'running';
    await this.emit('running');
  }

  async stop(): Promise<void> {
    if (this.state === 'stopped') {
      return;
    }

    this.assertTransition('stopped');
    this.state = 'stopped';
    await this.emit('stopped');
  }

  markFailed(error: Error): void {
    if (this.state === 'failed') {
      return;
    }

    this.assertTransition('failed');
    this.state = 'failed';
    void this.emit('failed', error);
  }

  validateContractVersion(contractVersion: string): void {
    const supported = this.options.supportedContractVersions ?? DEFAULT_SUPPORTED_CONTRACT_VERSIONS;
    if (!supported.includes(contractVersion)) {
      throw new InitializationError(
        `Unsupported engine contract version: ${contractVersion}. Supported: ${supported.join(', ')}`,
      );
    }
  }

  isTransitionAllowed(from: LifecycleState, to: LifecycleState): boolean {
    return VALID_TRANSITIONS[from].includes(to);
  }

  private assertTransition(target: LifecycleState): void {
    if (!this.isTransitionAllowed(this.state, target)) {
      if (target === 'stopped') {
        throw new ShutdownError(`Invalid lifecycle transition from ${this.state} to ${target}`);
      }

      throw new InitializationError(`Invalid lifecycle transition from ${this.state} to ${target}`);
    }
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
