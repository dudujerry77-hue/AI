import type { CommandContext, CommandDefinition, CommandResult } from './types';

const UNKNOWN_COMMAND_RESULT: CommandResult = {
  output: 'Unknown command.\nType "help".',
};

/**
 * Table-driven command dispatcher. Deliberately not a `switch` statement:
 * commands are registered once, then looked up by name — adding a command
 * never touches this class.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  register(command: CommandDefinition): void {
    this.commands.set(command.name, command);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  list(): readonly CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  async dispatch(
    name: string,
    context: CommandContext,
  ): Promise<CommandResult> {
    const command = this.commands.get(name);
    if (!command) {
      return UNKNOWN_COMMAND_RESULT;
    }
    return command.execute(context);
  }
}
