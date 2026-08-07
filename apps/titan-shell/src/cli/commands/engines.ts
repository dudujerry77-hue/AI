import { resolveEngineMetadata } from '../engine-utils';
import type {
  CommandContext,
  CommandDefinition,
  CommandResult,
} from '../types';

/** "Context Engine" -> "Context", to match the shell's short display names. */
function shortName(fullName: string): string {
  return fullName.replace(/ Engine$/, '');
}

export const enginesCommand: CommandDefinition = {
  name: 'engines',
  usage: 'engines',
  description: 'List every registered engine and whether it is healthy.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const engines = context.shell.registry.list();

    const lines = await Promise.all(
      engines.map(async (engine) => {
        const metadata = resolveEngineMetadata(engine);
        let mark = '?';
        try {
          mark = (await engine.health()).status === 'healthy' ? '✓' : '✗';
        } catch {
          mark = '✗';
        }
        return `${mark} ${shortName(metadata.name)}`;
      }),
    );

    return { output: lines.join('\n') };
  },
};
