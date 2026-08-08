import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { engineCommand } from '../../apps/titan-shell/src/cli/commands/engine';
import { doctorCommand } from '../../apps/titan-shell/src/cli/commands/doctor';
import { configCommand } from '../../apps/titan-shell/src/cli/commands/config';
import { sessionCommand } from '../../apps/titan-shell/src/cli/commands/session';
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

describe('engineCommand', () => {
  it('reports usage with no name given', async () => {
    const result = await engineCommand.execute(buildContext([]));
    expect(result.success).toBe(false);
    expect(result.output).toContain('Usage: engine <name>');
  });

  it('resolves by exact engine ID', async () => {
    const result = await engineCommand.execute(
      buildContext(['knowledge-engine']),
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain('Knowledge Engine');
  });

  it('resolves by short name, case-insensitively', async () => {
    const result = await engineCommand.execute(buildContext(['Knowledge']));
    expect(result.success).toBe(true);
    expect(result.output).toContain('Knowledge Engine');
    expect(result.output).toContain('Capabilities:');
  });

  it('reports the known engine list for an unmatched name', async () => {
    const result = await engineCommand.execute(buildContext(['bogus']));
    expect(result.success).toBe(false);
    expect(result.output).toContain('Known engines:');
    expect(result.output).toContain('knowledge');
  });
});

describe('doctorCommand', () => {
  it('reports a pass/fail sweep across all seven engines plus the runtime', async () => {
    const result = await doctorCommand.execute(buildContext());
    expect(result.output).toContain('Registered engines: 7/7');
    expect(result.output).toContain('Node.js runtime');
    expect(result.output).toContain('Authorization: not enforced');
  });

  it('succeeds when every real check passes, regardless of the standing authorization gap', async () => {
    const result = await doctorCommand.execute(buildContext());
    expect(result.success).toBe(true);
  });
});

describe('configCommand', () => {
  it('reports environment and log level', async () => {
    const context = buildContext();
    const result = await configCommand.execute(context);
    expect(result.success).toBe(true);
    expect(result.output).toContain(
      `Environment: ${context.shell.config.environment}`,
    );
    expect(result.output).toContain(
      `Log level: ${context.shell.config.logLevel}`,
    );
  });
});

describe('sessionCommand', () => {
  it('reports an empty lifecycle chain for a fresh session', async () => {
    const result = await sessionCommand.execute(buildContext());
    expect(result.success).toBe(true);
    expect(result.output).toContain('Plans created: 0');
    expect(result.output).toContain('Goal: (not set)');
    expect(result.output).toContain('Commands run: 0');
  });

  it('reflects a populated session', async () => {
    const session: ShellSession = {
      history: [
        {
          command: 'plan create',
          timestamp: new Date().toISOString(),
          success: true,
        },
      ],
      plans: [],
      executions: [],
    };
    const result = await sessionCommand.execute(buildContext([], session));
    expect(result.output).toContain('Commands run: 1');
  });
});
