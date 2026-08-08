import type { CommandLeaf, CommandResult } from '../types';

export const TITAN_SHELL_VERSION = '1.1';

export const versionCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'version',
  usage: 'version',
  description: 'Show the Titan Shell version.',
  execute: (): CommandResult => ({
    success: true,
    output: `Titan AI v${TITAN_SHELL_VERSION}`,
    data: { version: TITAN_SHELL_VERSION },
  }),
};
