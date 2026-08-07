import { resolveEngineMetadata } from '../engine-utils';
import type {
  CommandContext,
  CommandDefinition,
  CommandResult,
} from '../types';

export const statusCommand: CommandDefinition = {
  name: 'status',
  usage: 'status',
  description: 'Display shell, engine, and runtime status.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const { shell } = context;
    const engines = shell.registry.list();

    const engineLines = await Promise.all(
      engines.map(async (engine) => {
        const metadata = resolveEngineMetadata(engine);
        let healthLabel = 'unknown';
        try {
          healthLabel = (await engine.health()).status;
        } catch (error) {
          healthLabel = `error (${error instanceof Error ? error.message : String(error)})`;
        }
        return `    - ${metadata.name} (${metadata.id}): state=${engine.getState()}, health=${healthLabel}, version=${metadata.version}`;
      }),
    );

    const lines = [
      `Shell: ${shell.name}`,
      `Environment: ${shell.config.environment}`,
      `Log level: ${shell.config.logLevel}`,
      `Registered engines: ${engines.length}`,
      ...engineLines,
    ];

    return { output: lines.join('\n') };
  },
};
