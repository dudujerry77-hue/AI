import { workflowOrchestrateCommand } from './orchestrate';
import { workflowStatusCommand } from './status';
import { workflowPauseCommand } from './pause';
import { workflowResumeCommand } from './resume';
import { workflowCancelCommand } from './cancel';
import { workflowDispatchCommand } from './dispatch';
import type { CommandGroup } from '../../types';

export const workflowCommand: CommandGroup = {
  kind: 'group',
  name: 'workflow',
  description:
    'Orchestrator Engine commands (orchestrate, status, pause, resume, cancel, dispatch).',
  subcommands: new Map([
    [workflowOrchestrateCommand.name, workflowOrchestrateCommand],
    [workflowStatusCommand.name, workflowStatusCommand],
    [workflowPauseCommand.name, workflowPauseCommand],
    [workflowResumeCommand.name, workflowResumeCommand],
    [workflowCancelCommand.name, workflowCancelCommand],
    [workflowDispatchCommand.name, workflowDispatchCommand],
  ]),
};
