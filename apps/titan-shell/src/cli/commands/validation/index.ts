import { validationStatusCommand } from './status';
import { validationReportCommand } from './report';
import type { CommandGroup } from '../../types';

export const validationCommand: CommandGroup = {
  kind: 'group',
  name: 'validation',
  description:
    'Validation Engine read commands (status, report). See also: validate.',
  subcommands: new Map([
    [validationStatusCommand.name, validationStatusCommand],
    [validationReportCommand.name, validationReportCommand],
  ]),
};
