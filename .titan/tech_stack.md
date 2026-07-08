# TECH STACK

**Document Class:** Technical Governance
**Authority:** Subordinate to `architecture.md`. Superior to implementation-level library choices made ad hoc during coding.
**Status:** No stack has been selected yet — this repository currently contains no application code (see `project_state.json`). **The Titan Core engine architecture (Planner, Orchestrator, Context, Knowledge, Execution, Validation, Learning) is now approved** (`architecture.md` Section 6, ADR-0002), and Phase 002 (Technical Discovery & Stack Selection) is next on the roadmap. This document defines the **mandatory decision framework** for selecting a stack that fits the approved Titan Core architecture — the architecture is no longer an open question the stack must accommodate blindly; the stack must now be chosen to serve it.

---

## 1. Why a Framework Instead of a Fixed Stack

Titan AI is designed to govern many possible projects, not one specific application. Rather than pre-declaring a stack that may not fit the eventual product, this document defines **how any future agent must choose and record a stack**, so the choice is deliberate, documented, and consistent — not improvised mid-session.

## 2. Mandatory Process for Stack Selection

When Phase 002 begins, the responsible agent must:

1. Re-read the product requirements from Phase 001 (`phases/phase-001-*.md`) and the approved Titan Core architecture in `architecture.md` Section 6.
2. Evaluate candidate technologies against the criteria in Section 3, including engine-fit (Section 3a).
3. Record the chosen stack in Section 5 of this document, including whether all seven engines share one stack or whether any engine (e.g., a UI-heavy Context Engine surface) reasonably warrants a different runtime.
4. Record the decision, alternatives, and rationale as an ADR in `decisions.md`.
5. Update `project_state.json` → `tech_stack.status` to `decided`.

**No agent may introduce a new core dependency (language, framework, database, major library) into the codebase without first completing this process.** Minor utility libraries (e.g., a date-formatting helper) are exempt but should still be listed in Section 6 for visibility.

## 3. Selection Criteria

Every candidate technology must be evaluated against:

| Criterion | Guiding Question |
|---|---|
| Fit for purpose | Does it solve the actual problem, or is it fashionable? |
| Maturity & stability | Is it production-proven, actively maintained, well-documented? |
| Team/agent familiarity | Can both human developers and AI agents reason about it reliably? |
| Long-term maintainability | Will it still be reasonable to maintain in 2–3 years? |
| Security track record | Any history of severe unpatched vulnerabilities? |
| License compatibility | Is the license compatible with the project's intended use/distribution? |
| Ecosystem support | Tooling, testing libraries, community support |
| Operational cost | Hosting, licensing, or scaling costs at expected load |

### 3a. Titan-Core-Specific Criterion

| Criterion | Guiding Question |
|---|---|
| Engine-boundary fit | Does the candidate technology make it natural to keep the seven Titan Core engines (`architecture.md` Section 6) as independently testable modules with explicit contracts, or does it encourage blurring their boundaries (e.g., a framework that assumes one big app object with shared mutable state)? |
| Long-running orchestration support | Since the Orchestrator Engine sequences multi-step, potentially long-lived task execution, does the runtime support this well (async/concurrency model, process/worker model) without excessive complexity? |
| Persistent + ephemeral state separation | Does the stack make it easy to keep Knowledge Engine (persistent) and Context Engine (ephemeral) storage cleanly separate, per Section 6.2's boundary definitions? |

## 4. Default Preferences (Absent a Strong Reason Otherwise)

These are starting biases, not mandates — they can be overridden by an ADR if the product calls for it:

- **Language:** TypeScript for anything with meaningful long-term maintenance needs (type safety aids both human and AI comprehension of unfamiliar code).
- **Testing:** A test runner with strong ecosystem support and fast feedback loops (e.g., Vitest/Jest for JS/TS, pytest for Python).
- **Version control hygiene:** Conventional commits, semantic versioning for releases.
- **Dependency minimalism:** Prefer fewer, well-maintained dependencies over many thin wrappers.
- **Configuration:** Environment-based config validated at startup, never hardcoded secrets (see `security_policy.md`).

## 5. Current Selected Stack

**Status: Not yet decided.** This section will be populated during Phase 002 and must include, at minimum:

- Primary language(s) and version(s)
- Runtime/framework
- Database/storage
- Build tooling
- Testing framework(s)
- CI/CD platform
- Hosting/deployment target

Until this section is filled in with an accompanying ADR, no agent should treat any stack as "already decided."

## 6. Dependency Registry

A running list of non-trivial dependencies added to the project, for visibility (updated as dependencies are added):

| Dependency | Purpose | Added In Phase | ADR Reference |
|---|---|---|---|
| — | — | — | — |

## 7. Deprecation & Migration Policy

- Deprecating a core technology requires an ADR explaining the trigger (security EOL, critical bug, better fit found) and a migration plan.
- Migrations must be executed in a dedicated phase (added to `roadmap.md`), not silently folded into unrelated feature work.
