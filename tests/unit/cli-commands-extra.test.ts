import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import {
  versionCommand,
  TITAN_SHELL_VERSION,
} from '../../apps/titan-shell/src/cli/commands/version';
import { contextCommand } from '../../apps/titan-shell/src/cli/commands/context';
import { validateCommand } from '../../apps/titan-shell/src/cli/commands/validate';
import { clearCommand } from '../../apps/titan-shell/src/cli/commands/clear';
import { exitCommand } from '../../apps/titan-shell/src/cli/commands/exit';
import { knowledgeCommand } from '../../apps/titan-shell/src/cli/commands/knowledge';
import { planCommand } from '../../apps/titan-shell/src/cli/commands/plan';
import type {
  CommandContext,
  ShellSession,
} from '../../apps/titan-shell/src/cli/types';

function buildContext(
  args: string[] = [],
  session: ShellSession = {},
): CommandContext {
  const shell = createTitanShell();
  return { shell, logger: shell.logger, session, args };
}

describe('versionCommand', () => {
  it('reports the shell version', async () => {
    const result = await versionCommand.execute(buildContext());
    expect(result.output).toBe(`Titan AI v${TITAN_SHELL_VERSION}`);
  });
});

describe('contextCommand', () => {
  it('reports Context Engine lifecycle status without exposing live session data', async () => {
    const result = await contextCommand.execute(buildContext());

    expect(result.output).toContain('Context Engine');
    expect(result.output).toContain('State: created');
    expect(result.output).toContain('not yet exposed');
  });
});

describe('validateCommand', () => {
  it('returns the documented placeholder message rather than running validation', async () => {
    const result = await validateCommand.execute(buildContext());
    expect(result.output).toBe(
      'Validation requires an ExecutionRecord and will be implemented in a later milestone.',
    );
  });
});

describe('clearCommand', () => {
  it('returns empty output', async () => {
    const result = await clearCommand.execute(buildContext());
    expect(result.output).toBe('');
  });
});

describe('exitCommand', () => {
  it('signals the REPL loop to close', async () => {
    const result = await exitCommand.execute(buildContext());
    expect(result.exit).toBe(true);
    expect(result.output).toBe('Goodbye.');
  });
});

describe('knowledgeCommand', () => {
  it('lists knowledge records as a summarized table, not raw objects', async () => {
    const result = await knowledgeCommand.execute(buildContext(['list']));

    expect(result.output).toMatch(/knowledge record\(s\)/);
    expect(result.output).not.toContain('checksum');
    expect(result.output).not.toContain('bodyFormat');
  });

  it('defaults to listing when called with no subcommand', async () => {
    const result = await knowledgeCommand.execute(buildContext([]));
    expect(result.output).toMatch(/knowledge record\(s\)/);
  });

  it('rejects an unrecognized subcommand', async () => {
    const result = await knowledgeCommand.execute(buildContext(['delete']));
    expect(result.output).toContain('Unknown "knowledge" subcommand');
  });
});

describe('planCommand', () => {
  it('creates a plan from bare goal text and stores it in the session', async () => {
    const session: ShellSession = {};
    const result = await planCommand.execute(
      buildContext(['Build', 'a', 'website'], session),
    );

    expect(result.output).toContain('Plan plan-goal-');
    expect(session.lastPlan).toBeDefined();
    expect(session.lastPlan?.steps.length).toBeGreaterThan(0);
  });

  it('supports "plan create <goal>" explicitly', async () => {
    const session: ShellSession = {};
    const result = await planCommand.execute(
      buildContext(['create', 'Build', 'a', 'website'], session),
    );

    expect(result.output).toContain('Plan plan-goal-');
    expect(session.lastPlan).toBeDefined();
  });

  it('explains the most recently created plan', async () => {
    const session: ShellSession = {};
    await planCommand.execute(buildContext(['Build', 'a', 'website'], session));

    const result = await planCommand.execute(
      buildContext(['explain'], session),
    );

    expect(result.output).toContain('Rationale:');
  });

  it('reports a helpful message when explaining with no prior plan', async () => {
    const result = await planCommand.execute(buildContext(['explain'], {}));
    expect(result.output).toContain('No plan has been created yet');
  });

  it('reports usage when no goal text is given', async () => {
    const result = await planCommand.execute(buildContext([]));
    expect(result.output).toContain('Usage: plan create <goal>');
  });
});
