# MASTER PLAN

**Document Class:** Strategic Governance
**Authority:** Subordinate to `constitution.md`. Superior to `roadmap.md` details.
**Purpose:** Defines the long-term vision, guiding philosophy, and success criteria for Titan AI-governed projects. `roadmap.md` breaks this plan into executable phases; `phases/` breaks the roadmap into individual work units.

---

## 1. Vision

Titan AI exists to let autonomous and semi-autonomous AI agents build, test, debug, document, deploy, and maintain enterprise-scale software **without losing coherence over time**. The failure mode this system is designed to prevent is well known: an AI agent works on a codebase for a while, produces good work, then a new session (or a different model entirely) loses context, contradicts earlier decisions, re-implements things differently, or silently drops requirements.

The `.titan/` directory is the fix: a persistent, versioned, human-and-machine-readable memory layer that sits above the code itself.

## 2. Guiding Philosophy

1. **Documents are infrastructure, not paperwork.** `.titan/` is treated with the same rigor as production code. It is reviewed, versioned, and never allowed to drift from reality.
2. **Optimize for the next agent, not the current one.** Every session should leave the repository in a state where a completely unfamiliar AI model (or new hire) can pick it up correctly.
3. **Small, verifiable phases beat large, ambiguous ones.** Work is decomposed into phases with explicit entry/exit criteria (see `roadmap.md`, `phases/`).
4. **Prefer boring, provable correctness over clever, unverifiable correctness.** When in doubt, choose the approach that is easiest to test and easiest for the next agent to reason about.
5. **The system must survive agent turnover.** Assume Claude builds phase 2, Codex builds phase 3, Gemini reviews phase 4, and a human builds phase 5 by hand. The system must not degrade because of this.

## 3. Strategic Objectives

| # | Objective | Success Criteria |
|---|---|---|
| 1 | Establish a durable governance layer | `.titan/` fully populated, internally consistent, versioned in git |
| 2 | Enable agent-agnostic continuation | Any of Claude, Codex, Lovable, Gemini, or Titan AI can resume work using only `.titan/` + repo contents |
| 3 | Guarantee traceability | Every shipped change traces to a session log, a decision record, and a changelog entry |
| 4 | Enforce quality gates | No code merges without meeting `testing_strategy.md` and `coding_standards.md` |
| 5 | Protect security posture | `security_policy.md` violations block deployment via `deployment_strategy.md` gates |
| 6 | Support incremental, phase-based delivery | `roadmap.md` and `phases/` decompose all work into independently verifiable increments |

## 4. Scope of This Master Plan

This master plan governs **process and continuity**, not implementation minutiae. As of the architecture approval recorded in `decisions.md` (ADR-0002), the product this governance system is building is now defined: **Titan AI itself**, implemented as **Titan Core** — seven cooperating engines (Planner, Orchestrator, Context, Knowledge, Execution, Validation, Learning) that together form the autonomous engineering system described in Section 1. Full engine responsibilities and boundaries are recorded in `architecture.md` Section 6.

This master plan still does not dictate implementation-level detail (languages, frameworks, libraries) — that remains the responsibility of `tech_stack.md` and Phase 002. What has changed is that the **shape** of the system to be built is no longer open-ended: everything built from this point forward must fit within, and respect the boundaries of, the seven Titan Core engines.

## 4a. Titan Core as the Realization of the Vision

Section 1's vision — coherent, multi-agent, multi-session autonomous engineering — is now given a concrete shape:

- **Planner Engine** and **Orchestrator Engine** together provide the "small, verifiable phases" discipline from Section 2.3 as a running system, not just a document convention.
- **Context Engine** and **Knowledge Engine** together are the literal implementation of "the system must survive agent turnover" (Section 2.5) — Context Engine for session continuity, Knowledge Engine for long-term memory across agents and models.
- **Execution Engine** and **Validation Engine** enforce the "Definition of Done" (`constitution.md` Section 5) mechanically, by construction, rather than relying on each agent to remember to self-check.
- **Learning Engine** operationalizes Section 6's long-term success definition: it is the mechanism by which Titan AI actually improves over time rather than merely not degrading.

## 5. How This Plan Is Used

- **At project kickoff:** the roadmap is derived from this plan.
- **At each phase boundary:** the phase's outcomes are checked against Section 3's strategic objectives, not just the phase's local goals.
- **At each major pivot:** an ADR in `decisions.md` must explain how the pivot still serves (or intentionally revises) this master plan.

## 6. Long-Term Success Definition

Titan AI's governance layer is successful if, twelve months from now, a brand-new AI agent with no memory of any prior conversation can:

1. Read `.titan/` in under ten minutes.
2. Understand exactly what has been built, why, and what is next.
3. Continue work without contradicting a single prior architectural decision.
4. Produce work indistinguishable in quality and consistency from the agent before it.

This is the bar every document in `.titan/` is written to meet.
