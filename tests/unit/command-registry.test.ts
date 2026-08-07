import { describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from '../../apps/titan-shell/src/cli/command-registry';
import type {
  CommandContext,
  CommandDefinition,
} from '../../apps/titan-shell/src/cli/types';

function makeCommand(name: string, output: string): CommandDefinition {
  return {
    name,
    usage: name,
    description: `${name} description`,
    execute: () => ({ output }),
  };
}

const fakeContext = {} as CommandContext;

describe('CommandRegistry', () => {
  it('registers and retrieves a command by name', () => {
    const registry = new CommandRegistry();
    const command = makeCommand('status', 'ok');
    registry.register(command);

    expect(registry.get('status')).toBe(command);
    expect(registry.has('status')).toBe(true);
    expect(registry.has('missing')).toBe(false);
  });

  it('lists every registered command in registration order', () => {
    const registry = new CommandRegistry();
    registry.register(makeCommand('a', '1'));
    registry.register(makeCommand('b', '2'));

    expect(registry.list().map((c) => c.name)).toEqual(['a', 'b']);
  });

  it('dispatches to the matching command and returns its result', async () => {
    const registry = new CommandRegistry();
    registry.register(makeCommand('help', 'help text'));

    const result = await registry.dispatch('help', fakeContext);

    expect(result).toEqual({ output: 'help text' });
  });

  it('returns the documented unknown-command message for an unregistered name', async () => {
    const registry = new CommandRegistry();

    const result = await registry.dispatch('nonexistent', fakeContext);

    expect(result.output).toBe('Unknown command.\nType "help".');
  });

  it('passes the context through to the command execute function', async () => {
    const registry = new CommandRegistry();
    const execute = vi.fn().mockReturnValue({ output: 'called' });
    registry.register({
      name: 'spy',
      usage: 'spy',
      description: 'spy',
      execute,
    });

    const context = { args: ['a', 'b'] } as unknown as CommandContext;
    await registry.dispatch('spy', context);

    expect(execute).toHaveBeenCalledWith(context);
  });

  it('supports commands whose execute is synchronous (no dispatch failure)', async () => {
    const registry = new CommandRegistry();
    registry.register(makeCommand('sync', 'sync result'));

    await expect(registry.dispatch('sync', fakeContext)).resolves.toEqual({
      output: 'sync result',
    });
  });
});
