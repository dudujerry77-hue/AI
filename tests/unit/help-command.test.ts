import { describe, expect, it } from 'vitest';
import { createHelpCommand } from '../../apps/titan-shell/src/cli/commands/help';
import type {
  CommandContext,
  CommandNode,
} from '../../apps/titan-shell/src/cli/types';

const fakeCommands: CommandNode[] = [
  {
    kind: 'leaf',
    name: 'zeta',
    usage: 'zeta',
    description: 'Zeta command.',
    execute: () => ({ success: true, output: '' }),
  },
  {
    kind: 'leaf',
    name: 'alpha',
    usage: 'alpha <arg>',
    description: 'Alpha command.',
    execute: () => ({ success: true, output: '' }),
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
    expect(result.success).toBe(true);
  });

  it('sorts commands alphabetically by usage regardless of registration order', async () => {
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
      kind: 'leaf',
      name: 'omega',
      usage: 'omega',
      description: 'Omega command.',
      execute: () => ({ success: true, output: '' }),
    });

    const result = await help.execute({} as CommandContext);

    expect(result.output).toContain('omega');
    expect(result.output).toContain('Omega command.');
  });

  it('recurses into command groups, prefixing subcommand usage', async () => {
    const commandsWithGroup: CommandNode[] = [
      ...fakeCommands,
      {
        kind: 'group',
        name: 'knowledge',
        description: 'Knowledge commands.',
        subcommands: new Map([
          [
            'search',
            {
              kind: 'leaf',
              name: 'search',
              usage: 'knowledge search <query>',
              description: 'Search knowledge records.',
              execute: () => ({ success: true, output: '' }),
            },
          ],
        ]),
      },
    ];
    const help = createHelpCommand(() => commandsWithGroup);
    const result = await help.execute({} as CommandContext);

    expect(result.output).toContain('knowledge search <query>');
    expect(result.output).toContain('Search knowledge records.');
  });

  it('exposes the same rows as structured data', async () => {
    const help = createHelpCommand(() => fakeCommands);
    const result = await help.execute({} as CommandContext);

    expect(result.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ usage: 'alpha <arg>' }),
        expect.objectContaining({ usage: 'zeta' }),
      ]),
    );
  });
});
