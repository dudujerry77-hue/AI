# CURRENT PHASE

**Document Class:** Live Status
**Authority:** Must always match the "in-progress" row in `roadmap.md` and the `current_phase` field in `project_state.json`. If any of the three disagree, treat this file as suspect and reconcile against `roadmap.md` (the canonical sequence) and `sessions/` (the actual history) before trusting any single source.

---

## Active Phase

- **Phase ID:** 018
- **Name:** Maintenance & Continuous Improvement
- **Status:** not-started
- **Started:** 
- **Completed:** 

**No phase is currently in-progress.** Phase 017 ("AI Shell & Command Interface," inserted by ADR-0009) completed 2026-08-07 — Titan AI's first usable interactive CLI, built on the seven Titan Core engines. Phase 018 is next per `roadmap.md` and its entry criteria ("Phase 017 completion") are now met, but **it has not been started and is not authorized by Phase 017's closure** — beginning it requires a separate, explicit instruction, per the same pattern used at every phase boundary in this project.

## Prior Phase Completed

- **Phase ID:** 017
- **Name:** AI Shell & Command Interface
- **Status:** complete
- **Completed:** 2026-08-07

## Exit Criteria (prior phase — 017, for reference)

- [x] The CLI runs and presents the specified interactive prompt.
- [x] All specified commands are implemented, dispatch through a command registry, and behave per their documented Acceptance Criteria.
- [x] Unit tests exist and pass for the parser, the dispatcher, and the `status`/`help`/`engines` commands.
- [x] `current_phase.md`, `changelog.md`, and `roadmap.md` reflect this phase's work.

All four checked, with real evidence (manual end-to-end runs against the actual engines and `.titan/` corpus; 653/653 automated tests) — see `phases/phase-017-ai-shell-and-command-interface.md`'s Milestone History.

## Notes

- **Phase 017 (AI Shell & Command Interface) is complete** (2026-08-07). Built `apps/titan-shell/src/cli.ts` on the unmodified `createTitanShell()` factory, with a table-driven command registry and ten commands (`help`, `status`, `engines`, `version`, `plan create`/`plan explain`, `context`, `knowledge list`, `validate` placeholder, `clear`, `exit`), every one invoking real engine methods — no fabricated output. Added `tsx` as a devDependency (verified genuinely new) and `dev`/`start`/`build` scripts. 39 new unit tests, full suite 653/653. Manual end-to-end verification found and fixed two real bugs the automated tests hadn't caught: a Windows-incompatible main-module check (fixed with `pathToFileURL`), and a command-processing race under piped/non-interactive stdin that dropped queued commands (fixed with an explicit drain queue, plus a regression test). Full record in `phases/phase-017-ai-shell-and-command-interface.md`'s Milestone History.
- **Phase 017 was inserted ahead of Phase 018** (the former Phase 017, "Maintenance & Continuous Improvement," renumbered per ADR-0009) because it didn't fit that open-ended phase's own Objective/Scope/Exit Criteria. Full rationale in `decisions.md` ADR-0009.
- Two things intentionally left partial in Phase 017, each flagged with a `TODO(phase-017)` code comment: the `context` command (no public `ContextEngine` read method exists yet) and the `validate` command (`ValidationEngine.validate()` needs an `ExecutionRecord` nothing in this phase produces).
- Two small, non-blocking follow-ups carried from Phase 016, still open: the `production` GitHub environment has no protection rules yet; `phases/README.md`'s index was corrected during Phase 017's closure (previously stale, flagged three times).
- Phase 016 (Production Release) is complete (2026-08-07) — see `changelog.md` and `phases/phase-016-production-release.md`.

## Instructions for Whoever Reads This Next

1. Phases 000–017 are complete, in dependency order per `roadmap.md`. Phase 018 (Maintenance & Continuous Improvement) is next but **has not been started**.
2. **Do not begin Phase 018 work without an explicit instruction to do so.** Its entry condition (Phase 017 completion) is met, but eligibility is not authorization.
3. When Phase 018 work begins, update this file's Active Phase section (Status: in-progress, fill in Started), update `project_state.json`, and append to `changelog.md`.
4. If you are picking this project back up after a long gap, also skim the last 2–3 files in `sessions/` for tacit context not yet promoted into these governance docs.
