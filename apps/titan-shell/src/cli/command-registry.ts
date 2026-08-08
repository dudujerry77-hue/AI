import type { Logger } from '@titan/shared';
import type { TitanShell } from '../index';
import { tokenize, parseArgs } from './command-parser';
import type {
  CommandContext,
  CommandLeaf,
  CommandNode,
  CommandResult,
  OutputFormat,
  ShellSession,
} from './types';

const UNKNOWN_COMMAND_RESULT: CommandResult = {
  success: false,
  output: 'Unknown command.\nType "help".',
};

export interface DispatchDeps {
  readonly shell: TitanShell;
  readonly logger: Logger;
  readonly session: ShellSession;
}

export interface DispatchOutcome {
  readonly result: CommandResult;
  readonly format: OutputFormat;
}

interface ResolvedPath {
  readonly leaf?: CommandLeaf;
  readonly path: readonly string[];
  readonly tail: readonly string[];
}

/**
 * Hierarchical, table-driven command router. Deliberately not a `switch`
 * statement: nodes (leaves, or groups of subcommands) are registered once
 * at the top level, then resolved by walking the input's tokens through
 * the tree — adding a command or subcommand never touches this class.
 */
export class CommandRegistry {
  private readonly roots = new Map<string, CommandNode>();

  register(node: CommandNode): void {
    this.roots.set(node.name, node);
  }

  get(name: string): CommandNode | undefined {
    return this.roots.get(name);
  }

  has(name: string): boolean {
    return this.roots.has(name);
  }

  list(): readonly CommandNode[] {
    return Array.from(this.roots.values());
  }

  /**
   * Walks `tokens` through the tree as far as it can. For
   * `['knowledge', 'search', 'x']` under a `knowledge` group with a
   * `search` leaf, this resolves to that leaf with `tail: ['x']`. If no
   * leaf is reached (unknown root, or a group with no matching/no
   * subcommand token), `leaf` is `undefined`.
   */
  resolve(tokens: readonly string[]): ResolvedPath {
    const first = tokens[0];
    let node: CommandNode | undefined = first
      ? this.roots.get(first)
      : undefined;
    const path: string[] = node && first ? [first] : [];
    let index = 1;

    while (node && node.kind === 'group') {
      const next = tokens[index];
      const child: CommandNode | undefined = next
        ? node.subcommands.get(next)
        : undefined;
      if (!child) {
        break;
      }
      node = child;
      path.push(next as string);
      index++;
    }

    if (node && node.kind === 'leaf') {
      return { leaf: node, path, tail: tokens.slice(index) };
    }
    return { leaf: undefined, path, tail: tokens.slice(index) };
  }

  private deriveFormat(flags: Readonly<Record<string, unknown>>): OutputFormat {
    if (flags.json) {
      return 'json';
    }
    if (flags.concise) {
      return 'concise';
    }
    return 'human';
  }

  /**
   * Parses, routes, executes, and error-boundaries a single raw input
   * line. Never throws — a command that throws is caught here and turned
   * into a failed `CommandResult`, so one broken command can never crash
   * the shell. Every dispatch (success or failure) is appended to
   * `session.history`.
   */
  async dispatchLine(
    input: string,
    deps: DispatchDeps,
  ): Promise<DispatchOutcome> {
    const raw = input.trim();
    if (raw.length === 0) {
      return { result: { success: true, output: '' }, format: 'human' };
    }

    const tokens = tokenize(raw);
    const { leaf, path, tail } = this.resolve(tokens);

    if (!leaf) {
      return { result: UNKNOWN_COMMAND_RESULT, format: 'human' };
    }

    const { positional, flags } = parseArgs(tail, leaf.flags ?? []);
    const format = this.deriveFormat(flags);
    const context: CommandContext = {
      shell: deps.shell,
      logger: deps.logger,
      session: deps.session,
      args: positional,
      flags,
      format,
      verbose: Boolean(flags.verbose),
    };

    const commandLabel = path.join(' ');

    deps.logger.info('cli.command', {
      command: commandLabel,
      args: positional,
      flags,
    });

    try {
      const result = await leaf.execute(context);
      deps.session.history.push({
        command: commandLabel,
        timestamp: new Date().toISOString(),
        success: result.success,
      });
      return { result, format };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.logger.error('cli.command.failed', {
        command: commandLabel,
        error: message,
      });
      deps.session.history.push({
        command: commandLabel,
        timestamp: new Date().toISOString(),
        success: false,
      });
      return {
        result: { success: false, output: `Command failed: ${message}` },
        format,
      };
    }
  }
}
