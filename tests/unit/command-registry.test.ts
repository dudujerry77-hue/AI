import { describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from '../../apps/titan-shell/src/cli/command-registry';
import type {
  CommandGroup,
  CommandLeaf,
  ShellSession,
} from '../../apps/titan-shell/src/cli/types';
import type { Logger } from '@titan/shared';
import type { TitanShell } from '../../apps/titan-shell/src/index';

function makeLeaf(
  name: string,
  execute: CommandLeaf['execute'] = () => ({
    success: true,
    output: `${name} ok`,
  }),
): CommandLeaf {
  return {
    kind: 'leaf',
    name,
    usage: name,
    description: `${name} description`,
    execute,
  };
}

function makeLogger(): Logger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

function makeDeps(): {
  shell: TitanShell;
  logger: Logger;
  session: ShellSession;
} {
  return {
    shell: {} as TitanShell,
    logger: makeLogger(),
    session: { history: [], plans: [], executions: [] },
  };
}

describe('CommandRegistry.resolve', () => {
  it('resolves a bare top-level leaf', () => {
    const registry = new CommandRegistry();
    const leaf = makeLeaf('status');
    registry.register(leaf);

    const resolved = registry.resolve(['status']);
    expect(resolved.leaf).toBe(leaf);
    expect(resolved.path).toEqual(['status']);
    expect(resolved.tail).toEqual([]);
  });

  it('resolves a group/subcommand pair', () => {
    const registry = new CommandRegistry();
    const search = makeLeaf('search');
    const group: CommandGroup = {
      kind: 'group',
      name: 'knowledge',
      description: 'Knowledge commands.',
      subcommands: new Map([['search', search]]),
    };
    registry.register(group);

    const resolved = registry.resolve([
      'knowledge',
      'search',
      'governance drift',
    ]);
    expect(resolved.leaf).toBe(search);
    expect(resolved.path).toEqual(['knowledge', 'search']);
    expect(resolved.tail).toEqual(['governance drift']);
  });

  it('fails to resolve an unknown root', () => {
    const registry = new CommandRegistry();
    const resolved = registry.resolve(['bogus']);
    expect(resolved.leaf).toBeUndefined();
  });

  it('fails to resolve a group with no matching subcommand', () => {
    const registry = new CommandRegistry();
    const group: CommandGroup = {
      kind: 'group',
      name: 'knowledge',
      description: 'Knowledge commands.',
      subcommands: new Map([['search', makeLeaf('search')]]),
    };
    registry.register(group);

    const resolved = registry.resolve(['knowledge', 'delete']);
    expect(resolved.leaf).toBeUndefined();
    expect(resolved.path).toEqual(['knowledge']);
  });
});

describe('CommandRegistry.dispatchLine', () => {
  it('dispatches to the matching leaf and returns its result', async () => {
    const registry = new CommandRegistry();
    registry.register(
      makeLeaf('help', () => ({ success: true, output: 'help text' })),
    );

    const { result } = await registry.dispatchLine('help', makeDeps());

    expect(result).toEqual({ success: true, output: 'help text' });
  });

  it('logs every dispatched command via the Titan logger, including its args and flags', async () => {
    const registry = new CommandRegistry();
    registry.register(makeLeaf('knowledge'));
    const deps = makeDeps();

    await registry.dispatchLine('knowledge search governance --limit 5', deps);

    expect(deps.logger.info).toHaveBeenCalledWith(
      'cli.command',
      expect.objectContaining({
        command: 'knowledge',
        args: ['search', 'governance'],
        flags: { limit: '5' },
      }),
    );
  });

  it('does not log an unresolved (unknown) command as if it were dispatched', async () => {
    const registry = new CommandRegistry();
    const deps = makeDeps();

    await registry.dispatchLine('nonexistent', deps);

    expect(deps.logger.info).not.toHaveBeenCalled();
  });

  it('returns the documented unknown-command message for an unregistered name', async () => {
    const registry = new CommandRegistry();

    const { result } = await registry.dispatchLine('nonexistent', makeDeps());

    expect(result.output).toBe('Unknown command.\nType "help".');
    expect(result.success).toBe(false);
  });

  it('returns empty success output for blank input without touching the tree', async () => {
    const registry = new CommandRegistry();
    const { result } = await registry.dispatchLine('   ', makeDeps());
    expect(result).toEqual({ success: true, output: '' });
  });

  it('passes parsed positional args to the leaf', async () => {
    const registry = new CommandRegistry();
    const execute = vi
      .fn()
      .mockReturnValue({ success: true, output: 'called' });
    registry.register({
      kind: 'leaf',
      name: 'spy',
      usage: 'spy',
      description: 'spy',
      execute,
    });

    await registry.dispatchLine('spy a b', makeDeps());

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ args: ['a', 'b'] }),
    );
  });

  it('catches a thrown error from a command and returns a failed result instead of crashing', async () => {
    const registry = new CommandRegistry();
    registry.register(
      makeLeaf('boom', () => {
        throw new Error('kaboom');
      }),
    );
    const deps = makeDeps();

    const { result } = await registry.dispatchLine('boom', deps);

    expect(result.success).toBe(false);
    expect(result.output).toContain('kaboom');
    expect(deps.logger.error).toHaveBeenCalled();
  });

  it('catches a rejected async command without crashing', async () => {
    const registry = new CommandRegistry();
    registry.register(
      makeLeaf('boom', async () => {
        throw new Error('async kaboom');
      }),
    );

    const { result } = await registry.dispatchLine('boom', makeDeps());

    expect(result.success).toBe(false);
    expect(result.output).toContain('async kaboom');
  });

  it('records every dispatch (success and failure) in session history', async () => {
    const registry = new CommandRegistry();
    registry.register(makeLeaf('ok'));
    registry.register(
      makeLeaf('bad', () => ({ success: false, output: 'nope' })),
    );
    const deps = makeDeps();

    await registry.dispatchLine('ok', deps);
    await registry.dispatchLine('bad', deps);

    expect(deps.session.history).toHaveLength(2);
    expect(deps.session.history[0]).toMatchObject({
      command: 'ok',
      success: true,
    });
    expect(deps.session.history[1]).toMatchObject({
      command: 'bad',
      success: false,
    });
  });

  it('derives json format from the --json flag', async () => {
    const registry = new CommandRegistry();
    registry.register(
      makeLeaf('ok', () => ({
        success: true,
        output: 'human text',
        data: { a: 1 },
      })),
    );

    const { format } = await registry.dispatchLine('ok --json', makeDeps());

    expect(format).toBe('json');
  });

  it('derives concise format from the --concise flag', async () => {
    const registry = new CommandRegistry();
    registry.register(makeLeaf('ok'));

    const { format } = await registry.dispatchLine('ok --concise', makeDeps());

    expect(format).toBe('concise');
  });

  it('defaults to human format', async () => {
    const registry = new CommandRegistry();
    registry.register(makeLeaf('ok'));

    const { format } = await registry.dispatchLine('ok', makeDeps());

    expect(format).toBe('human');
  });
});
