# CURRENT PHASE

**Document Class:** Live Status
**Authority:** Must always match the "in-progress" row in `roadmap.md` and the `current_phase` field in `project_state.json`. If any of the three disagree, treat this file as suspect and reconcile against `roadmap.md` (the canonical sequence) and `sessions/` (the actual history) before trusting any single source.

---

## Active Phase

- **Phase ID:** 019
- **Name:** Maintenance & Continuous Improvement
- **Status:** not-started
- **Started:**
- **Completed:**

**No phase is currently in-progress.** Phase 018 ("Titan Shell Control Plane," inserted by ADR-0010) completed 2026-08-08. Phase 019 is next per `roadmap.md` and its entry criteria ("Phase 018 completion") are now met, but **it has not been started and is not authorized by Phase 018's closure** — beginning it requires a separate, explicit instruction, per the same pattern used at every phase boundary in this project.

## Prior Phase Completed

- **Phase ID:** 018
- **Name:** Titan Shell Control Plane
- **Status:** complete
- **Completed:** 2026-08-08

## Exit Criteria (prior phase — 018, for reference)

- [x] The command router supports at least one real group/subcommand pair end-to-end, replacing the flat registry (five real groups: `knowledge`, `plan`, `workflow`, `task`, `validation`).
- [x] The parser correctly tokenizes quoted arguments and typed flags, with unit test coverage.
- [x] `CommandResult` carries structured `data`; human, JSON, and concise rendering all work and are tested.
- [x] The dispatcher catches thrown errors from any command without crashing the shell (regression-tested).
- [x] `process.exitCode` reflects command success/failure.
- [x] All in-scope Milestone 1-4 commands are implemented via the services layer against existing, unmodified engine public APIs, with unit tests (LEARNING deferred — see Notes).
- [x] No existing engine public API was changed.
- [x] The AI/Agent Engine architectural direction is recorded in governance documentation (`VISION.md` §6).
- [x] `current_phase.md`, `changelog.md`, and `roadmap.md` reflect this phase's work.

All checked, with real evidence (five milestones plus a pre-commit final release audit, each independently verified end-to-end against the real CLI binary and real engines; full suite grew from 653 to 714 passing tests; lint, build, and format:check clean throughout) — see `phases/phase-018-titan-shell-control-plane.md`'s Milestone History.

## Notes

- **Phase 018 (Titan Shell Control Plane) is complete** (2026-08-08). Rebuilt the Phase 017 ten-command CLI into a hierarchical control plane: command-tree router, quote/flag-aware parser, `CommandResult.data` + human/JSON/concise rendering, dispatcher-level error containment, real exit codes, a `src/services/*.ts` adapter layer, and a `ShellSession` lifecycle chain. Exposed SYSTEM (`engine`/`doctor`/`config`/`session`), KNOWLEDGE, PLANNING, ORCHESTRATION, EXECUTION, and VALIDATION commands, every one backed by an existing, unmodified engine public method. No existing engine public API changed. Full record in `phases/phase-018-titan-shell-control-plane.md`.
- **LEARNING commands were deferred, not faked.** `LearningEngine.observeCycle()` requires a `WorkflowResult` that no `OrchestratorEngine` method produces — a real capability gap discovered mid-implementation, presented to the user with options, and explicitly deferred to a future phase/ADR rather than worked around with synthetic data. See `phases/phase-018-titan-shell-control-plane.md`'s Risks and Handoff Notes for the next agent to pick this up.
- **The future AI/Agent Engine architectural direction is recorded in `VISION.md` §6** — a future eighth engine, not an extension of the shell or any existing engine's public API. Documentation only; `architecture.md`'s approved 7-engine model (ADR-0002) is unchanged.
- **Phase 018 was inserted ahead of Phase 019** (the former Phase 018, "Maintenance & Continuous Improvement," renumbered per ADR-0010) because it didn't fit that open-ended phase's own Objective/Scope/Exit Criteria — the same reasoning ADR-0009 applied one phase earlier. Full rationale in `decisions.md` ADR-0010.
- **Phase 017 (AI Shell & Command Interface) is complete** (2026-08-07) — Titan AI's first usable interactive CLI. Full record in `phases/phase-017-ai-shell-and-command-interface.md`'s Milestone History; superseded in practice by Phase 018's rebuild, but its own record stays closed and accurate as a historical snapshot.
- Two small, non-blocking follow-ups carried from Phase 016, still open: the `production` GitHub environment has no protection rules yet; `phases/README.md`'s index has been kept current through Phase 018's closure.

## Instructions for Whoever Reads This Next

1. Phases 000–018 are complete, in dependency order per `roadmap.md`. Phase 019 (Maintenance & Continuous Improvement) is next but **has not been started**.
2. **Do not begin Phase 019 work without an explicit instruction to do so.** Its entry condition (Phase 018 completion) is met, but eligibility is not authorization.
3. If asked to close the Learning gap for real: it needs a new `OrchestratorEngine` public method producing a real `WorkflowResult` (or another legitimate path to a `LearningObservation`) — new engine-API surface, its own ADR and explicit approval, not CLI-layer work. See `phases/phase-018-titan-shell-control-plane.md`'s Handoff Notes.
4. If asked to build the AI/Agent Engine: see `VISION.md` §6 for the recorded direction. It is its own future phase and ADR, not an extension of Phase 018/019.
5. When Phase 019 work begins, update this file's Active Phase section (Status: in-progress, fill in Started), update `project_state.json`, and append to `changelog.md`.
6. If you are picking this project back up after a long gap, also skim the last 2–3 files in `sessions/` for tacit context not yet promoted into these governance docs.
