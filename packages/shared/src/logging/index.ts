export interface Logger {
  readonly info: (...messages: unknown[]) => void;
  readonly warn: (...messages: unknown[]) => void;
  readonly error: (...messages: unknown[]) => void;
  readonly debug: (...messages: unknown[]) => void;
}

export function createLogger(): Logger {
  return {
    info: (...messages: unknown[]) => {
      console.info('[titan]', ...messages);
    },
    warn: (...messages: unknown[]) => {
      console.warn('[titan]', ...messages);
    },
    error: (...messages: unknown[]) => {
      console.error('[titan]', ...messages);
    },
    debug: (...messages: unknown[]) => {
      console.debug('[titan]', ...messages);
    },
  };
}
