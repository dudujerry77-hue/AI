# START HERE

**Document Class:** Onboarding Guide
**Authority:** Subordinate to `constitution.md`. This guide explains how to navigate the project and governance system; it does not override policy or architecture documents.
**Purpose:** Give any new human contributor or AI agent a reliable zero-context entry point.

---

## 1. Project Purpose

Titan AI is an autonomous engineering system built to preserve continuity across sessions, contributors, and AI models. The repository uses `.titan/` as its persistent governance and memory layer so work remains consistent over time.

The product being built is **Titan Core**: seven cooperating engines (Planner, Orchestrator, Context, Knowledge, Execution, Validation, Learning) implemented on a shared runtime framework and governed by explicit architectural, security, and process contracts.

## 2. Repository Layout

Top-level structure (high signal directories):

- `.titan/` - governance, phase control, decisions, security policy, templates, and session history.
- `runtime/` - shared engine framework primitives (engine contract, lifecycle, event bus, registry, health, metrics, errors, config, logging).
- `engines/` - engine-specific implementations as phases progress.
- `apps/` - application entry points and integration surfaces.
- `services/` - service-layer modules and adapters.
- `shared/` - shared contracts, types, and common utilities.
- `packages/` - workspace packages for modular components.
- `tests/` - runtime and unit test suites.
- `docs/` - supporting technical documentation.
- `scripts/` - automation scripts and project utilities.

Reference files:

- `README.md` - concise repository-level summary.
- `package.json` - workspace scripts and package configuration.
- `tsconfig.json` - TypeScript compiler contract.

## 3. Governance Hierarchy

Authority is defined in `.titan/constitution.md` and must be followed exactly. In conflicts, use this order:

1. `constitution.md`
2. `security_policy.md`
3. `architecture.md`
4. `master_plan.md` and `roadmap.md`
5. Standards documents (`coding_standards.md`, `testing_strategy.md`, `naming_conventions.md`, `deployment_strategy.md`, `tech_stack.md`)
6. `current_phase.md` and `phases/*`
7. `decisions.md`
8. `sessions/*` and `reviews/*`

This file is explanatory only and cannot change governance authority.

## 4. How New AI Agents Begin Work

Any AI agent must start with this sequence before editing code:

1. Read `.titan/constitution.md`.
2. Read `.titan/current_phase.md`.
3. Read `.titan/project_state.json`.
4. Read the active phase file in `.titan/phases/`.
5. Read the most recent 2-3 logs in `.titan/sessions/`.
6. Read any directly relevant governance docs (architecture, security, testing, coding standards).

Execution rules:

- Do not silently expand or reduce scope.
- Keep changes traceable to active phase goals and acceptance criteria.
- Update governance artifacts when required by the Definition of Done.
- Record significant decisions in `decisions.md` and session outcomes in `sessions/`.

## 5. How Humans Contribute

Humans remain the final authority for constitutional changes, security exceptions, and strategic pivots.

Human contributor workflow:

1. Confirm active phase in `.titan/current_phase.md` and `.titan/roadmap.md`.
2. Open or refine work with explicit acceptance criteria.
3. Ensure implementation changes include corresponding tests and documentation updates.
4. Require traceability updates (`changelog.md`, `project_state.json`, session log, and ADR when needed).
5. Approve or reject constitutional amendments and security-policy exceptions explicitly.

## 6. Phase Workflow

Titan uses a phase-based delivery model to preserve consistency and reduce drift.

Phase lifecycle:

1. **Plan** - phase scope, dependencies, and exit criteria are defined in `.titan/phases/` and summarized in `.titan/roadmap.md`.
2. **Activate** - `.titan/current_phase.md` and `.titan/project_state.json` reflect one active phase.
3. **Execute** - implementation proceeds with governance and security constraints enforced.
4. **Validate** - tests, quality checks, and acceptance criteria are verified.
5. **Record** - update `changelog.md`, `project_state.json`, session log, and ADRs as applicable.
6. **Transition** - mark phase complete and set next phase status.

No phase is complete until governance updates and verification evidence exist, not just code changes.

## 7. Quick Start Checklist

- Read the governance sequence in Section 4.
- Verify active and next phase.
- Confirm scope boundaries for the current task.
- Implement with tests.
- Update documentation and project state.
- Leave a session trail for the next contributor.
