export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'failed';

export interface HealthSnapshot {
  readonly status: HealthStatus;
  readonly ready: boolean;
  readonly timestamp: string;
  readonly details?: string;
  readonly lastError?: string;
}

export class HealthMonitor {
  private status: HealthStatus = 'healthy';
  private ready = true;
  private details?: string;
  private lastError?: string;

  markHealthy(details?: string): void {
    this.status = 'healthy';
    this.ready = true;
    this.details = details;
    this.lastError = undefined;
  }

  markDegraded(details?: string): void {
    this.status = 'degraded';
    this.ready = false;
    this.details = details;
  }

  markUnhealthy(details?: string): void {
    this.status = 'unhealthy';
    this.ready = false;
    this.details = details;
  }

  markFailed(details?: string, error?: unknown): void {
    this.status = 'failed';
    this.ready = false;
    this.details = details;
    this.lastError = error instanceof Error ? error.message : String(error ?? 'unknown error');
  }

  getSnapshot(): HealthSnapshot {
    return {
      status: this.status,
      ready: this.ready,
      timestamp: new Date().toISOString(),
      details: this.details,
      lastError: this.lastError,
    };
  }
}
