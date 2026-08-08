import { planCreateCommand } from './create';
import { planExplainCommand } from './explain';
import { planShowCommand } from './show';
import { planValidateCommand } from './validate';
import { planListCommand } from './list';
import type { CommandGroup } from '../../types';

export const planCommand: CommandGroup = {
  kind: 'group',
  name: 'plan',
  description:
    'Planner Engine commands (create, explain, show, validate, list).',
  subcommands: new Map([
    [planCreateCommand.name, planCreateCommand],
    [planExplainCommand.name, planExplainCommand],
    [planShowCommand.name, planShowCommand],
    [planValidateCommand.name, planValidateCommand],
    [planListCommand.name, planListCommand],
  ]),
};
