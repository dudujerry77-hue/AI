import type { CommandDefinition, CommandResult } from '../types';

export const TITAN_SHELL_VERSION = '1.1';

export const versionCommand: CommandDefinition = {
  name: 'version',
  usage: 'version',
  description: 'Show the Titan Shell version.',
  execute: (): CommandResult => ({
    output: `Titan AI v${TITAN_SHELL_VERSION}`,
  }),
};
