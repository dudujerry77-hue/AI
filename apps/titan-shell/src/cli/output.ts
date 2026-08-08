import type { CommandResult, OutputFormat } from './types';

/**
 * Renders a `CommandResult` for the requested output format. `human` is
 * the existing free-text rendering; `json` serializes the structured
 * `data` payload (falling back to `null` if a command has none) alongside
 * `success`; `concise` is a one-line status form suited to scripting.
 */
export function renderResult(
  result: CommandResult,
  format: OutputFormat,
): string {
  if (format === 'json') {
    return JSON.stringify(
      {
        success: result.success,
        data: result.data ?? null,
        message: result.output,
      },
      null,
      2,
    );
  }

  if (format === 'concise') {
    if (result.success) {
      return 'OK';
    }
    const firstLine = result.output.split('\n')[0] ?? '';
    return firstLine.length > 0 ? `FAIL: ${firstLine}` : 'FAIL';
  }

  return result.output;
}
