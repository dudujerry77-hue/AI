import { CommandRegistry } from './command-registry';
import { createHelpCommand } from './commands/help';
import { statusCommand } from './commands/status';
import { enginesCommand } from './commands/engines';
import { versionCommand } from './commands/version';
import { planCommand } from './commands/plan';
import { contextCommand } from './commands/context';
import { knowledgeCommand } from './commands/knowledge';
import { validateCommand } from './commands/validate';
import { clearCommand } from './commands/clear';
import { exitCommand } from './commands/exit';

/** Builds a fresh registry with every Titan Shell command registered. */
export function createTitanCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  registry.register(statusCommand);
  registry.register(enginesCommand);
  registry.register(versionCommand);
  registry.register(planCommand);
  registry.register(contextCommand);
  registry.register(knowledgeCommand);
  registry.register(validateCommand);
  registry.register(clearCommand);
  registry.register(exitCommand);
  registry.register(createHelpCommand(() => registry.list()));

  return registry;
}
