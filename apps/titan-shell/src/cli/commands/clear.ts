import type { CommandDefinition, CommandResult } from '../types';

export const clearCommand: CommandDefinition = {
  name: 'clear',
  usage: 'clear',
  description: 'Clear the screen.',
  execute: (): CommandResult => {
    console.clear();
    return { output: '' };
  },
};
