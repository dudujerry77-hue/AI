import { describe, expect, it } from 'vitest';
import { createHelpCommand } from '../../apps/titan-shell/src/cli/commands/help';
import type {
  CommandContext,
  CommandDefinition,
} from '../../apps/titan-shell/src/cli/types';

const fakeCommands: CommandDefinition[] = [
  {
    name: 'zeta',
    usage: 'zeta',
    description: 'Zeta command.',
    execute: () => ({ output: '' }),
  },
  {
    name: 'alpha',
    usage: 'alpha <arg>',
    description: 'Alpha command.',
    execute: () => ({ output: '' }),
  },
];

describe('createHelpCommand', () => {
  it('lists every command supplied by the registry callback', async () => {
    const help = createHelpCommand(() => fakeCommands);
    const result = await help.execute({} as CommandContext);

    expect(result.output).toContain('alpha <arg>');
    expect(result.output).toContain('Alpha command.');
    expect(result.output).toContain('zeta');
    expect(result.output).toContain('Zeta command.');
  });

  it('sorts commands alphabetically by name regardless of registration order', async () => {
    const help = createHelpCommand(() => fakeCommands);
    const result = await help.execute({} as CommandContext);

    const alphaIndex = result.output.indexOf('alpha');
    const zetaIndex = result.output.indexOf('zeta');

    expect(alphaIndex).toBeGreaterThan(-1);
    expect(zetaIndex).toBeGreaterThan(alphaIndex);
  });

  it('reflects live changes to the command list, avoiding drift', async () => {
    const commands = [...fakeCommands];
    const help = createHelpCommand(() => commands);
    commands.push({
      name: 'omega',
      usage: 'omega',
      description: 'Omega command.',
      execute: () => ({ output: '' }),
    });

    const result = await help.execute({} as CommandContext);

    expect(result.output).toContain('omega');
    expect(result.output).toContain('Omega command.');
  });
});
