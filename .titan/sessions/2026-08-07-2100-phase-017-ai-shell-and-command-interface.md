# Session Log: Phase 017 — AI Shell & Command Interface

- **Date:** 2026-08-07
- **Agent:** Claude
- **Phase:** 017 — AI Shell & Command Interface

## What Was Done

**Governance (ADR-0009):** The requested work — a CLI/command interface on top of the seven Titan Core engines — did not match the existing Phase 017's definition ("Maintenance & Continuous Improvement," an open-ended operations phase). Flagged this before writing any code. With explicit direction, recorded ADR-0009: inserted a new Phase 017 ("AI Shell & Command Interface") and renumbered the prior Phase 017 to Phase 018, its content preserved unchanged via `git mv`. Updated `roadmap.md`, `phases/README.md`, `current_phase.md`, and `project_state.json` to match, mirroring the precedent ADR-0002 already set for inserting phases.

**Implementation:** Built `apps/titan-shell/src/cli.ts` on the existing, unmodified `createTitanShell()` factory. Added a table-driven command registry (`src/cli/command-registry.ts`, `src/cli/command-parser.ts` — a `Map` lookup, never a `switch`) and ten commands (`src/cli/commands/*.ts`): `help` (built dynamically from the live registry), `status`, `engines`, `version`, `plan` (`create`/`explain`, plus bare `plan <goal>` shorthand — constructs a valid `Goal` from free text per `GoalAnalyzer`'s validation rules), `context` (lifecycle/status only — `ContextEngine` has no public read method), `knowledge` (`list`, via `KnowledgeEngine.query({})`, summarized table only), `validate` (documented placeholder — needs an `ExecutionRecord` nothing here produces), `clear`, `exit`. No existing engine public API was changed. Added `tsx` as a devDependency (verified genuinely new — no usable installation existed anywhere in the repo, despite an orphaned `node_modules/tsx/` with no `package.json`) and `dev`/`start`/`build` scripts.

**Tests:** 39 new unit tests across 7 files (`command-parser`, `command-registry`, `status-command`, `help-command`, `engines-command` — the five explicitly required — plus `cli-commands-extra` and `cli-entry`, covering the remaining commands and the interactive loop itself via injectable streams). Full suite: 653/653.

**Manual end-to-end verification** (piping real commands into the real `tsx apps/titan-shell/src/cli.ts`) found and fixed two real bugs the automated PassThrough-stream tests hadn't caught:
1. The main-module check used string concatenation (`` `file://${process.argv[1]}` ``) instead of `pathToFileURL()`, which silently never matched on Windows, making the CLI a complete no-op when run directly.
2. Command processing wasn't correctly serialized against piped/non-interactive stdin — `readline` can auto-close on input EOF independently of any command exiting, and with the whole input available at once, this raced ahead of an in-flight async command, corrupting output ordering and silently dropping still-queued commands (confirmed: `validate`, an unknown command, and `exit` never ran after a large `knowledge list` output, yet the process still exited `0`). Rewrote command dispatch as an explicit queue drained by exactly one in-flight loop, decoupled from `readline`'s own open/closed state; added a regression test reproducing the exact race.

Also discovered, and correctly reflected rather than "fixed away": `KnowledgeEngine`'s constructor marks itself `degraded` (not `healthy`) until `initialize()` is called, unlike the other six engines. The `engines`/`status` commands report this accurately; tests assert the real behavior instead of assuming uniform health.

## Why

Phase 016 closed with an explicit, well-scoped follow-up: Titan AI had seven working engines but no usable way for a human to actually interact with them. This phase builds that first interface, deliberately kept thin (parse → invoke → format) so all business logic stays inside the engines, per `architecture.md`'s layering principles.

## What Remains

Nothing blocking Phase 017's own closure. Two things intentionally partial, each with a `TODO(phase-017)` code comment: the `context` command (needs a public `ContextEngine` read method that doesn't exist yet) and the `validate` command (needs something that produces a real `ExecutionRecord`). Both are documented as deliberate scope boundaries in `phases/phase-017-ai-shell-and-command-interface.md`'s Risks, not oversights.

## Risks / Open Items

- `architecture.md` §6.5 suggests a CLI's `/interfaces` layer should "address the Orchestrator only." This phase's introspection commands (`context`, `knowledge`, `validate`) read specific engines directly instead — consistent with §6.3's own carve-out that Context and Knowledge are safe to query directly, documented explicitly rather than silently diverged from.
- The one pre-existing, previously-documented flaky Validation Engine test (tracked since Phase 014) reproduced its known intermittent failure once during this session, then passed on immediate re-run — unrelated to this phase, not investigated further here.
- Carried from Phase 016: the `production` GitHub environment still has no protection rules configured.

## Next Agent Should

Phase 018 (Maintenance & Continuous Improvement, renumbered from the original Phase 017) is eligible to begin but has **not** been started or authorized. Do not begin it without an explicit instruction. If asked to close the `context`/`validate` gaps for real, that means designing a new public `ContextEngine` read method and/or a real `ExecutionRecord` source — both are new engine-API surface, not CLI-layer work, and should go through the same "confirm before extending a public contract" discipline this phase followed.
