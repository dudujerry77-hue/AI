import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { planCommand } from '../../apps/titan-shell/src/cli/commands/plan';
import { workflowCommand } from '../../apps/titan-shell/src/cli/commands/workflow';
import { taskCommand } from '../../apps/titan-shell/src/cli/commands/task';
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

function getSubcommand(
  group: typeof planCommand | typeof workflowCommand | typeof taskCommand,
  name: string,
) {
  if (group.kind !== 'group') throw new Error('expected a group');
  const leaf = group.subcommands.get(name);
  if (!leaf || leaf.kind !== 'leaf')
    throw new Error(`expected a "${name}" leaf`);
  return leaf;
}

async function sessionWithDispatch(): Promise<ShellSession> {
  const session: ShellSession = { history: [], plans: [], executions: [] };
  await getSubcommand(planCommand, 'create').execute(
    buildContext(['Build', 'a', 'website'], session),
  );
  await getSubcommand(workflowCommand, 'orchestrate').execute(
    buildContext([], session),
  );
  await getSubcommand(workflowCommand, 'dispatch').execute(
    buildContext([], session),
  );
  return session;
}

describe('task command group', () => {
  it('is a group with execute/status/result/list subcommands (output aliases result)', () => {
    expect(taskCommand.kind).toBe('group');
    if (taskCommand.kind === 'group') {
      expect(taskCommand.subcommands.get('output')).toBe(
        taskCommand.subcommands.get('result'),
      );
      expect(
        [...new Set(taskCommand.subcommands.values())]
          .map((leaf) => leaf.name)
          .sort(),
      ).toEqual(['execute', 'list', 'result', 'status']);
    }
  });
});

describe('task execute', () => {
  it('requires a dispatch result first', async () => {
    const result = await getSubcommand(taskCommand, 'execute').execute(
      buildContext([]),
    );
    expect(result.success).toBe(false);
    expect(result.output).toContain('No dispatch result yet');
  });

  it('executes the first dispatchable item by default and stores it in the session', async () => {
    const session = await sessionWithDispatch();
    expect(session.lastDispatch?.dispatchable.length).toBeGreaterThan(0);

    const result = await getSubcommand(taskCommand, 'execute').execute(
      buildContext([], session),
    );

    expect(result.success).toBe(true);
    expect(session.lastExecution).toBeDefined();
    expect(session.executions).toHaveLength(1);
  });
});

describe('task status and result', () => {
  it('require an execution first', async () => {
    for (const name of ['status', 'result']) {
      const result = await getSubcommand(taskCommand, name).execute(
        buildContext([]),
      );
      expect(result.success).toBe(false);
      expect(result.output).toContain('No execution yet');
    }
  });

  it('report status and a summary for a real execution', async () => {
    const session = await sessionWithDispatch();
    await getSubcommand(taskCommand, 'execute').execute(
      buildContext([], session),
    );

    const status = await getSubcommand(taskCommand, 'status').execute(
      buildContext([], session),
    );
    expect(status.data).toHaveProperty('valid');

    const result = await getSubcommand(taskCommand, 'result').execute(
      buildContext([], session),
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain('Execution');
  });
});

describe('task list', () => {
  it('reports an empty session with no executions', async () => {
    const result = await getSubcommand(taskCommand, 'list').execute(
      buildContext([]),
    );
    expect(result.output).toContain('no executions');
  });

  it('lists every execution produced this session', async () => {
    const session = await sessionWithDispatch();
    await getSubcommand(taskCommand, 'execute').execute(
      buildContext([], session),
    );

    const result = await getSubcommand(taskCommand, 'list').execute(
      buildContext([], session),
    );
    expect(result.output).toContain('1 execution(s)');
  });
});
