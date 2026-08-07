import type { CommandDefinition, CommandResult } from '../types';

// TODO(phase-017): ValidationEngine.validate() requires a full
// ExecutionRecord (see engines/validation/src/index.ts's
// ValidationValidateRequest/ValidationSubject) — nothing in this phase's
// scope produces one. Wire this command up once a real ExecutionRecord
// source exists rather than forcing it through with synthetic data. See
// .titan/phases/phase-017-ai-shell-and-command-interface.md's Risks.
export const validateCommand: CommandDefinition = {
  name: 'validate',
  usage: 'validate',
  description: 'Run the Validation Engine (placeholder).',
  execute: (): CommandResult => ({
    output:
      'Validation requires an ExecutionRecord and will be implemented in a later milestone.',
  }),
};
