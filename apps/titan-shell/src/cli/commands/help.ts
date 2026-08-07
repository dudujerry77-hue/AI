import type { CommandDefinition, CommandResult } from '../types';

/**
 * Built dynamically from whatever the registry actually contains, so
 * `help` can never drift out of sync with the real command list.
 */
export function createHelpCommand(
  getCommands: () => readonly CommandDefinition[],
): CommandDefinition {
  return {
    name: 'help',
    usage: 'help',
    description: 'List available commands.',
    execute: (): CommandResult => {
      const commands = [...getCommands()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const width = Math.max(...commands.map((c) => c.usage.length));

      const lines = [
        'Titan AI — available commands:',
        '',
        ...commands.map((c) => `  ${c.usage.padEnd(width)}  ${c.description}`),
      ];

      return { output: lines.join('\n') };
    },
  };
}
