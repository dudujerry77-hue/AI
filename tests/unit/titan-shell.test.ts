import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';

describe('createTitanShell', () => {
  it('creates a shell with engine metadata', () => {
    const shell = createTitanShell();

    expect(shell.name).toBe('Titan AI shell');
    expect(shell.engineNames).toEqual([
      'context',
      'knowledge',
      'planner',
      'orchestrator',
      'execution',
      'validation',
      'learning',
    ]);
  });
});
