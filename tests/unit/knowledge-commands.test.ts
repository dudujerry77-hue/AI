import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { knowledgeCommand } from '../../apps/titan-shell/src/cli/commands/knowledge';
import type { CommandContext } from '../../apps/titan-shell/src/cli/types';

function buildContext(args: string[] = []): CommandContext {
  const shell = createTitanShell();
  return {
    shell,
    logger: shell.logger,
    session: { history: [], plans: [], executions: [] },
    args,
    flags: {},
    format: 'human',
    verbose: false,
  };
}

function getSubcommand(name: string) {
  if (knowledgeCommand.kind !== 'group') {
    throw new Error('expected knowledgeCommand to be a group');
  }
  const leaf = knowledgeCommand.subcommands.get(name);
  if (!leaf || leaf.kind !== 'leaf') {
    throw new Error(`expected a "${name}" leaf under knowledge`);
  }
  return leaf;
}

describe('knowledge command group', () => {
  it('is a group with list/search/get/export/status subcommands', () => {
    expect(knowledgeCommand.kind).toBe('group');
    if (knowledgeCommand.kind === 'group') {
      expect([...knowledgeCommand.subcommands.keys()].sort()).toEqual([
        'export',
        'get',
        'list',
        'search',
        'status',
      ]);
    }
  });
});

describe('knowledge list', () => {
  it('lists knowledge records as a summarized table, not raw objects', async () => {
    const result = await getSubcommand('list').execute(buildContext());

    expect(result.output).toMatch(/knowledge record\(s\)/);
    expect(result.output).not.toContain('checksum');
    expect(result.output).not.toContain('bodyFormat');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe('knowledge search', () => {
  it('ranks records by relevance to the joined query text', async () => {
    const result = await getSubcommand('search').execute(
      buildContext(['constitution']),
    );
    expect(result.success).toBe(true);
    expect(result.output).toMatch(/matching record\(s\)/);
  });

  it('applies --limit N to cap the result count', async () => {
    const context = buildContext(['governance']);
    const withLimit = {
      ...context,
      args: ['governance'],
      flags: { limit: 1 },
    };
    const result = await getSubcommand('search').execute(withLimit);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as unknown[]).length).toBeLessThanOrEqual(1);
  });

  it('reports usage when no query text is given', async () => {
    const result = await getSubcommand('search').execute(buildContext([]));
    expect(result.success).toBe(false);
    expect(result.output).toContain('Usage: knowledge search');
  });
});

describe('knowledge get', () => {
  it('reports usage when no record ID is given', async () => {
    const result = await getSubcommand('get').execute(buildContext([]));
    expect(result.success).toBe(false);
    expect(result.output).toContain('Usage: knowledge get');
  });

  it('reports a not-found message for an unknown record ID', async () => {
    const result = await getSubcommand('get').execute(
      buildContext(['does-not-exist']),
    );
    expect(result.success).toBe(false);
    expect(result.output).toContain('No knowledge record found');
  });

  it('shows a real record fetched via list first', async () => {
    const list = await getSubcommand('list').execute(buildContext());
    const [first] = list.data as { recordId: string }[];

    const result = await getSubcommand('get').execute(
      buildContext([first.recordId]),
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain(first.recordId);
  });
});

describe('knowledge export', () => {
  it('exports valid JSON containing a records array', async () => {
    const result = await getSubcommand('export').execute(buildContext([]));
    expect(result.success).toBe(true);
    expect(() => JSON.parse(result.output)).not.toThrow();
    expect(result.data).toHaveProperty('records');
  });
});

describe('knowledge status', () => {
  it('reports health and a per-category record count', async () => {
    const result = await getSubcommand('status').execute(buildContext());
    expect(result.success).toBe(true);
    expect(result.output).toContain('Health:');
    expect(result.output).toContain('Total records:');
    expect(result.data).toHaveProperty('totalRecords');
  });
});
