import * as readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { createTitanShell } from './index';
import { createTitanCommandRegistry } from './cli/register-commands';
import { parseCommand } from './cli/command-parser';
import { TITAN_SHELL_VERSION } from './cli/commands/version';
import type { ShellSession } from './cli/types';

const PROMPT = 'Titan AI > ';

/**
 * Runs the interactive Titan Shell REPL against injectable I/O streams
 * (defaulting to the real process stdin/stdout), so it can be driven
 * programmatically in tests without touching the real terminal.
 */
export function runTitanShellCli(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<void> {
  const shell = createTitanShell();
  const registry = createTitanCommandRegistry();
  const session: ShellSession = {};

  output.write(`Titan AI v${TITAN_SHELL_VERSION}\n`);

  const rl = readline.createInterface({ input, output, prompt: PROMPT });

  // `readline` can emit several buffered 'line' events before an async
  // handler has a chance to run (e.g. piped, non-interactive stdin, where
  // the whole input arrives at once), and it closes itself on input EOF
  // independently of any command explicitly exiting. An explicit queue,
  // drained by exactly one in-flight loop, guarantees commands run one at
  // a time in the order typed — and, just as importantly, that every
  // already-queued command still runs to completion even if the interface
  // has already closed by the time it's reached. Only `rl`-specific calls
  // (`prompt()`, a second `close()`) are actually unsafe post-close, so
  // only those are guarded; queue draining and output writes are not.
  const pendingLines: string[] = [];
  let draining = false;
  let interfaceClosed = false;
  let exitRequested = false;
  let resolveDone: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  function settleIfFinished(): void {
    if (interfaceClosed && !draining && pendingLines.length === 0) {
      resolveDone();
    }
  }

  async function drainQueue(): Promise<void> {
    if (draining) {
      return;
    }
    draining = true;

    while (pendingLines.length > 0 && !exitRequested) {
      const line = pendingLines.shift() as string;
      const parsed = parseCommand(line);

      if (parsed) {
        shell.logger.info('cli.command', {
          command: parsed.name,
          args: parsed.args,
        });

        const result = await registry.dispatch(parsed.name, {
          shell,
          logger: shell.logger,
          session,
          args: parsed.args,
        });

        if (result.output) {
          output.write(`${result.output}\n`);
        }

        if (result.exit) {
          exitRequested = true;
          if (!interfaceClosed) {
            rl.close();
          }
          break;
        }
      }

      if (!exitRequested && !interfaceClosed) {
        rl.prompt();
      }
    }

    draining = false;
    settleIfFinished();
  }

  rl.on('line', (line) => {
    pendingLines.push(line);
    void drainQueue();
  });

  rl.on('close', () => {
    interfaceClosed = true;
    output.write('\n');
    settleIfFinished();
  });

  rl.prompt();

  return done;
}

// `pathToFileURL` (not string concatenation) correctly handles
// platform-specific path formats — a naive `file://${process.argv[1]}`
// produces a malformed URL on Windows (backslashes, missing drive-letter
// slash), which silently never matches `import.meta.url` and made this
// entry point a no-op when run directly.
const isMainModule =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1] as string).href;

if (isMainModule) {
  runTitanShellCli().catch((error: unknown) => {
    console.error('[titan] fatal error:', error);
    process.exitCode = 1;
  });
}
