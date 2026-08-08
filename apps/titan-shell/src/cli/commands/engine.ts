import { resolveEngineMetadata } from '../engine-utils';
import type { CommandContext, CommandLeaf, CommandResult } from '../types';

/** "Context Engine" -> "context", to accept short names like `engine knowledge`. */
function shortName(fullName: string): string {
  return fullName.replace(/ Engine$/, '').toLowerCase();
}

export const engineCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'engine',
  usage: 'engine <name>',
  description: 'Show detailed metadata and health for one engine.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const [name] = context.args;
    if (!name) {
      return { success: false, output: 'Usage: engine <name>' };
    }

    const query = name.toLowerCase();
    const engines = context.shell.registry.list();
    const engine = engines.find((candidate) => {
      const metadata = resolveEngineMetadata(candidate);
      return metadata.id === query || shortName(metadata.name) === query;
    });

    if (!engine) {
      const known = engines
        .map((candidate) => shortName(resolveEngineMetadata(candidate).name))
        .join(', ');
      return {
        success: false,
        output: `No engine matches "${name}". Known engines: ${known}`,
      };
    }

    const metadata = resolveEngineMetadata(engine);
    const health = await engine.health();

    const lines = [
      `${metadata.name} (${metadata.id})`,
      `State: ${engine.getState()}`,
      `Health: ${health.status}${health.ready ? '' : ' (not ready)'}`,
      `Version: ${metadata.version}`,
      `Contract version: ${metadata.contractVersion}`,
      `Capabilities: ${metadata.capabilities.length > 0 ? metadata.capabilities.join(', ') : '(none declared)'}`,
    ];
    if (metadata.description) {
      lines.push(`Description: ${metadata.description}`);
    }

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
        contractVersion: metadata.contractVersion,
        capabilities: metadata.capabilities,
        description: metadata.description,
      },
    };
  },
};
