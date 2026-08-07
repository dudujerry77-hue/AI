import { resolveEngineMetadata } from '../engine-utils';
import type {
  CommandContext,
  CommandDefinition,
  CommandResult,
} from '../types';

const CONTEXT_ENGINE_ID = 'context-engine';

// TODO(phase-017): ContextEngine exposes no public method to read live
// session/context data — it deliberately has zero business methods per
// Phase 013 Milestone 1 (see engines/context/src/index.ts). This command
// is limited to lifecycle/status until a public read API exists. See
// .titan/phases/phase-017-ai-shell-and-command-interface.md's Risks.
export const contextCommand: CommandDefinition = {
  name: 'context',
  usage: 'context',
  description:
    'Show Context Engine status (live context data not yet exposed).',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const engine = context.shell.registry.get(CONTEXT_ENGINE_ID);
    if (!engine) {
      return { output: 'Context Engine is not registered.' };
    }

    const metadata = resolveEngineMetadata(engine);
    const health = await engine.health();

    const lines = [
      `Context Engine: ${metadata.name} (${metadata.id})`,
      `State: ${engine.getState()}`,
      `Health: ${health.status}${health.ready ? '' : ' (not ready)'}`,
      `Version: ${metadata.version}`,
      '',
      'Live session/context data is not yet exposed by a public ContextEngine method.',
    ];

    return { output: lines.join('\n') };
  },
};
