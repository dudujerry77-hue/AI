import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { planCommand } from '../../apps/titan-shell/src/cli/commands/plan';
import { workflowCommand } from '../../apps/titan-shell/src/cli/commands/workflow';
import { taskCommand } from '../../apps/titan-shell/src/cli/commands/task';
import { validateCommand } from '../../apps/titan-shell/src/cli/commands/validate';
import { validationCommand } from '../../apps/titan-shell/src/cli/commands/validation';
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
  group: typeof workflowCommand | typeof taskCommand | typeof validationCommand,
  name: string,
) {
  if (group.kind !== 'group') throw new Error('expected a group');
  const leaf = group.subcommands.get(name);
  if (!leaf || leaf.kind !== 'leaf')
    throw new Error(`expected a "${name}" leaf`);
  return leaf;
}

function getPlanSubcommand(name: string) {
  if (planCommand.kind !== 'group')
    throw new Error('expected planCommand to be a group');
  const leaf = planCommand.subcommands.get(name);
  if (!leaf || leaf.kind !== 'leaf')
    throw new Error(`expected a "${name}" leaf under plan`);
  return leaf;
}

async function sessionWithExecution(): Promise<ShellSession> {
  const session: ShellSession = { history: [], plans: [], executions: [] };
  await getPlanSubcommand('create').execute(
    buildContext(['Build', 'a', 'website'], session),
  );
  await getSubcommand(workflowCommand, 'orchestrate').execute(
    buildContext([], session),
  );
  await getSubcommand(workflowCommand, 'dispatch').execute(
    buildContext([], session),
  );
  await getSubcommand(taskCommand, 'execute').execute(
    buildContext([], session),
  );
  return session;
}

describe('validate', () => {
  it('requires an execution first', async () => {
    const result = await validateCommand.execute(buildContext([]));
    expect(result.success).toBe(false);
    expect(result.output).toContain('No execution yet');
  });

  it('runs real validation against the current execution record and stores the verdict', async () => {
    const session = await sessionWithExecution();

    const result = await validateCommand.execute(buildContext([], session));

    expect(result.data).toHaveProperty('verdict');
    expect(session.lastValidation).toBeDefined();
    expect(result.output).toContain('Validation');
  });
});

describe('validation status and report', () => {
  it('both require a validation first', async () => {
    for (const name of ['status', 'report']) {
      const result = await getSubcommand(validationCommand, name).execute(
        buildContext([]),
      );
      expect(result.success).toBe(false);
      expect(result.output).toContain('No validation yet');
    }
  });

  it('report re-displays the stored verdict without an engine call', async () => {
    const session = await sessionWithExecution();
    await validateCommand.execute(buildContext([], session));

    const result = await getSubcommand(validationCommand, 'report').execute(
      buildContext([], session),
    );
    expect(result.success).toBe(true);
    expect(result.data).toBe(session.lastValidation);
  });

  it('status structurally validates the stored verdict', async () => {
    const session = await sessionWithExecution();
    await validateCommand.execute(buildContext([], session));

    const result = await getSubcommand(validationCommand, 'status').execute(
      buildContext([], session),
    );
    expect(result.data).toHaveProperty('valid');
  });
});
