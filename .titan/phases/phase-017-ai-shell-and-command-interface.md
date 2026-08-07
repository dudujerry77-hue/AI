# Phase 017: AI Shell & Command Interface

**Inserted by ADR-0009 (2026-08-07)**, ahead of the open-ended Maintenance & Continuous Improvement phase, which was renumbered to Phase 018 to make room. See `decisions.md` ADR-0009 for the full rationale.

- **Status:** complete
- **Started:** 2026-08-07
- **Completed:** 2026-08-07
- **Agent(s) involved:** Claude

## Objective

Build Titan AI's first usable, interactive command-line interface on top of the seven existing Titan Core engines — exposing real engine capabilities (status, health, planning, knowledge, validation) through a CLI, without redesigning the underlying engine architecture.

## Scope

- A CLI entry point under `apps/titan-shell`, built on the existing `createTitanShell()` factory (unchanged).
- A command parser and a command registry (table-driven dispatch — no giant switch statement).
- Read-oriented commands: `help`, `status`, `engines`, `version`, `plan create`/`plan explain` (plus bare `plan <goal>` as a shorthand for `plan create <goal>`), `context`, `knowledge list`, `validate` (placeholder — `ValidationEngine.validate()` requires an `ExecutionRecord`, not yet wired), `clear`, `exit`.
- Unit tests for the parser, the dispatcher/registry, and the `status`/`help`/`engines` commands, per repository testing conventions.
- No changes to existing engine public APIs unless a genuine gap is found that blocks a required command — any such gap is flagged and confirmed before implementation, not silently worked around.

## Deliverables

- A runnable CLI (`apps/titan-shell/src/cli.ts`), launched via `npx tsx src/cli.ts` from `apps/titan-shell` (or `npm run dev` in that workspace).
- `src/cli/command-parser.ts`, `src/cli/command-registry.ts`, `src/cli/commands/*.ts`.
- Unit tests under `tests/unit/`.
- Updated governance: `current_phase.md`, `changelog.md`, `roadmap.md` (this phase's insertion, per ADR-0009).

## Acceptance Criteria

- The CLI starts, prints a version banner, and presents an interactive prompt.
- Every specified command works against real engine calls where the underlying engine method exists and is implemented; commands that cannot be genuinely wired yet (validation execution, live context data) say so explicitly rather than fabricating output.
- Unknown commands print `Unknown command.\nType "help".` and do not crash the shell.
- Every command logs through the Titan logger (`@titan/shared`'s `createLogger()`), not ad hoc `console.log`.
- Dispatch is table-driven (a command registry), not a top-level `switch` statement.
- All business logic remains inside the engines; the CLI only parses input, invokes engine APIs, and formats output.

## Dependencies

- Phase 016 completion. **Met** (2026-08-07).

## Risks

- `PlannerEngine.createPlan()` requires a fully-formed `Goal` object, not a plain string — the CLI must construct one from free-text input using reasonable defaults (documented in code, not hidden).
- Several engines' business methods are themselves deterministic/structural placeholders rather than full implementations (already documented per-engine in `project_state.json`) — the CLI displays whatever these genuinely return, with explicit TODOs where a real capability doesn't exist yet, never fabricated richer output.
- `ValidationEngine.validate()` requires an `ExecutionRecord` as input, which nothing in this phase's scope produces — validation execution is explicitly deferred to a placeholder command rather than forced through with synthetic data.
- `ContextEngine` exposes no public method for reading live session/context data (a deliberate Phase 013 Milestone 1 boundary) — the `context` command is limited to engine lifecycle/status until a real public read API exists.
- `architecture.md` §6.5's suggested `/interfaces` package layout says a CLI should "address the Orchestrator only." This phase's introspection-style commands (`context`, `knowledge`, `validate`) read specific engines directly instead, consistent with §6.3's own carve-out that Context and Knowledge are safe to query directly (pure state/knowledge providers, not decision-makers) — documented here explicitly rather than silently diverging from the suggested layout.
- `tsx` is a genuinely new devDependency (verified: no usable installation exists anywhere in the repo today, despite an orphaned, non-functional `node_modules/tsx/` directory with no `package.json`) — recorded in `tech_stack.md` §6 for visibility, not requiring a full ADR (a dev-only TS execution tool, not a core architectural dependency).

## Exit Criteria

- [x] The CLI runs and presents the specified interactive prompt.
- [x] All specified commands are implemented, dispatch through a command registry, and behave per their documented Acceptance Criteria.
- [x] Unit tests exist and pass for the parser, the dispatcher, and the `status`/`help`/`engines` commands.
- [x] `current_phase.md`, `changelog.md`, and `roadmap.md` reflect this phase's work.

All four checked with real evidence: manual end-to-end runs against the actual seven engines and the actual `.titan/` corpus (`knowledge list` genuinely returned all 74 governance records), 653/653 automated tests passing (39 new), and the governance files updated in this same closure.

## Milestone History

- **CLI core:** `src/cli/types.ts`, `src/cli/engine-utils.ts` (single point of contact with `runtime/engine/*`, which has no `@titan/*` path alias), `src/cli/command-parser.ts`, `src/cli/command-registry.ts` (table-driven dispatch — a `Map`, never a `switch`).
- **Commands (`src/cli/commands/*.ts`):** `help` (built dynamically from the live registry, so it can't drift), `status`, `engines`, `version`, `plan` (`create`/`explain`, plus bare `plan <goal>` as shorthand — builds a valid `Goal` from free text per `engines/planner/src/analysis/goal-analyzer.ts`'s validation rules), `context` (lifecycle/status only — `ContextEngine` has no public read method, see Risks), `knowledge` (`list`, via `KnowledgeEngine.query({})`, summarized table only, never raw records), `validate` (documented placeholder — `ValidationEngine.validate()` needs an `ExecutionRecord` nothing here produces), `clear`, `exit`.
- **Entry point:** `apps/titan-shell/src/cli.ts`, built on the unmodified `createTitanShell()` factory. `apps/titan-shell/package.json` gained `dev`/`start`/`build` scripts; root `package.json` gained a `shell` script and the `tsx` devDependency.
- **Two real bugs found during manual end-to-end verification** (not caught by the initial PassThrough-stream-based tests) and fixed, each with a regression test or documented reproduction:
  1. The main-module check used `` `file://${process.argv[1]}` `` string concatenation instead of `pathToFileURL()`, which silently never matches on Windows paths — made the CLI a complete no-op when run directly via `npx tsx src/cli.ts`. Fixed with `node:url`'s `pathToFileURL`.
  2. Command processing wasn't correctly serialized against piped/non-interactive stdin: Node's `readline` can emit several buffered `'line'` events, and auto-close on input EOF, independently of any command explicitly exiting — this corrupted output ordering and silently dropped not-yet-processed queued commands (verified: `validate`, an unknown command, and `exit` never ran after a large `knowledge list` output, yet the process still exited `0`). Fixed with an explicit line queue drained by exactly one in-flight loop, decoupled from `readline`'s own open/closed state; added `tests/unit/cli-entry.test.ts`'s regression test reproducing the exact race (single `write()` + immediate `end()`, mirroring real OS pipe timing).
- **Tests:** `tests/unit/command-parser.test.ts`, `command-registry.test.ts`, `status-command.test.ts`, `help-command.test.ts`, `engines-command.test.ts` (the five explicitly required), plus `cli-commands-extra.test.ts` (light coverage for `version`/`plan`/`context`/`knowledge`/`validate`/`clear`/`exit`) and `cli-entry.test.ts` (the interactive loop itself, via injectable streams). 39 new tests; full suite 653/653 (the one pre-existing, previously-documented flaky Validation Engine test reproduced its known intermittent failure once during this session, then passed on immediate re-run — unrelated to this phase's changes, tracked separately since Phase 014).
- **Real finding, not a bug:** `KnowledgeEngine`'s constructor marks itself `degraded` (not `healthy`) until `initialize()` is called (`engines/knowledge/src/index.ts`), unlike the other six engines, which default to `healthy`. The `engines`/`status` commands report this accurately (`✗ Knowledge` alongside six `✓`s) — tests were written to assert this real behavior rather than assuming uniform health.

## Handoff Notes

**Phase 017 is complete.** Phase 018 (Maintenance & Continuous Improvement) is eligible to begin (its entry criteria, "Phase 017 completion," are now met) but has **not** been started or authorized, per this project's standing "eligibility is not authorization" principle. Two things worth knowing for whoever picks this up: (1) `context` and `validate` are intentionally partial — closing them for real requires new engine-level capabilities (a public `ContextEngine` read method; something that produces a genuine `ExecutionRecord`), each flagged with a `TODO(phase-017)` comment and a citation back to this document; (2) `architecture.md` §6.5 suggests a CLI should "address the Orchestrator only" — this phase's introspection commands read specific engines directly instead, consistent with §6.3's Context/Knowledge carve-out, documented in Risks above rather than silently diverged from.
