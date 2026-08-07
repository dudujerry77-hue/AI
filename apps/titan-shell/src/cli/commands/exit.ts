import type { CommandDefinition, CommandResult } from '../types';

export const exitCommand: CommandDefinition = {
  name: 'exit',
  usage: 'exit',
  description: 'Exit Titan AI.',
  execute: (): CommandResult => ({ output: 'Goodbye.', exit: true }),
};
