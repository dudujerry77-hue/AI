import type { CommandContext, CommandLeaf, CommandResult } from '../../types';

export const taskListCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'list',
  usage: 'task list',
  description:
    'List every execution record produced this session (session-local, not persisted).',
  execute: (context: CommandContext): CommandResult => {
    const { executions } = context.session;
    if (executions.length === 0) {
      return {
        success: true,
        output: '(no executions this session)',
        data: [],
      };
    }

    const lines = executions.map(
      (record) =>
        `  - ${record.executionId} (status: ${record.status}, target: ${record.target.itemId})`,
    );
    return {
      success: true,
      output: `${executions.length} execution(s) this session:\n\n${lines.join('\n')}`,
      data: executions.map((record) => ({
        executionId: record.executionId,
        status: record.status,
      })),
    };
  },
};
