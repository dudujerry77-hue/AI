import type { CommandContext, CommandLeaf, CommandResult } from '../types';

export const configCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'config',
  usage: 'config',
  description: 'Show the shell runtime configuration.',
  execute: (context: CommandContext): CommandResult => {
    const { config } = context.shell;
    const lines = [
      `Environment: ${config.environment}`,
      `Log level: ${config.logLevel}`,
    ];
    return { success: true, output: lines.join('\n'), data: config };
  },
};
