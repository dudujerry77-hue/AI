# DECISIONS (Architecture Decision Records)

**Document Class:** Binding Decision Log
**Authority:** Subordinate to `constitution.md`, `security_policy.md`, and `architecture.md`. An accepted ADR is binding on all future work until superseded by a later ADR.
**Format:** Each decision gets a numbered entry. Never delete an ADR — if a decision is reversed, add a new ADR that supersedes it and mark the old one `superseded`.

---

## How to Write an ADR

Use `templates/adr-template.md`. Every ADR must include: context, decision, alternatives considered, consequences, and status (`proposed`, `accepted`, `rejected`, `superseded`).

---

## ADR-0001: Adopt the Titan AI Governance Model

- **Status:** accepted
- **Date:** 2026-07-08
- **Author:** Claude (acting as Principal Software Architect per assignment)

### Context

Titan AI is intended to be an autonomous software engineering system where multiple AI models (Claude, Codex, Lovable, Gemini, Titan AI itself) and human developers work on the same codebase across many disconnected sessions, with no shared memory except what is committed to the repository. Without a persistent governance layer, each new session risks contradicting prior decisions, re-litigating settled architecture, losing track of project state, or silently dropping requirements.

### Decision

Establish a `.titan/` directory at the repository root as the permanent, versioned memory and governance layer. It contains 14 top-level documents (constitution, master plan, roadmap, architecture, current phase, project state, changelog, decisions, tech stack, coding standards, naming conventions, security policy, testing strategy, deployment strategy) and 7 supporting folders (`prompts/`, `phases/`, `sessions/`, `reviews/`, `rules/`, `templates/`, `knowledge/`). All AI agents and human contributors are required by `constitution.md` to read and update these documents as part of normal work.

### Alternatives Considered

1. **Rely on chat/session memory only.** Rejected — memory does not transfer across different AI models or fresh sessions of the same model; this is the exact problem being solved.
2. **A single flat `NOTES.md` file.** Rejected — insufficient structure to separate immutable principles (constitution) from live state (`project_state.json`) from historical record (`changelog.md`, `sessions/`), leading to the same drift problem in a different shape.
3. **External project management tool (e.g., Jira) as source of truth.** Rejected as the *sole* source — external tools are not guaranteed to be readable by every AI agent in every context, and this system must be self-contained within the repository. (Not precluded as a *complementary* tool later.)

### Consequences

- **Positive:** Any AI agent, in any future session, can reconstruct full project context from the repository alone. Decisions become traceable and auditable. Onboarding a new agent or human is fast and consistent.
- **Negative:** Adds process overhead — every session must read and update governance documents, which costs time compared to jumping straight to code.
- **Mitigation:** Session start/end protocol is kept lightweight and is fully defined in `constitution.md` Section 7 and `templates/session-log-template.md` to minimize friction.

---

## ADR-0002: Adopt the Titan Core Seven-Engine Architecture

- **Status:** accepted
- **Date:** 2026-07-08
- **Author:** Claude (acting as Principal Software Architect per assignment)

### Context

Following governance initialization (ADR-0001), the project needed a concrete answer to what Titan AI actually *is* architecturally — not just a set of process documents, but a system design capable of realizing the vision in `master_plan.md`: autonomous, multi-agent, multi-session software engineering that doesn't lose coherence over time. Without a defined internal architecture, "Titan AI" risked remaining an abstract governance wrapper around ad hoc agent behavior, with no enforced separation between planning, execution, and verification — the exact conditions that let an autonomous system silently drift, fabricate results, or contradict its own prior decisions.

### Decision

Adopt **Titan Core**: an architecture of seven engines, each with a single, non-overlapping responsibility:

1. **Planner Engine** — decomposes goals into executable plans.
2. **Orchestrator Engine** — coordinates plan execution, dispatch, and escalation.
3. **Context Engine** — holds live, session-scoped working state.
4. **Knowledge Engine** — holds persistent, cross-session memory (the `.titan/` corpus).
5. **Execution Engine** — performs concrete actions (code, commands, API calls).
6. **Validation Engine** — independently verifies Execution Engine output.
7. **Learning Engine** — observes full cycles and feeds durable lessons back into the Knowledge Engine.

Full responsibilities, boundaries, and data flow are recorded in `architecture.md` Section 6. `roadmap.md` has been updated to implement these engines as Phases 005–011, in the dependency order: Context → Knowledge → Planner → Orchestrator → Execution → Validation → Learning.

As part of this decision, the roadmap dependency between Phase 002 (Technical Discovery & Stack Selection) and Phase 003 (Architecture Design) is **reversed** from the original plan: architecture is now defined before the stack is chosen, since engine boundaries are conceptual and stack-agnostic, and should constrain and inform stack selection rather than be constrained by a stack chosen blind to them.

### Alternatives Considered

1. **A single monolithic "agent loop"** (plan-and-execute in one undifferentiated process). Rejected — this is exactly the failure mode `master_plan.md` was written to prevent: no enforced separation means a single bug or bad instruction can simultaneously plan, execute, and self-certify its own work as correct, with no independent check.
2. **A two-engine split (Planner + Executor only), with validation folded into the Executor.** Rejected — an engine cannot be trusted to impartially validate its own output ("no engine grades its own homework"). A dedicated Validation Engine is required for the Definition of Done in `constitution.md` Section 5 to be enforced mechanically rather than by good intentions.
3. **Merge Context and Knowledge into one "Memory Engine."** Rejected — ephemeral session state and durable cross-session memory have fundamentally different lifecycles, consistency requirements, and failure modes (losing Context is a minor inconvenience; losing Knowledge is catastrophic). Keeping them separate lets each be optimized and reasoned about independently, consistent with `architecture.md` Section 2's separation-of-concerns principle.
4. **Omit a dedicated Learning Engine and treat "learning" as manual human curation of `.titan/` documents.** Rejected as the sole mechanism — manual curation alone does not scale to the volume of sessions this system is designed for and reintroduces the "loses coherence over time" failure mode at the meta level. A dedicated engine makes learning a first-class, observable process rather than an incidental side effect of human diligence.
5. **Keep the original roadmap order (stack selection before architecture).** Rejected for this project specifically — because Titan Core's value comes from its engine *boundaries*, not from any particular implementation technology, defining those boundaries first produces better stack-selection criteria (see `tech_stack.md` Section 3a) than picking a stack in the abstract and hoping it fits later.

### Consequences

- **Positive:** Clear separation of powers mirrors well-understood distributed-systems and compiler-pipeline patterns (plan/execute/verify), making the system easier to reason about, test in isolation, and extend. It gives `constitution.md`'s "Definition of Done" and "no engine grades its own homework" properties an architectural home rather than leaving them as unenforced conventions. It also gives future stack selection (Phase 002) concrete, non-negotiable shape constraints instead of an open-ended design space.
- **Negative:** Seven engines with strict boundaries add coordination overhead compared to a simpler design — more inter-engine contracts to define, version, and keep in sync (`/shared` types per `architecture.md` Section 6.4). Early phases (005–011) will take longer collectively than building one undifferentiated agent loop would.
- **Mitigation:** The phased roadmap (005–011) builds engines in strict dependency order so integration risk is caught early rather than all at once in Phase 012. `architecture.md` Section 6.3's cross-cutting rules (explicit calls only, no bypassing the Orchestrator except for pure state/knowledge reads) keep the coordination overhead bounded and inspectable rather than ad hoc.

### Follow-Up Required

- Phase 002 must select a stack evaluated explicitly against `tech_stack.md` Section 3a (engine-fit criteria) before any engine implementation begins.
- Each engine phase (005–011) should, on completion, log any boundary friction discovered in its `sessions/` entry — recurring friction is a signal for the Learning Engine (once built) or a future ADR revising Section 6, not something to route around silently.

---

## ADR-0003 through ADR-000N

No further decisions have been made yet. The next ADR will likely be recorded during Phase 002, covering technology stack selection. Add new entries below this line using `templates/adr-template.md`, incrementing the number sequentially. Do not skip numbers; do not reuse numbers.
