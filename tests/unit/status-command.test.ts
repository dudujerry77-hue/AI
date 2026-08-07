import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { statusCommand } from '../../apps/titan-shell/src/cli/commands/status';
import type { CommandContext } from '../../apps/titan-shell/src/cli/types';

function buildContext(): CommandContext {
  const shell = createTitanShell();
  return { shell, logger: shell.logger, session: {}, args: [] };
}

describe('statusCommand', () => {
  it('reports the shell name', async () => {
    const result = await statusCommand.execute(buildContext());
    expect(result.output).toContain('Shell: Titan AI shell');
  });

  it('reports the registered engine count', async () => {
    const result = await statusCommand.execute(buildContext());
    expect(result.output).toContain('Registered engines: 7');
  });

  it('reports runtime configuration (environment and log level)', async () => {
    const context = buildContext();
    const result = await statusCommand.execute(context);

    expect(result.output).toContain(
      `Environment: ${context.shell.config.environment}`,
    );
    expect(result.output).toContain(
      `Log level: ${context.shell.config.logLevel}`,
    );
  });

  it('lists every engine with its state and health', async () => {
    const result = await statusCommand.execute(buildContext());

    // Six of seven engines default to `healthy`; KnowledgeEngine's
    // constructor deliberately marks itself `degraded` until
    // `initialize()` is called (engines/knowledge/src/index.ts). Real,
    // pre-existing engine behavior — this asserts it accurately rather
    // than assuming a uniform result.
    const healthyCount = (result.output.match(/health=healthy/g) ?? []).length;
    expect(healthyCount).toBe(6);
    expect(result.output).toContain('health=degraded');
    expect(result.output).toContain('state=created');
  });

  it('lists each engine with its version', async () => {
    const result = await statusCommand.execute(buildContext());
    expect(result.output).toMatch(/version=\d+\.\d+\.\d+/);
  });
});
