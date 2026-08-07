import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { enginesCommand } from '../../apps/titan-shell/src/cli/commands/engines';
import type { CommandContext } from '../../apps/titan-shell/src/cli/types';

function buildContext(): CommandContext {
  const shell = createTitanShell();
  return { shell, logger: shell.logger, session: {}, args: [] };
}

describe('enginesCommand', () => {
  it('lists all seven engines, one per line, each with a health mark', async () => {
    const result = await enginesCommand.execute(buildContext());
    const lines = result.output.split('\n');

    expect(lines).toHaveLength(7);
    for (const line of lines) {
      expect(line.startsWith('✓ ') || line.startsWith('✗ ')).toBe(true);
    }
  });

  it('shows short engine names without the "Engine" suffix', async () => {
    const result = await enginesCommand.execute(buildContext());

    // KnowledgeEngine's constructor marks itself `degraded` until
    // `initialize()` is called (engines/knowledge/src/index.ts,
    // `healthMonitor.markDegraded('created')`) — unlike the other six
    // engines, which default to `healthy`. This is real, pre-existing
    // engine behavior, not a CLI bug, so it is genuinely `✗` here.
    expect(result.output).toContain('✓ Context');
    expect(result.output).toContain('✗ Knowledge');
    expect(result.output).toContain('✓ Planner');
    expect(result.output).toContain('✓ Orchestrator');
    expect(result.output).toContain('✓ Execution');
    expect(result.output).toContain('✓ Validation');
    expect(result.output).toContain('✓ Learning');
    expect(result.output).not.toContain('Engine');
  });
});
