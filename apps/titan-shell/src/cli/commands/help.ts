import type { CommandLeaf, CommandNode, CommandResult } from '../types';

interface HelpRow {
  readonly usage: string;
  readonly description: string;
}

function collectRows(
  nodes: readonly CommandNode[],
  seen: Set<CommandLeaf> = new Set(),
): HelpRow[] {
  const rows: HelpRow[] = [];
  for (const node of nodes) {
    if (node.kind === 'leaf') {
      // A leaf can be registered under more than one subcommand key (an
      // alias, e.g. `task result`/`task output`) — list it once.
      if (seen.has(node)) {
        continue;
      }
      seen.add(node);
      rows.push({ usage: node.usage, description: node.description });
    } else {
      rows.push(...collectRows(Array.from(node.subcommands.values()), seen));
    }
  }
  return rows;
}

/**
 * Built dynamically from whatever the registry actually contains
 * (recursing into command groups), so `help` can never drift out of sync
 * with the real command tree.
 */
export function createHelpCommand(
  getCommands: () => readonly CommandNode[],
): CommandLeaf {
  return {
    kind: 'leaf',
    name: 'help',
    usage: 'help',
    description: 'List available commands.',
    execute: (): CommandResult => {
      const rows = collectRows(getCommands()).sort((a, b) =>
        a.usage.localeCompare(b.usage),
      );
      const width = Math.max(...rows.map((row) => row.usage.length));

      const lines = [
        'Titan AI — available commands:',
        '',
        ...rows.map(
          (row) => `  ${row.usage.padEnd(width)}  ${row.description}`,
        ),
      ];

      return { success: true, output: lines.join('\n'), data: rows };
    },
  };
}
