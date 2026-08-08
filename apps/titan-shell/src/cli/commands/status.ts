import { resolveEngineMetadata } from '../engine-utils';
import type { CommandContext, CommandLeaf, CommandResult } from '../types';

interface EngineStatusRow {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly health: string;
  readonly version: string;
}

export const statusCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'status',
  usage: 'status',
  description: 'Display shell, engine, and runtime status.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const { shell } = context;
    const engines = shell.registry.list();

    const rows: EngineStatusRow[] = await Promise.all(
      engines.map(async (engine) => {
        const metadata = resolveEngineMetadata(engine);
        let healthLabel = 'unknown';
        try {
          healthLabel = (await engine.health()).status;
        } catch (error) {
          healthLabel = `error (${error instanceof Error ? error.message : String(error)})`;
        }
        return {
          id: metadata.id,
          name: metadata.name,
          state: engine.getState(),
          health: healthLabel,
          version: metadata.version,
        };
      }),
    );

    const lines = [
      `Shell: ${shell.name}`,
      `Environment: ${shell.config.environment}`,
      `Log level: ${shell.config.logLevel}`,
      `Registered engines: ${engines.length}`,
      ...rows.map(
        (row) =>
          `    - ${row.name} (${row.id}): state=${row.state}, health=${row.health}, version=${row.version}`,
      ),
    ];

    return {
      success: true,
      output: lines.join('\n'),
      data: {
        shell: shell.name,
        environment: shell.config.environment,
        logLevel: shell.config.logLevel,
        engines: rows,
      },
    };
  },
};
