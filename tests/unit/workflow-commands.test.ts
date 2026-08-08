import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { planCommand } from '../../apps/titan-shell/src/cli/commands/plan';
import { workflowCommand } from '../../apps/titan-shell/src/cli/commands/workflow';
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

function getPlanSubcommand(name: string) {
  if (planCommand.kind !== 'group')
    throw new Error('expected planCommand to be a group');
  const leaf = planCommand.subcommands.get(name);
  if (!leaf || leaf.kind !== 'leaf')
    throw new Error(`expected a "${name}" leaf under plan`);
  return leaf;
}

function getWorkflowSubcommand(name: string) {
  if (workflowCommand.kind !== 'group')
    throw new Error('expected workflowCommand to be a group');
  const leaf = workflowCommand.subcommands.get(name);
  if (!leaf || leaf.kind !== 'leaf')
    throw new Error(`expected a "${name}" leaf under workflow`);
  return leaf;
}

async function sessionWithPlan(): Promise<ShellSession> {
  const session: ShellSession = { history: [], plans: [], executions: [] };
  await getPlanSubcommand('create').execute(
    buildContext(['Build', 'a', 'website'], session),
  );
  return session;
}

describe('workflow command group', () => {
  it('is a group with orchestrate/status/pause/resume/cancel/dispatch subcommands', () => {
    expect(workflowCommand.kind).toBe('group');
    if (workflowCommand.kind === 'group') {
      expect([...workflowCommand.subcommands.keys()].sort()).toEqual([
        'cancel',
        'dispatch',
        'orchestrate',
        'pause',
        'resume',
        'status',
      ]);
    }
  });
});

describe('workflow orchestrate', () => {
  it('requires a plan first', async () => {
    const result = await getWorkflowSubcommand('orchestrate').execute(
      buildContext([]),
    );
    expect(result.success).toBe(false);
    expect(result.output).toContain('No plan has been created yet');
  });

  it('translates the last plan into a workflow and stores it in the session', async () => {
    const session = await sessionWithPlan();
    const result = await getWorkflowSubcommand('orchestrate').execute(
      buildContext([], session),
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain('Workflow');
    expect(session.lastWorkflow).toBeDefined();
  });
});

describe('workflow status/pause/resume/cancel/dispatch', () => {
  it('all require a workflow first', async () => {
    for (const name of ['status', 'pause', 'resume', 'cancel', 'dispatch']) {
      const result = await getWorkflowSubcommand(name).execute(
        buildContext([]),
      );
      expect(result.success).toBe(false);
      expect(result.output).toContain('No workflow yet');
    }
  });

  it('reports status for an orchestrated workflow', async () => {
    const session = await sessionWithPlan();
    await getWorkflowSubcommand('orchestrate').execute(
      buildContext([], session),
    );

    const result = await getWorkflowSubcommand('status').execute(
      buildContext([], session),
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('workflowId');
  });

  it('pauses and resumes a workflow, updating session.lastWorkflow each time', async () => {
    const session = await sessionWithPlan();
    await getWorkflowSubcommand('orchestrate').execute(
      buildContext([], session),
    );

    const paused = await getWorkflowSubcommand('pause').execute(
      buildContext(['blocked on review'], session),
    );
    expect(paused.success).toBe(true);

    const resumed = await getWorkflowSubcommand('resume').execute(
      buildContext([], session),
    );
    expect(resumed.success).toBe(true);
  });

  it('dispatches a workflow and stores the result in the session', async () => {
    const session = await sessionWithPlan();
    await getWorkflowSubcommand('orchestrate').execute(
      buildContext([], session),
    );

    const result = await getWorkflowSubcommand('dispatch').execute(
      buildContext([], session),
    );
    expect(result.success).toBe(true);
    expect(session.lastDispatch).toBeDefined();
    expect(result.data).toHaveProperty('dispatchable');
  });
});
