export interface ParsedCommand {
  readonly name: string;
  readonly args: readonly string[];
  readonly raw: string;
}

/**
 * Splits a raw input line into a lowercased command name and its
 * remaining whitespace-separated arguments. Returns `null` for
 * empty/whitespace-only input rather than a command with an empty name.
 */
export function parseCommand(input: string): ParsedCommand | null {
  const raw = input.trim();
  if (raw.length === 0) {
    return null;
  }

  const [name, ...args] = raw.split(/\s+/);
  return { name: name.toLowerCase(), args, raw };
}
