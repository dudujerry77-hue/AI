# Phase 018: Titan Shell Control Plane

**Inserted ahead of Maintenance & Continuous Improvement by ADR-0010 (2026-08-08)** — Phase 017 (AI Shell & Command Interface) delivered a thin, ten-command proof-of-life CLI and closed with its own narrow, evidenced Exit Criteria. This phase is a separate, substantially larger body of work: redesigning that CLI into a hierarchical command-tree control plane capable of eventually driving the full seven-engine lifecycle. It does not reopen Phase 017 (whose record stays closed and accurate) and does not fold into the open-ended Maintenance phase (renumbered to Phase 019 by this same ADR). See `decisions.md` ADR-0010 for full rationale.

- **Status:** complete
- **Started:** 2026-08-08
- **Completed:** 2026-08-08
- **Agent(s) involved:** Claude

## Goal

Rebuild Titan Shell's command framework as an adapter/control-plane layer — a hierarchical command router, quote-and-flag-aware parsing, structured (human/JSON/concise) output, dispatcher-level error handling, and real exit codes — then use that framework to expose all commands implementable today against the seven engines' existing public APIs, organized around the real Goal → Plan → Workflow → Dispatch → Execution → Validation → Learning lifecycle rather than an arbitrary list of commands.

## Entry Criteria

- Phase 017 (AI Shell & Command Interface) is complete.
- The architecture proposal (command tree, services/adapters layer, `ShellSession` lifecycle chain, hand-written parser, output/exit-code design) is approved.

## Scope

- A command-tree router replacing the flat command map, supporting groups and subcommands.
- A hand-written, quote-aware tokenizer and typed flag parser (no new CLI-parsing dependency, per approved constraint).
- `CommandResult.data` plus human/JSON/concise rendering.
- Dispatcher-level error containment (no command can crash the shell) and real process exit codes.
- A `src/services/*.ts` adapter layer: thin request-shaping and session bookkeeping only, no engine business logic duplicated.
- `ShellSession` extended to represent the full lifecycle chain (`lastGoal` → `lastPlan` → `lastWorkflow` → `lastDispatch` → `lastExecution` → `lastValidation` → `lastLearning`).
- SYSTEM, KNOWLEDGE, PLANNING, ORCHESTRATION, EXECUTION, VALIDATION, and LEARNING commands backed by existing, already-public engine methods.
- A documentation-only record of the future AI/Agent Engine architectural direction.

## Explicit Non-Goals

- No `chat`/`ask`/`agent` commands or any AI/LLM interaction capability.
- No changes to any existing engine's public API.
- No fake/placeholder functionality for `context` (beyond existing lifecycle/status), Learning history, or `task cancel` (Execution Engine's `cancelExecution` remains a confirmed stub).
- No new CLI-parsing dependency unless a concrete requirement appears that the hand-written parser cannot reasonably handle.
- No authentication/authorization implementation (the existing gap is only surfaced in `doctor` output, not closed).
- No persistent/cross-run session storage.
- No real external I/O added to any engine.

## Milestones

1. **Framework rebuild** — command tree/router, parser, `CommandResult.data`/renderer, dispatcher error boundary, exit codes; port the existing 10 commands with no behavior change.
2. **Services layer + SYSTEM/KNOWLEDGE/PLANNING** — `engine`, `doctor`, `config`, `session`; full `knowledge` and `plan` command sets.
3. **ORCHESTRATION/EXECUTION** — full `workflow`/`task` command sets, exercising the session chain through `lastDispatch`/`lastExecution`.
4. **VALIDATION** — closes the chain through `lastValidation`. **LEARNING deferred** (2026-08-08, by explicit decision): `LearningEngine.observeCycle()` needs a `WorkflowResult` no `OrchestratorEngine` method produces — see Risks. `lastLearning` remains in `ShellSession`'s type (representing the full lifecycle, per Scope) but is never populated in this phase.
5. **Documentation-only** — record the AI/Agent Engine architectural direction in governance; no code.

Each milestone is followed by the relevant tests and quality gates (lint/build/test) before the next begins.

## Exit Criteria

- [x] The command router supports at least one real group/subcommand pair end-to-end, replacing the flat registry. (Five real groups exist: `knowledge`, `plan`, `workflow`, `task`, `validation`. Two convenience shorthands — bare `plan <goal>` and bare `knowledge` defaulting to `list` — were deliberately dropped in favor of explicit subcommands; disclosed in Milestone 2's history, not a silent loss.)
- [x] The parser correctly tokenizes quoted arguments and typed flags (`--limit 20`, `--json`, `--verbose`) with unit test coverage.
- [x] `CommandResult` carries structured `data`; human, JSON, and concise rendering all work and are tested.
- [x] The dispatcher catches thrown errors from any command without crashing the shell (regression-tested).
- [x] `process.exitCode` reflects command success/failure.
- [x] All in-scope Milestone 1-4 commands are implemented via the services layer against existing, unmodified engine public APIs, with unit tests. (LEARNING commands are out of scope for this phase — deferred per the confirmed capability gap in Risks, by explicit decision on 2026-08-08.)
- [ ] No existing engine public API was changed.
- [x] The AI/Agent Engine architectural direction is recorded in governance documentation.
- [x] `current_phase.md`, `changelog.md`, and `roadmap.md` reflect this phase's work.

## Dependencies

- Phase 017 completion.

## Risks

- Session-chain design (single active chain, in-memory only) may prove too narrow if a future phase needs concurrent chains — accepted as the simplest design that represents the real lifecycle without overengineering; revisit only if a concrete requirement demands it.
- Hand-written parser may hit a real limit (e.g. array-valued flags) — per the approved constraint, stop and ask before adding a dependency rather than silently expanding the hand-written parser into one.
- **Confirmed capability gap, surfaced during Milestone 4 (2026-08-08): `LearningEngine.observeCycle()` requires a `LearningSubject` (`{outcome: WorkflowResult, verdict: ValidationVerdict}`) — but no public `OrchestratorEngine` method produces a `WorkflowResult`.** `WorkflowResult` is exported as a type from `@titan/orchestrator` but no method returns one (`orchestrate`→`Workflow`, `getWorkflowStatus`→`WorkflowSummary`, `pauseWorkflow`/`resumeWorkflow`/`cancelWorkflow`→`Workflow`, `dispatchWorkflow`→`WorkflowDispatchResult` — verified against every method's actual signature). Since `generateProposal`/`prepareKnowledgeHandoff`/`analyzeCycle` all consume `LearningObservation` records that can themselves only legitimately come from `observeCycle`, this one missing capability blocks the entire Learning command surface — not fabricated with synthetic data, per explicit instruction. Documented here rather than silently built around or silently dropped; see Outcome/Handoff Notes for the disposition.

## Milestone History

### Milestone 1: Framework rebuild (2026-08-08)

Rebuilt the command framework: `apps/titan-shell/src/cli/command-parser.ts` now exports a quote-aware `tokenize()` and a `parseArgs()` typed-flag parser (`--name value`, `--name=value`, bare boolean `--name`, declared aliases); `apps/titan-shell/src/cli/types.ts` gained `CommandLeaf`/`CommandGroup`/`CommandNode` (a real tree, groups supported though no command uses one yet — that starts in Milestone 2), `CommandResult.success`/`data`, and `CommandContext.flags`/`format`/`verbose`; `apps/titan-shell/src/cli/output.ts` (new) renders `human`/`json`/`concise`; `apps/titan-shell/src/cli/command-registry.ts`'s `CommandRegistry` now resolves token paths through the tree and exposes a single `dispatchLine()` entry point wrapping every command execution in try/catch (never crashes the shell) and appending every dispatch to `session.history`; `apps/titan-shell/src/cli.ts` tracks per-session failure and resolves with `{ failed }`, letting the real entry point set `process.exitCode` without polluting `process.exitCode` for tests that call `runTitanShellCli()` directly. All ten existing commands were ported to the new `CommandLeaf` shape with equivalent behavior (same output text, same exit semantics) plus a `data` payload for JSON rendering. `ShellSession` was extended to the full `lastGoal → lastPlan → lastWorkflow → lastDispatch → lastExecution → lastValidation → lastLearning` chain (typed against the real engine return types) plus `history`, though only `lastGoal`/`lastPlan` are populated until Milestones 3-4. No existing engine public API changed.

Tests: `command-parser.test.ts` and `command-registry.test.ts` rewritten for the new tokenizer/parser/router/error-boundary/history behavior; `help-command.test.ts`, `status-command.test.ts`, `engines-command.test.ts`, `cli-commands-extra.test.ts` updated for the new `CommandContext`/`CommandResult` shapes. Full suite: 672/672 (was 653; +19 from the expanded parser/registry/help coverage). `npm run lint` and `npm run build` both clean. Manually verified end-to-end against the real CLI binary: `status --json`/`knowledge list --json` render valid structured JSON against real engine/`.titan/` data, `plan explain --concise` renders `OK`, an unknown command still prints the documented message, and the process exits `1` when any dispatched command fails in the session and `0` when all succeed — confirmed both ways by direct invocation, not inferred from unit tests alone.

### Milestone 2: Services layer + SYSTEM/KNOWLEDGE/PLANNING (2026-08-08)

Added `apps/titan-shell/src/services/knowledge-service.ts` and `planning-service.ts` — thin adapters over `KnowledgeEngine`/`PlannerEngine`'s already-public methods (`query`, `search`, `load`, `export`, `createPlan`, `explainPlan`, `validatePlan`); no engine business logic duplicated, no existing engine public API changed.

`knowledge` and `plan` became real `CommandGroup`s (the router's group/subcommand mechanism built in Milestone 1, now actually used for the first time): `knowledge list|search|get|export|status` under `apps/titan-shell/src/cli/commands/knowledge/`, `plan create|explain|show|validate|list` under `commands/plan/`. The old flat `knowledge.ts`/`plan.ts` leaves were deleted, not kept alongside. Two deliberate, disclosed behavior changes from Phase 017: bare `plan <goal>` (implicit `create`) and bare `knowledge` (implicit `list`) no longer work — every subcommand must now be named explicitly, in favor of a coherent, predictable group structure over convenience shorthands.

New top-level SYSTEM commands, all composed from data that already exists elsewhere (no engine changes): `engine <name>` (resolves by exact ID or short name, e.g. `engine knowledge`); `doctor` (a pass/fail sweep — engine count, each engine's health, Node version — plus an always-shown, non-blocking note that authorization is not enforced anywhere, so the process exit code stays meaningful for scripting rather than perpetually failing on a known, accepted gap); `config` (shell runtime config); `session` (the lifecycle chain's set/not-set state plus the last 10 history entries).

`ShellSession` gained `plans: Plan[]` (every plan created this session, `plan list`'s backing store — additive to, not a replacement for, the single-active-chain `lastPlan`/`lastGoal`/etc. fields).

Tests: three new files (`knowledge-commands.test.ts`, `plan-commands.test.ts`, `system-commands.test.ts`) covering every new subcommand and top-level command; `cli-commands-extra.test.ts` trimmed to the leaves that didn't move (`version`, `context`, `validate`, `clear`, `exit`). Full suite: 694/694 (was 672). `npm run lint` and `npm run build` both clean. Manually verified end-to-end: `doctor`, `engine knowledge`, `config`, `knowledge search governance --limit 3`, `plan create`/`validate`/`list`, and `session` all produced correct output against the real engines and real `.titan/` data in one continuous run, exit code `0`.

### Milestone 3: ORCHESTRATION/EXECUTION + session chain (2026-08-08)

Added `apps/titan-shell/src/services/{orchestration,execution}-service.ts` — thin adapters over `OrchestratorEngine`'s six real methods (`orchestrate`, `getWorkflowStatus`, `pauseWorkflow`, `resumeWorkflow`, `cancelWorkflow`, `dispatchWorkflow`) and `ExecutionEngine`'s three real methods (`execute`, `getExecutionStatus`, `reportResult`). `ExecutionEngine.cancelExecution` is deliberately NOT wrapped — it remains a confirmed, unconditional `NotImplementedError` stub, and per explicit instruction this phase does not fabricate a `task cancel` command around it.

New command groups: `workflow orchestrate|status|pause|resume|cancel|dispatch` (`commands/workflow/`) and `task execute|status|result|list` (`commands/task/`, with `output` registered as an alias for the same `result` leaf — the first real use of the router's alias-via-Map capability). `task execute [itemId]` defaults to the first dispatch-ready item from `session.lastDispatch.dispatchable` when no item is named.

`ShellSession` gained `executions: ExecutionRecord[]` (mirrors `plans`, backs `task list`). The full lifecycle chain now populates end-to-end through real use: `lastGoal → lastPlan → lastWorkflow → lastDispatch → lastExecution` (Validation/Learning remain in Milestone 4).

Tests: two new files (`workflow-commands.test.ts`, `task-commands.test.ts`) covering every subcommand, including the "requires the prior stage first" guard on each. Full suite: 708/708 (was 694). `npm run lint` and `npm run build` both clean. Manually verified the complete Goal→Plan→Workflow→Dispatch→Execution chain end-to-end in one continuous run against the real engines (`plan create` → `workflow orchestrate` → `workflow status` → `workflow dispatch` → `task execute` → `task status` → `task result` → `task list` → `session`), exit code `0`. No existing engine public API changed.

### Milestone 4: VALIDATION (2026-08-08) — LEARNING deferred out of phase scope

Added `apps/titan-shell/src/services/validation-service.ts` — a thin adapter over `ValidationEngine`'s two real methods (`validate`, `getValidationStatus`). `approveValidation`/`rejectValidation` are deliberately not wrapped — both are confirmed, unconditional `NotImplementedError` stubs.

The Milestone 1 placeholder `validate` command is now real: it takes `session.lastExecution`, calls `validate({subject: {record}})`, stores the resulting `verdict` on `session.lastValidation`, and reports success only when the verdict's status is `'pass'` (`'partial'`/`'fail'` are real, meaningful non-success outcomes, not framework errors — confirmed by a real manual run producing a genuine `'partial'` result with 0 checks against a freshly-built `ExecutionRecord`, which correctly set a non-zero exit code). A new `validation` group (`commands/validation/`) adds `status` (`getValidationStatus`) and `report` (session re-display, no engine call, same pattern as `plan show`/`workflow status`'s read-only siblings).

Tests: `validation-commands.test.ts`, chaining a real plan through workflow/dispatch/execution to reach a real verdict. Full suite: 712/712 (was 708). `npm run lint` and `npm run build` both clean. Manually verified end-to-end: `plan create` → `workflow orchestrate` → `workflow dispatch` → `task execute` → `validate` → `validation status` → `validation report` → `session`, against the real engines, with the exit code correctly reflecting the real `'partial'` verdict. No existing engine public API changed.

**Learning decision (2026-08-08):** presented the `WorkflowResult` gap (see Risks) to the user with three options — defer, propose an ADR for a new Orchestrator method now, or discuss further. Decision: **defer**. Phase 018 closes without a Learning command surface; the gap is recorded here and in Risks for a future phase/ADR to pick up (most likely: an Orchestrator method that produces a real `WorkflowResult`, or an alternate entry point into `LearningEngine.observeCycle()`). No Learning commands were built, faked, or stubbed to appear otherwise.

### Milestone 5: Documentation-only — AI/Agent Engine direction (2026-08-08)

Recorded the future AI/Agent Engine architectural direction in `VISION.md` §6 (Future Roadmap), as a new long-horizon theme: a future eighth engine implementing the standard `TitanEngine` lifecycle contract, composing the five existing lifecycle-stage engines (Planner/Orchestrator/Execution/Validation/Learning) rather than reimplementing them, with LLM provider abstraction/model selection/prompts/tool-calling/context injection/memory/permissions as its own novel surface — requiring its own future ADR and phase. No code changed. No existing engine public API changed. `architecture.md`'s approved 7-engine model (ADR-0002) is untouched; this is a forward-looking roadmap note, not an architecture amendment.

### Final Release Audit (2026-08-08)

A pre-commit audit of the full working tree (not just re-running tests) found and fixed two real issues before anything was committed:

1. **A genuine regression**: Phase 017's requirement that every command log via the Titan logger was dropped during Milestone 1's dispatcher rebuild — `CommandRegistry.dispatchLine()` only logged failures, never successful dispatches. Fixed by restoring a `logger.info('cli.command', {command, args, flags})` call at the start of every dispatch (`command-registry.ts`); added two regression tests (`command-registry.test.ts`) asserting it fires for a resolved command and does not fire for an unresolved one.
2. **`npm run format:check` (Prettier) failed on 34 files** — a required CI gate (`deployment_strategy.md`/`.github/workflows/ci.yml`) that hadn't been run during the milestone-by-milestone work. Fixed with `prettier --write` across the touched `apps/titan-shell/src` and `tests/unit` files; purely formatting, no semantic change (confirmed by an unchanged test count/behavior before and after).

Also re-verified: `git diff --check` clean (no whitespace errors); no new dependency introduced (`package.json`/`package-lock.json` untouched this phase, `tsx` unchanged from Phase 017); `engines/` and `apps/titan-shell/src/index.ts` (the `createTitanShell()` factory) completely untouched — no engine public API changed anywhere; no `chat`/`ask`/`agent` command exists; no fabricated Learning functionality (`lastLearning` is declared but never populated); `phase-019-maintenance-and-continuous-improvement.md`'s diff is the mechanical rename only, `Status: not-started` unchanged; no secrets, credentials, or machine-specific paths in the diff. Full suite after the fix: 714/714. `npm run lint`, `npm run build`, and `npm run format:check` all clean. Re-ran the full manual command checklist (`help`, `status`, `engines`, `engine <name>`, `doctor`, `config`, `knowledge list/search/get`, `plan create/explain/show --verbose`, `workflow orchestrate/status/dispatch`, `task execute/status`, `validate`, `validation status/report`, `status --json`, an invalid command, piped multi-command input) against the real binary — all correct, including exit code `1` on a session containing real failures and exit code `0` on an all-success session.

## Outcome

Rebuilt Titan Shell's command framework from Phase 017's flat, ten-command registry into a hierarchical command-tree control plane: a router supporting real command groups/subcommands, a hand-written quote-and-flag-aware parser, `CommandResult.data` with human/JSON/concise rendering, dispatcher-level error containment, and real process exit codes (Milestone 1) — then used that framework, via a new thin `src/services/*.ts` adapter layer, to expose SYSTEM (`engine`, `doctor`, `config`, `session`), KNOWLEDGE (`knowledge list|search|get|export|status`), PLANNING (`plan create|explain|show|validate|list`), ORCHESTRATION (`workflow orchestrate|status|pause|resume|cancel|dispatch`), EXECUTION (`task execute|status|result|list`), and VALIDATION (`validate`, `validation status|report`) commands, every one backed by an existing, unmodified, already-public engine method (Milestones 2-4). The full Goal → Plan → Workflow → Dispatch → Execution → Validation lifecycle chain was verified end-to-end against the real engines and real `.titan/` data, including a genuine `'partial'` validation verdict correctly producing a non-zero exit code. LEARNING was deferred, not faked: `LearningEngine.observeCycle()` needs a `WorkflowResult` no `OrchestratorEngine` method produces, a real capability gap surfaced during implementation, presented to the user, and explicitly deferred to a future phase/ADR rather than worked around (Milestone 4). The future AI/Agent Engine architectural direction was recorded in `VISION.md`, not implemented (Milestone 5). A pre-commit final release audit found and fixed a real logging regression and a repository-wide format-check failure, both now resolved and regression-tested. Across all five milestones plus the audit: coverage bringing the full suite from 653 to 714 passing tests, `npm run lint`/`npm run build`/`npm run format:check` all clean, and a real manual end-to-end CLI run verifying every milestone's behavior against the actual binary, not just unit tests. No existing engine public API was changed at any point.

## Handoff Notes for Next Phase

- **Learning gap is open and documented** (see Risks): a future phase should either add an `OrchestratorEngine` method producing a real `WorkflowResult` (its own ADR, since it's a new public API surface) or find another legitimate path to a `LearningObservation`, then build the deferred `learning`/`learn`/`proposal`/`analysis` command surface for real.
- **`context` remains lifecycle/status-only**: `ContextEngine` still exposes no public read method (unchanged since Phase 017). Any `context inspect`/`context show` command needs a new `ContextEngine` public method — its own ADR and explicit approval, per standing instruction.
- **AI/Agent Engine**: see `VISION.md` §6 for the recorded direction. Building it is its own future phase and ADR, not an extension of Phase 018/019.
- **Phase 019 (Maintenance & Continuous Improvement) remains not-started and not authorized.** Do not begin it without a separate, explicit instruction.
