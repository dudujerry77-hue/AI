import { resolveEngineMetadata } from '../engine-utils';
import type { CommandContext, CommandLeaf, CommandResult } from '../types';

const CONTEXT_ENGINE_ID = 'context-engine';

// TODO(phase-018): ContextEngine exposes no public method to read live
// session/context data — it deliberately has zero business methods per
// Phase 013 Milestone 1 (see engines/context/src/index.ts). Extending
// this beyond lifecycle/status requires a new public ContextEngine read
// method, which is out of scope for this phase (a new engine API needs
// its own ADR and explicit approval). See
// .titan/phases/phase-018-titan-shell-control-plane.md.
export const contextCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'context',
  usage: 'context',
  description:
    'Show Context Engine status (live context data not yet exposed).',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const engine = context.shell.registry.get(CONTEXT_ENGINE_ID);
    if (!engine) {
      return { success: false, output: 'Context Engine is not registered.' };
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

    return {
      success: true,
      output: lines.join('\n'),
      data: {
        id: metadata.id,
        name: metadata.name,
        state: engine.getState(),
        health: health.status,
        ready: health.ready,
        version: metadata.version,
      },
    };
  },
};
