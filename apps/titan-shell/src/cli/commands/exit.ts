import type { CommandLeaf, CommandResult } from '../types';

export const exitCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'exit',
  usage: 'exit',
  description: 'Exit Titan AI.',
  execute: (): CommandResult => ({
    success: true,
    output: 'Goodbye.',
    exit: true,
  }),
};
