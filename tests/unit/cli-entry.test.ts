import { PassThrough } from 'node:stream';
import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { runTitanShellCli } from '../../apps/titan-shell/src/cli';

function captureOutput(): { stream: PassThrough; text: () => string } {
  let text = '';
  const stream = new PassThrough();
  stream.on('data', (chunk: Buffer) => {
    text += chunk.toString('utf8');
  });
  return { stream, text: () => text };
}

describe('runTitanShellCli', () => {
  it('prints the version banner and prompt, then exits cleanly on "exit"', async () => {
    const input = new PassThrough();
    const { stream: output, text } = captureOutput();

    const done = runTitanShellCli(input, output);
    input.write('exit\n');
    input.end();

    await done;

    expect(text()).toContain('Titan AI v1.1');
    expect(text()).toContain('Titan AI > ');
    expect(text()).toContain('Goodbye.');
  });

  it('dispatches a real command (help) before exiting', async () => {
    const input = new PassThrough();
    const { stream: output, text } = captureOutput();

    const done = runTitanShellCli(input, output);
    input.write('help\n');
    input.write('exit\n');
    input.end();

    await done;

    expect(text()).toContain('Titan AI — available commands:');
  });

  it('prints the documented message for an unknown command without crashing', async () => {
    const input = new PassThrough();
    const { stream: output, text } = captureOutput();

    const done = runTitanShellCli(input, output);
    input.write('bogus\n');
    input.write('exit\n');
    input.end();

    await done;

    expect(text()).toContain('Unknown command.\nType "help".');
  });

  it('processes every queued command to completion even when the whole input arrives before any is handled (regression: piped/non-interactive stdin closes readline mid-drain)', async () => {
    const input = new PassThrough();
    const { stream: output, text } = captureOutput();

    const done = runTitanShellCli(input, output);
    // A single write + immediate end (rather than sequential writes)
    // mirrors how a real OS pipe (e.g. `printf '...' | tsx cli.ts`)
    // delivers input: the whole buffer is available before readline has
    // emitted a single 'line' event, so it can reach EOF and auto-close
    // while several commands are still queued/in flight.
    input.write('help\nstatus\nversion\nbogus\nexit\n');
    input.end();

    await done;

    const out = text();
    expect(out).toContain('Titan AI — available commands:');
    expect(out).toContain('Shell: Titan AI shell');
    expect(out).toContain('Titan AI v1.1');
    expect(out).toContain('Unknown command.\nType "help".');
    expect(out).toContain('Goodbye.');
  });
});
