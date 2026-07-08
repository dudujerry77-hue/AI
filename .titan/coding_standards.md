# CODING STANDARDS

**Document Class:** Technical Governance
**Authority:** Subordinate to `architecture.md`. Binding on all code contributed by any agent or human.
**Purpose:** Defines how code must be written so that it remains consistent regardless of which AI model or human produced it.

---

## 1. Universal Principles (Language-Agnostic)

1. **Clarity over cleverness.** Code is read far more often than it is written. If a clever one-liner requires a comment to explain it, write the clearer version instead.
2. **Small units of work.** Functions/methods should do one thing. If you need "and" to describe what a function does, consider splitting it.
3. **No dead code.** Do not leave commented-out code, unused variables, or unreachable branches in committed code. Delete it — version control remembers it.
4. **No magic values.** Numbers, strings, and configuration values with semantic meaning must be named constants, not inline literals repeated across the codebase.
5. **Errors are handled, not ignored.** Never swallow an exception/error silently. At minimum, log it with context; in most cases, handle it explicitly or propagate it deliberately.
6. **Comments explain "why," not "what."** The code already shows what it does. Comments should explain intent, trade-offs, or non-obvious constraints.
7. **No fabricated implementations.** Never stub out a function to return fake/hardcoded data and present it as working functionality. If something is a placeholder, mark it clearly (e.g., `// NOT IMPLEMENTED: see phases/phase-00X`) and log it in the session log.
8. **Consistent formatting is automated, not manual.** Use a formatter (Prettier, Black, gofmt, etc. depending on stack) enforced via pre-commit hook and CI — do not rely on agents to manually match style.

## 2. Function & Method Design

- Prefer pure functions where possible (no hidden side effects) — especially in `/domain`.
- Keep parameter lists short; group related parameters into a single object/struct when it improves clarity.
- Guard clauses over deep nesting: return/throw early rather than wrapping the whole function body in a conditional.
- Public functions/methods that are part of a module's contract should have a short doc-comment describing purpose, parameters, return value, and error conditions.

## 3. Error Handling

- Distinguish between **expected, recoverable conditions** (return a result/error value) and **unexpected, unrecoverable conditions** (throw/panic and let it surface loudly in development).
- Never catch an error only to log `error` with no other context. Include enough information to diagnose the issue without needing to reproduce it.
- User-facing error messages must never leak internal implementation details, stack traces, or secrets (see `security_policy.md`).

## 4. Comments & Documentation in Code

- Every module/file should open with a brief comment describing its responsibility.
- Non-obvious algorithms or business rules must be explained inline, ideally with a reference to the requirement or ADR that motivated them.
- TODOs are permitted only when paired with a tracking reference (e.g., `// TODO(phase-005): handle pagination — see phases/phase-005-*.md`). A bare `// TODO` with no reference is not acceptable.

## 5. Code Review Expectations

All non-trivial code changes should be reviewable against `reviews/` templates before being considered "Done" per `constitution.md` Section 5. Reviews check for:

- Compliance with this document and `naming_conventions.md`.
- Test coverage per `testing_strategy.md`.
- No security regressions per `security_policy.md`.
- Alignment with `architecture.md`.

## 6. Language-Specific Notes (Applied Once a Stack Is Chosen)

Once `tech_stack.md` records a selected stack, this section should be extended with language-specific conventions (e.g., TypeScript strictness settings, Python type-hinting requirements, Go error-wrapping conventions). Until then, the universal principles above apply regardless of language.

## 7. Commit & Change Hygiene

- Commits should be small, focused, and described using the convention in `naming_conventions.md`.
- Every commit that changes behavior should be paired with a test change (new test, updated test, or explicit note why none is needed).
- Never commit directly to a production branch without passing CI (see `deployment_strategy.md`).
