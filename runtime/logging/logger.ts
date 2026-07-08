export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
  readonly correlationId?: string;
}

export interface LoggerOptions {
  readonly service: string;
  readonly correlationId?: string;
}

export class Logger {
  private readonly listeners = new Set<(entry: LogEntry) => void>();

  constructor(private readonly options: LoggerOptions) {}

  onLog(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  child(bindings: Partial<LoggerOptions>): Logger {
    return new Logger({
      service: bindings.service ?? this.options.service,
      correlationId: bindings.correlationId ?? this.options.correlationId,
    });
  }

  debug(message: string, data?: Record<string, unknown>): LogEntry {
    return this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): LogEntry {
    return this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): LogEntry {
    return this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): LogEntry {
    return this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.options.service,
      message,
      data,
      correlationId: this.options.correlationId,
    };

    for (const listener of this.listeners) {
      listener(entry);
    }

    return entry;
  }
}
