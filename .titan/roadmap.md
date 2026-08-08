# ROADMAP

**Document Class:** Planning
**Authority:** Subordinate to `master_plan.md`. Superior to individual files in `phases/`.
**Purpose:** Translates the master plan into an ordered sequence of phases. This is the canonical source of truth for "what phase are we in and what comes next." `current_phase.md` always mirrors the active row below.

---

## 1. How to Read This Roadmap

- Phases are sequential by default. A phase should not start until its predecessor's exit criteria (defined in its `phases/phase-XXX-*.md` file) are met, unless explicitly parallelized and noted here.
- Status values: `not-started`, `in-progress`, `blocked`, `complete`.
- This table is a **summary**. Full detail for each phase lives in `phases/phase-XXX-*.md`.

## 2. Phase Table

**Revised 2026-07-08 per ADR-0002 (Titan Core architecture approval).** The dependency between Phase 002 and Phase 003 has been intentionally reversed from the original roadmap — architecture (engine boundaries) is now defined before stack selection, so the stack can be chosen to fit the approved engine design rather than constraining it upfront. See Section 3 for rationale. Phases 005–011 are new, inserted to implement the seven Titan Core engines in dependency order; all subsequent phases are renumbered accordingly.

| Phase | Name | Goal | Status | Depends On |
|---|---|---|---|---|
| 000 | Governance Initialization | Establish `.titan/` as the permanent memory/governance layer | complete | — |
| 001 | Requirements & Product Definition | Define what is being built: Titan AI itself, realized as Titan Core | complete | 000 |
| 003 | Architecture Design | Approve the Titan Core engine architecture (`architecture.md` Section 7) | complete | 001 |
| 002 | Technical Discovery & Stack Selection | Choose and record the technology stack that fits Titan Core, via `tech_stack.md` | complete | 003 |
| 004 | Environment & Tooling Setup | Repo scaffold, CI/CD skeleton, linting, formatting, pre-commit hooks | complete | 002 |
| 005 | Context Engine Implementation | Build session/live-state management: the foundation every other engine reads from | complete | 004 |
| 006 | Engine Framework | Build the shared runtime infrastructure that every Titan engine will use, including the TitanEngine interface, BaseEngine implementation, EngineRegistry, EventBus, Dependency Injection container, Lifecycle Manager, Health Monitor, Configuration Service, Logging Service, Metrics interface, Error Handling framework, and the public engine API contract documented in `specification/engine_api.md` | complete | 005 |
| 006a | Security Architecture Governance | Define the security architecture baseline, threat model, secure execution model, authentication/authorization model, secret strategy, audit logging, incident response, and deployment checklist for Titan AI | complete | 006 |
| 007 | Knowledge Engine Implementation | Build long-term memory: programmatic read/write access to `.titan/` governance corpus | complete | 006a |
| 008 | Planner Engine Implementation | Build goal-to-plan decomposition, consuming Context + Knowledge engines | complete | 007 |
| 009 | Orchestrator Engine Implementation | Build central coordination: task sequencing, dispatch, escalation enforcement | complete | 008 |
| 010 | Execution Engine Implementation | Build the action-taking layer dispatched to by the Orchestrator | complete | 009 |
| 011 | Validation Engine Implementation | Build independent verification of Execution Engine output | complete | 010 |
| 012 | Learning Engine Implementation | Build outcome observation and Knowledge Engine feedback loop | complete | 011 |
| 013 | Titan Core Integration & Hardening | Wire all seven engines together end-to-end; security and performance review | complete | 012 |
| 014 | Test Coverage Completion | Reach coverage and quality bars from `testing_strategy.md` across all engines | complete | 013 |
| 015 | Deployment Readiness | CI/CD finalized, staging validated | complete | 014 |
| 016 | Production Release | First production deployment per `deployment_strategy.md` | complete | 015 |
| 017 | AI Shell & Command Interface | Build the first usable interactive CLI on top of the seven Titan Core engines | complete | 016 |
| 018 | Titan Shell Control Plane | Rebuild the shell as a hierarchical command-tree control plane spanning the full engine lifecycle | complete | 017 |
| 019 | Maintenance & Continuous Improvement | Ongoing operation, monitoring, iteration | not-started | 018 |

## 3. Notes on Sequencing

- **Phases 000–017 are complete.** Phase 015 (Deployment Readiness) closed 2026-08-07: CI/pipeline-hygiene (format-check, no-skipped-tests, basic secrets scan, dependency audit), the deployment-target governance decision (**ADR-0008**: local/CLI execution, no external hosting provider), dependency vulnerability remediation (`npm audit` at 0 vulnerabilities), artifact packaging/clean-environment validation, a Staging Environment (GitHub environment, deployment restricted to `main`), Staging Validation (612/612 tests against the packaged artifact in a clean environment), and a documentation review closing `security_checklist.md`'s Pre-Deployment Checklist gaps. A dedicated governance interpretation determined that Phase 015's Exit Criterion 3 ("Production release can proceed under governance controls") is a readiness/capability statement, not a claim that a deployment occurred — Production Deployment and Rollback *execution* belong to Phase 016, per `phase-016-production-release.md`'s own Objective/Scope, not to Phase 015; see `phases/phase-015-deployment-readiness.md`'s Phase 015 / Phase 016 Boundary Correction section for the full reasoning. **Phase 016 (Production Release) is complete (2026-08-07) — Titan Core's first production deployment.** The GitHub Actions pipeline was restored (it had never completed successfully for any commit before this phase — a hard `format:check` gate on 75 pre-existing `.titan/` files blocked every downstream step, fixed via a one-line `.prettierignore`); a `workflow_dispatch`-only `deploy-production` job was added, reusing the exact artifact staging validates rather than rebuilding it; `deployment_strategy.md` §6 (Monitoring & Alerting) was extended; the rollback procedure was genuinely exercised; and `dudujerry77-hue` manually triggered the deployment via `workflow_dispatch` — CI run #11 completed `success` across all three jobs, every step, deploying commit `98a3398`. All three Exit Criteria are checked with live evidence. See `phases/phase-016-production-release.md`'s Production Deployment Evidence section. **Per ADR-0009 (2026-08-07), Phase 017 is "AI Shell & Command Interface"** — inserted ahead of the open-ended Maintenance phase (renumbered to **Phase 018**, content preserved unchanged via `git mv`), mirroring ADR-0002's own precedent for inserting phases and renumbering everything after them. **Phase 017 is complete (2026-08-07):** Titan AI's first usable interactive CLI, built on the seven existing Titan Core engines via a table-driven command registry (`help`, `status`, `engines`, `version`, `plan create`/`plan explain`, `context`, `knowledge list`, `validate` placeholder, `clear`, `exit`), every command invoking real engine methods with no fabricated output. 39 new unit tests, full suite 653/653, verified end-to-end against the real engines and the real `.titan/` corpus. See `phases/phase-017-ai-shell-and-command-interface.md`'s Milestone History. **Per ADR-0010 (2026-08-08), Phase 018 is "Titan Shell Control Plane"** — inserted ahead of the open-ended Maintenance phase (renumbered to **Phase 019**, content preserved unchanged via `git mv`), mirroring ADR-0009's own precedent. **Phase 018 is complete (2026-08-08):** rebuilt the shell's command framework as a hierarchical router/parser/renderer with dispatcher-level error handling and real exit codes, a services/adapters layer, and a `ShellSession` lifecycle chain (Goal → Plan → Workflow → Dispatch → Execution → Validation → Learning), then exposed SYSTEM (`engine`/`doctor`/`config`/`session`), KNOWLEDGE, PLANNING, ORCHESTRATION, EXECUTION, and VALIDATION commands backed by existing, unmodified engine public APIs across five milestones — the full lifecycle chain verified end-to-end through Validation against the real engines. LEARNING commands were deferred, not faked: `LearningEngine.observeCycle()` needs a `WorkflowResult` that no `OrchestratorEngine` method produces, a real capability gap surfaced during implementation and explicitly deferred to a future phase/ADR by user decision. The future AI/Agent Engine architectural direction was recorded in `VISION.md` §6 (documentation only, no engine change). Full suite grew from 653 to 714 passing tests; lint, build, and format:check clean throughout; every milestone independently verified against the real CLI binary. A pre-commit final release audit found and fixed a dropped per-command logging regression and a repo-wide `format:check` failure before anything was committed. See `phases/phase-018-titan-shell-control-plane.md`'s Milestone History. **Phase 019 (Maintenance & Continuous Improvement) is eligible to begin now that Phase 018 is complete, but has not been started**, per the same "eligibility is not authorization" principle applied at every phase boundary in this project. The dependency between Phase 002 and Phase 003 remains intentionally reversed from the original roadmap: architecture boundaries were approved before final stack selection so the stack could be evaluated against a concrete engine model. This reordering is recorded in ADR-0002.
- **Phases 005–012 implement the shared framework and the seven Titan Core engines in dependency order**, with Security Architecture Governance inserted as Phase 006a before Knowledge Engine implementation.
- Each engine/framework phase (005–012) may be split into sub-phases (e.g., `007a`, `007b`) if its scope is large; sub-phases still roll up to a single row here.
- **Phase 013 (Integration & Hardening)** exists specifically to validate cross-engine boundaries hold under real end-to-end operation, per the Titan Core cross-cutting architecture rules and the anti-patterns in Section 9.
- **Phase 019 has no end date.** It represents steady-state operation and is revisited indefinitely; each maintenance cycle gets its own session log rather than its own phase number.

## 4. Changing the Roadmap

Reordering, adding, or removing phases requires:
1. An ADR in `decisions.md` explaining the change.
2. An update to this table.
3. An update to `current_phase.md` if the active phase is affected.

Do not silently reorder phases mid-session.
