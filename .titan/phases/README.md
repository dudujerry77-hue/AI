# phases/

One file per phase from `roadmap.md`, named `phase-XXX-<kebab-case-name>.md` (e.g., `phase-001-requirements-and-product-definition.md`). Each file is the detailed record of a single phase: its goal, entry/exit criteria, tasks, and outcome.

## Rules

- A phase file is created **before** or **at the start of** work on that phase, using `templates/phase-template.md`.
- A phase file is updated as work progresses — it is a living document until the phase is marked complete in `roadmap.md` and `current_phase.md`.
- Never delete a phase file, even if the phase's approach changed significantly — instead, document the pivot within it and/or via an ADR in `decisions.md`.

## Index

| File | Phase | Status |
|---|---|---|
| `phase-000-governance-initialization.md` | 000 | complete |
| *(pending)* `phase-001-requirements-and-product-definition.md` | 001 | complete — file not yet written; product defined as Titan AI/Titan Core per `decisions.md` ADR-0002, dedicated phase file should be backfilled by the next agent |
| *(pending)* `phase-003-architecture-design.md` | 003 | complete — see `architecture.md` Section 6 and `decisions.md` ADR-0002 for full content; dedicated phase file should be backfilled by the next agent using `templates/phase-template.md` |

**Note:** Phases 001 and 003 were completed and recorded in `architecture.md`, `decisions.md`, and `sessions/` during this session, but dedicated `phases/phase-001-*.md` and `phases/phase-003-*.md` files have not yet been backfilled. This is a known gap, not an inconsistency — the next agent touching phase records should create them from `templates/phase-template.md` using the content already captured in ADR-0002 and the session log `sessions/2026-07-08-0100-titan-core-architecture-approval.md`.
