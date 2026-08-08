import { knowledgeListCommand } from './list';
import { knowledgeSearchCommand } from './search';
import { knowledgeGetCommand } from './get';
import { knowledgeExportCommand } from './export';
import { knowledgeStatusCommand } from './status';
import type { CommandGroup } from '../../types';

export const knowledgeCommand: CommandGroup = {
  kind: 'group',
  name: 'knowledge',
  description: 'Read the Knowledge Engine (list, search, get, export, status).',
  subcommands: new Map([
    [knowledgeListCommand.name, knowledgeListCommand],
    [knowledgeSearchCommand.name, knowledgeSearchCommand],
    [knowledgeGetCommand.name, knowledgeGetCommand],
    [knowledgeExportCommand.name, knowledgeExportCommand],
    [knowledgeStatusCommand.name, knowledgeStatusCommand],
  ]),
};
