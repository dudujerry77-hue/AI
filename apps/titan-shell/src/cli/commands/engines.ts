import { resolveEngineMetadata } from '../engine-utils';
import type { CommandContext, CommandLeaf, CommandResult } from '../types';

/** "Context Engine" -> "Context", to match the shell's short display names. */
function shortName(fullName: string): string {
  return fullName.replace(/ Engine$/, '');
}

export const enginesCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'engines',
  usage: 'engines',
  description: 'List every registered engine and whether it is healthy.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const engines = context.shell.registry.list();

    const rows = await Promise.all(
      engines.map(async (engine) => {
        const metadata = resolveEngineMetadata(engine);
        let healthy = false;
        try {
          healthy = (await engine.health()).status === 'healthy';
        } catch {
          healthy = false;
        }
        return { name: shortName(metadata.name), healthy };
      }),
    );

    const lines = rows.map((row) => `${row.healthy ? '✓' : '✗'} ${row.name}`);

    return { success: true, output: lines.join('\n'), data: rows };
  },
};
