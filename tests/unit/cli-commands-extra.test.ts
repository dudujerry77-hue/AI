import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import {
  versionCommand,
  TITAN_SHELL_VERSION,
} from '../../apps/titan-shell/src/cli/commands/version';
import { contextCommand } from '../../apps/titan-shell/src/cli/commands/context';
import { clearCommand } from '../../apps/titan-shell/src/cli/commands/clear';
import { exitCommand } from '../../apps/titan-shell/src/cli/commands/exit';
import type {
  CommandContext,
  ShellSession,
} from '../../apps/titan-shell/src/cli/types';

function buildContext(
  args: string[] = [],
  session: ShellSession = { history: [], plans: [], executions: [] },
): CommandContext {
  const shell = createTitanShell();
  return {
    shell,
    logger: shell.logger,
    session,
    args,
    flags: {},
    format: 'human',
    verbose: false,
  };
}

describe('versionCommand', () => {
  it('reports the shell version', async () => {
    const result = await versionCommand.execute(buildContext());
    expect(result.output).toBe(`Titan AI v${TITAN_SHELL_VERSION}`);
    expect(result.success).toBe(true);
  });
});

describe('contextCommand', () => {
  it('reports Context Engine lifecycle status without exposing live session data', async () => {
    const result = await contextCommand.execute(buildContext());

    expect(result.output).toContain('Context Engine');
    expect(result.output).toContain('State: created');
    expect(result.output).toContain('not yet exposed');
    expect(result.success).toBe(true);
  });
});

describe('clearCommand', () => {
  it('returns empty output', async () => {
    const result = await clearCommand.execute(buildContext());
    expect(result.output).toBe('');
    expect(result.success).toBe(true);
  });
});

describe('exitCommand', () => {
  it('signals the REPL loop to close', async () => {
    const result = await exitCommand.execute(buildContext());
    expect(result.exit).toBe(true);
    expect(result.output).toBe('Goodbye.');
    expect(result.success).toBe(true);
  });
});
