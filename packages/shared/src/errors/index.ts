export class TitanError extends Error {
  readonly code: string;

  constructor(message: string, code = 'titan.error') {
    super(message);
    this.name = 'TitanError';
    this.code = code;
  }
}

export function createTitanError(message: string, code = 'titan.error'): TitanError {
  return new TitanError(message, code);
}
