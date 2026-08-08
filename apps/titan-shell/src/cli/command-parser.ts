export type FlagValue = string | number | boolean;

export interface FlagSpec {
  readonly name: string;
  readonly type: 'boolean' | 'string' | 'number';
  readonly alias?: string;
}

export interface ParsedArgs {
  readonly positional: readonly string[];
  readonly flags: Readonly<Record<string, FlagValue>>;
}

/**
 * Quote-aware tokenizer. Splits on whitespace but treats a `"..."` or
 * `'...'` span as a single token with the quotes stripped, so
 * `knowledge search "governance drift"` yields one argument, not two.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let hasToken = false;
  let quote: '"' | "'" | null = null;

  for (const char of input) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      hasToken = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (hasToken) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }
    current += char;
    hasToken = true;
  }
  if (hasToken) {
    tokens.push(current);
  }
  return tokens;
}

function coerce(raw: string, type: FlagSpec['type']): FlagValue {
  if (type === 'number') {
    const value = Number(raw);
    return Number.isNaN(value) ? raw : value;
  }
  if (type === 'boolean') {
    return raw !== 'false';
  }
  return raw;
}

/**
 * Separates a token list into positional arguments and flags. Flags are
 * `--name value`, `--name=value`, a bare `--name` (boolean `true`), or a
 * declared single-character alias (`-n`). Flags not declared in `specs`
 * are still captured — as a string if given a value, boolean `true`
 * otherwise — so cross-cutting flags like `--json`/`--verbose` work
 * without every leaf command declaring them.
 */
export function parseArgs(
  tokens: readonly string[],
  specs: readonly FlagSpec[] = [],
): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, FlagValue> = {};
  const byName = new Map(specs.map((spec) => [spec.name, spec]));
  const byAlias = new Map(
    specs
      .filter((spec) => spec.alias)
      .map((spec) => [spec.alias as string, spec]),
  );

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isLong = token.startsWith('--');
    const isAlias = !isLong && token.startsWith('-') && token.length > 1;

    if (!isLong && !isAlias) {
      positional.push(token);
      continue;
    }

    const body = isLong ? token.slice(2) : token.slice(1);
    const eq = body.indexOf('=');
    const rawName = eq >= 0 ? body.slice(0, eq) : body;
    const spec = isAlias ? byAlias.get(rawName) : byName.get(rawName);
    const name = spec?.name ?? rawName;

    if (eq >= 0) {
      flags[name] = coerce(body.slice(eq + 1), spec?.type ?? 'string');
      continue;
    }

    if (spec?.type === 'boolean') {
      flags[name] = true;
      continue;
    }

    const next = tokens[i + 1];
    const looksLikeValue = next !== undefined && !next.startsWith('-');
    if (looksLikeValue) {
      flags[name] = coerce(next, spec?.type ?? 'string');
      i++;
    } else {
      flags[name] = true;
    }
  }

  return { positional, flags };
}
