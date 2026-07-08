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
| 003 | Architecture Design | Approve the Titan Core engine architecture (`architecture.md` Section 6) | complete | 001 |
| 002 | Technical Discovery & Stack Selection | Choose and record the technology stack that fits Titan Core, via `tech_stack.md` | not-started | 003 |
| 004 | Environment & Tooling Setup | Repo scaffold, CI/CD skeleton, linting, formatting, pre-commit hooks | in-progress | 002 |
| 005 | Context Engine Implementation | Build session/live-state management: the foundation every other engine reads from | complete | 004 |
| 006 | Engine Framework | Build the shared runtime infrastructure that every Titan engine will use, including the TitanEngine interface, BaseEngine implementation, EngineRegistry, EventBus, Dependency Injection container, Lifecycle Manager, Health Monitor, Configuration Service, Logging Service, Metrics interface, and Error Handling framework | not-started | 005 |
| 007 | Knowledge Engine Implementation | Build long-term memory: programmatic read/write access to `.titan/` governance corpus | not-started | 006 |
| 008 | Planner Engine Implementation | Build goal-to-plan decomposition, consuming Context + Knowledge engines | not-started | 007 |
| 009 | Orchestrator Engine Implementation | Build central coordination: task sequencing, dispatch, escalation enforcement | not-started | 008 |
| 010 | Execution Engine Implementation | Build the action-taking layer dispatched to by the Orchestrator | not-started | 009 |
| 011 | Validation Engine Implementation | Build independent verification of Execution Engine output | not-started | 010 |
| 012 | Learning Engine Implementation | Build outcome observation and Knowledge Engine feedback loop | not-started | 011 |
| 013 | Titan Core Integration & Hardening | Wire all seven engines together end-to-end; security and performance review | not-started | 012 |
| 014 | Test Coverage Completion | Reach coverage and quality bars from `testing_strategy.md` across all engines | not-started | 013 |
| 015 | Deployment Readiness | CI/CD finalized, staging validated | not-started | 014 |
| 016 | Production Release | First production deployment per `deployment_strategy.md` | not-started | 015 |
| 017 | Maintenance & Continuous Improvement | Ongoing operation, monitoring, iteration | not-started | 016 |

## 3. Notes on Sequencing

- **Phases 001 and 003 are complete; Phase 002 is next.** This is a deliberate reordering from the original roadmap: the Titan Core engine boundaries (Phase 003) were approved before the technology stack (Phase 002) so that stack selection in `tech_stack.md` can be evaluated against a concrete architecture instead of guessing at requirements. This reordering is recorded in ADR-0002; it is not a silent renumbering.
- **Phases 005–012 implement the shared framework and the seven Titan Core engines in dependency order**, matching `architecture.md` Section 6.1's data-flow diagram: Context first, then the shared Engine Framework, then Knowledge, then Planner, then Orchestrator, then Execution, then Validation, then Learning last (it depends on observing a full plan → execute → validate cycle to have anything to learn from).
- Each engine/framework phase (005–012) may be split into sub-phases (e.g., `007a`, `007b`) if its scope is large; sub-phases still roll up to a single row here.
- **Phase 013 (Integration & Hardening)** exists specifically to validate cross-engine boundaries hold under real end-to-end operation, per `architecture.md` Section 6.3 and the anti-patterns in Section 8.
- **Phase 017 has no end date.** It represents steady-state operation and is revisited indefinitely; each maintenance cycle gets its own session log rather than its own phase number.

## 4. Changing the Roadmap

Reordering, adding, or removing phases requires:
1. An ADR in `decisions.md` explaining the change.
2. An update to this table.
3. An update to `current_phase.md` if the active phase is affected.

Do not silently reorder phases mid-session.
