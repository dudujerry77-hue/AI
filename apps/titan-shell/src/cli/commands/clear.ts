import type { CommandLeaf, CommandResult } from '../types';

export const clearCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'clear',
  usage: 'clear',
  description: 'Clear the screen.',
  execute: (): CommandResult => {
    console.clear();
    return { success: true, output: '' };
  },
};
