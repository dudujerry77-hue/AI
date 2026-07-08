import { ConfigurationError } from '../errors/errors';

export class ConfigurationService {
  private readonly values = new Map<string, unknown>();

  constructor(initialValues: Record<string, unknown> = {}) {
    Object.entries(initialValues).forEach(([key, value]) => this.values.set(key, value));
  }

  withValue(key: string, value: unknown): this {
    this.values.set(key, value);
    return this;
  }

  get<T>(key: string, fallback?: T): T | undefined {
    if (this.values.has(key)) {
      return this.values.get(key) as T;
    }

    return fallback;
  }

  getRequired<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new ConfigurationError(`Missing required configuration value: ${key}`);
    }

    return value;
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.values.entries());
  }
}
