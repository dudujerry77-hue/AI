import { describe, expect, it } from 'vitest';
import { parseCommand } from '../../apps/titan-shell/src/cli/command-parser';

describe('parseCommand', () => {
  it('returns null for empty input', () => {
    expect(parseCommand('')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(parseCommand('   \t  ')).toBeNull();
  });

  it('parses a bare command with no arguments', () => {
    expect(parseCommand('help')).toEqual({
      name: 'help',
      args: [],
      raw: 'help',
    });
  });

  it('lowercases the command name', () => {
    expect(parseCommand('STATUS')).toEqual({
      name: 'status',
      args: [],
      raw: 'STATUS',
    });
  });

  it('splits arguments on whitespace', () => {
    expect(parseCommand('plan Build a website')).toEqual({
      name: 'plan',
      args: ['Build', 'a', 'website'],
      raw: 'plan Build a website',
    });
  });

  it('collapses repeated whitespace between arguments', () => {
    expect(parseCommand('knowledge   list')).toEqual({
      name: 'knowledge',
      args: ['list'],
      raw: 'knowledge   list',
    });
  });

  it('trims leading and trailing whitespace', () => {
    expect(parseCommand('  exit  ')).toEqual({
      name: 'exit',
      args: [],
      raw: 'exit',
    });
  });

  it('does not lowercase argument text, only the command name', () => {
    expect(parseCommand('plan Build A Website')?.args).toEqual([
      'Build',
      'A',
      'Website',
    ]);
  });
});
