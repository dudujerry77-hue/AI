import { taskExecuteCommand } from './execute';
import { taskStatusCommand } from './status';
import { taskResultCommand } from './result';
import { taskListCommand } from './list';
import type { CommandGroup } from '../../types';

export const taskCommand: CommandGroup = {
  kind: 'group',
  name: 'task',
  description:
    'Execution Engine commands (execute, status, result/output, list).',
  subcommands: new Map([
    [taskExecuteCommand.name, taskExecuteCommand],
    [taskStatusCommand.name, taskStatusCommand],
    [taskResultCommand.name, taskResultCommand],
    ['output', taskResultCommand],
    [taskListCommand.name, taskListCommand],
  ]),
};
