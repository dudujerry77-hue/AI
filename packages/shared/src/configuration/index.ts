export interface RuntimeConfig {
  readonly environment: string;
  readonly logLevel: string;
}

export function createRuntimeConfig(): RuntimeConfig {
  return {
    environment: process.env.TITAN_ENV ?? 'development',
    logLevel: process.env.TITAN_LOG_LEVEL ?? 'info',
  };
}
