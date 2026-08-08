import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { planCommand } from '../../apps/titan-shell/src/cli/commands/plan';
import type {
  CommandContext,
  ShellSession,
} from '../../apps/titan-shell/src/cli/types';

function buildContext(
  args: string[] = [],
  session: ShellSession = { history: [], plans: [], executions: [] },
): CommandContext {
  const shell = createTitanShell();
  return {
    shell,
    logger: shell.logger,
    session,
    args,
    flags: {},
    format: 'human',
    verbose: false,
  };
}

function getSubcommand(name: string) {
  if (planCommand.kind !== 'group') {
    throw new Error('expected planCommand to be a group');
  }
  const leaf = planCommand.subcommands.get(name);
  if (!leaf || leaf.kind !== 'leaf') {
    throw new Error(`expected a "${name}" leaf under plan`);
  }
  return leaf;
}

describe('plan command group', () => {
  it('is a group with create/explain/show/validate/list subcommands', () => {
    expect(planCommand.kind).toBe('group');
    if (planCommand.kind === 'group') {
      expect([...planCommand.subcommands.keys()].sort()).toEqual([
        'create',
        'explain',
        'list',
        'show',
        'validate',
      ]);
    }
  });
});

describe('plan create', () => {
  it('creates a plan from goal text and stores it in the session', async () => {
    const session: ShellSession = { history: [], plans: [], executions: [] };
    const result = await getSubcommand('create').execute(
      buildContext(['Build', 'a', 'website'], session),
    );

    expect(result.output).toContain('Plan plan-goal-');
    expect(result.success).toBe(true);
    expect(session.lastPlan).toBeDefined();
    expect(session.lastGoal).toBeDefined();
    expect(session.plans).toHaveLength(1);
    expect(session.lastPlan?.steps.length).toBeGreaterThan(0);
  });

  it('reports usage when no goal text is given', async () => {
    const result = await getSubcommand('create').execute(buildContext([]));
    expect(result.output).toContain('Usage: plan create <goal>');
    expect(result.success).toBe(false);
  });
});

describe('plan explain', () => {
  it('explains the most recently created plan', async () => {
    const session: ShellSession = { history: [], plans: [], executions: [] };
    await getSubcommand('create').execute(
      buildContext(['Build', 'a', 'website'], session),
    );

    const result = await getSubcommand('explain').execute(
      buildContext([], session),
    );

    expect(result.output).toContain('Rationale:');
    expect(result.success).toBe(true);
  });

  it('reports a helpful message when explaining with no prior plan', async () => {
    const result = await getSubcommand('explain').execute(buildContext([]));
    expect(result.output).toContain('No plan has been created yet');
    expect(result.success).toBe(false);
  });
});

describe('plan show', () => {
  it('re-displays the last plan without calling the engine', async () => {
    const session: ShellSession = { history: [], plans: [], executions: [] };
    await getSubcommand('create').execute(
      buildContext(['Build', 'a', 'website'], session),
    );

    const result = await getSubcommand('show').execute(
      buildContext([], session),
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain('Plan plan-goal-');
  });

  it('reports a helpful message with no prior plan', async () => {
    const result = await getSubcommand('show').execute(buildContext([]));
    expect(result.success).toBe(false);
  });
});

describe('plan validate', () => {
  it('structurally validates the last plan', async () => {
    const session: ShellSession = { history: [], plans: [], executions: [] };
    await getSubcommand('create').execute(
      buildContext(['Build', 'a', 'website'], session),
    );

    const result = await getSubcommand('validate').execute(
      buildContext([], session),
    );
    expect(result.data).toHaveProperty('valid');
    expect(result.output).toMatch(/valid|invalid/);
  });

  it('reports a helpful message with no prior plan', async () => {
    const result = await getSubcommand('validate').execute(buildContext([]));
    expect(result.success).toBe(false);
  });
});

describe('plan list', () => {
  it('lists every plan created this session', async () => {
    const session: ShellSession = { history: [], plans: [], executions: [] };
    await getSubcommand('create').execute(
      buildContext(['Build', 'a', 'website'], session),
    );
    await getSubcommand('create').execute(
      buildContext(['Ship', 'a', 'feature'], session),
    );

    const result = await getSubcommand('list').execute(
      buildContext([], session),
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain('2 plan(s)');
    expect(session.plans).toHaveLength(2);
  });

  it('reports an empty session with no plans created', async () => {
    const result = await getSubcommand('list').execute(buildContext([]));
    expect(result.output).toContain('no plans created');
  });
});
