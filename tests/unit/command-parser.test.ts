import { describe, expect, it } from 'vitest';
import {
  tokenize,
  parseArgs,
} from '../../apps/titan-shell/src/cli/command-parser';
import type { FlagSpec } from '../../apps/titan-shell/src/cli/command-parser';

describe('tokenize', () => {
  it('returns an empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns an empty array for whitespace-only input', () => {
    expect(tokenize('   \t  ')).toEqual([]);
  });

  it('splits on whitespace', () => {
    expect(tokenize('plan Build a website')).toEqual([
      'plan',
      'Build',
      'a',
      'website',
    ]);
  });

  it('collapses repeated whitespace between tokens', () => {
    expect(tokenize('knowledge   list')).toEqual(['knowledge', 'list']);
  });

  it('trims leading and trailing whitespace', () => {
    expect(tokenize('  exit  ')).toEqual(['exit']);
  });

  it('keeps a double-quoted span as a single token, stripping the quotes', () => {
    expect(tokenize('knowledge search "governance drift"')).toEqual([
      'knowledge',
      'search',
      'governance drift',
    ]);
  });

  it('keeps a single-quoted span as a single token, stripping the quotes', () => {
    expect(tokenize("plan create 'multi word goal'")).toEqual([
      'plan',
      'create',
      'multi word goal',
    ]);
  });

  it('does not alter casing of any token', () => {
    expect(tokenize('STATUS')).toEqual(['STATUS']);
  });
});

describe('parseArgs', () => {
  it('returns all tokens as positional when no flags are present', () => {
    expect(parseArgs(['Build', 'a', 'website'])).toEqual({
      positional: ['Build', 'a', 'website'],
      flags: {},
    });
  });

  it('parses a bare long flag as boolean true', () => {
    expect(parseArgs(['--json'])).toEqual({
      positional: [],
      flags: { json: true },
    });
  });

  it('parses "--name value" as a string flag when undeclared', () => {
    expect(parseArgs(['--limit', '20'])).toEqual({
      positional: [],
      flags: { limit: '20' },
    });
  });

  it('coerces "--name value" to a number when declared as type number', () => {
    const specs: FlagSpec[] = [{ name: 'limit', type: 'number' }];
    expect(parseArgs(['--limit', '20'], specs)).toEqual({
      positional: [],
      flags: { limit: 20 },
    });
  });

  it('parses "--name=value" form', () => {
    expect(parseArgs(['--limit=20'])).toEqual({
      positional: [],
      flags: { limit: '20' },
    });
  });

  it('never consumes the next token as a value for a declared boolean flag', () => {
    const specs: FlagSpec[] = [{ name: 'verbose', type: 'boolean' }];
    expect(parseArgs(['--verbose', 'search'], specs)).toEqual({
      positional: ['search'],
      flags: { verbose: true },
    });
  });

  it('resolves a declared single-character alias to its canonical name', () => {
    const specs: FlagSpec[] = [{ name: 'limit', type: 'number', alias: 'n' }];
    expect(parseArgs(['-n', '5'], specs)).toEqual({
      positional: [],
      flags: { limit: 5 },
    });
  });

  it('mixes positional args and flags in any order', () => {
    expect(
      parseArgs(['search', 'governance drift', '--limit', '5', '--json']),
    ).toEqual({
      positional: ['search', 'governance drift'],
      flags: { limit: '5', json: true },
    });
  });

  it('does not throw on a non-numeric value for a declared number flag, leaving it as the raw string', () => {
    const specs: FlagSpec[] = [{ name: 'limit', type: 'number' }];
    expect(parseArgs(['--limit', 'abc'], specs)).toEqual({
      positional: [],
      flags: { limit: 'abc' },
    });
  });
});
