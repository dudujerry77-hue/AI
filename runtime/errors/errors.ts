export interface RuntimeErrorOptions {
  readonly code?: string;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;
}

export class RuntimeError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(message: string, options: RuntimeErrorOptions = {}) {
    super(message);
    this.name = 'RuntimeError';
    this.code = options.code ?? 'runtime.error';
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class InitializationError extends RuntimeError {
  constructor(message: string, options: RuntimeErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'runtime.initialization_error' });
    this.name = 'InitializationError';
  }
}

export class ConfigurationError extends RuntimeError {
  constructor(message: string, options: RuntimeErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'runtime.configuration_error' });
    this.name = 'ConfigurationError';
  }
}

export class ShutdownError extends RuntimeError {
  constructor(message: string, options: RuntimeErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'runtime.shutdown_error' });
    this.name = 'ShutdownError';
  }
}

export class EventBusError extends RuntimeError {
  constructor(message: string, options: RuntimeErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'runtime.event_bus_error' });
    this.name = 'EventBusError';
  }
}

export class HealthCheckError extends RuntimeError {
  constructor(message: string, options: RuntimeErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'runtime.health_check_error' });
    this.name = 'HealthCheckError';
  }
}

export class MetricsError extends RuntimeError {
  constructor(message: string, options: RuntimeErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'runtime.metrics_error' });
    this.name = 'MetricsError';
  }
}
