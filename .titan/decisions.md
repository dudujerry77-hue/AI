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

Full responsibilities, boundaries, and data flow are recorded in `architecture.md` Section 7. `roadmap.md` has been updated to implement these engines as Phases 005–011, in the dependency order: Context → Knowledge → Planner → Orchestrator → Execution → Validation → Learning.

As part of this decision, the roadmap dependency between Phase 002 (Technical Discovery & Stack Selection) and Phase 003 (Architecture Design) is **reversed** from the original plan: architecture is now defined before the stack is chosen, since engine boundaries are conceptual and stack-agnostic, and should constrain and inform stack selection rather than be constrained by a stack chosen blind to them.

### Alternatives Considered

1. **A single monolithic "agent loop"** (plan-and-execute in one undifferentiated process). Rejected — this is exactly the failure mode `master_plan.md` was written to prevent: no enforced separation means a single bug or bad instruction can simultaneously plan, execute, and self-certify its own work as correct, with no independent check.
2. **A two-engine split (Planner + Executor only), with validation folded into the Executor.** Rejected — an engine cannot be trusted to impartially validate its own output ("no engine grades its own homework"). A dedicated Validation Engine is required for the Definition of Done in `constitution.md` Section 5 to be enforced mechanically rather than by good intentions.
3. **Merge Context and Knowledge into one "Memory Engine."** Rejected — ephemeral session state and durable cross-session memory have fundamentally different lifecycles, consistency requirements, and failure modes (losing Context is a minor inconvenience; losing Knowledge is catastrophic). Keeping them separate lets each be optimized and reasoned about independently, consistent with `architecture.md` Section 2's separation-of-concerns principle.
4. **Omit a dedicated Learning Engine and treat "learning" as manual human curation of `.titan/` documents.** Rejected as the sole mechanism — manual curation alone does not scale to the volume of sessions this system is designed for and reintroduces the "loses coherence over time" failure mode at the meta level. A dedicated engine makes learning a first-class, observable process rather than an incidental side effect of human diligence.
5. **Keep the original roadmap order (stack selection before architecture).** Rejected for this project specifically — because Titan Core's value comes from its engine *boundaries*, not from any particular implementation technology, defining those boundaries first produces better stack-selection criteria (see `tech_stack.md` Section 3a) than picking a stack in the abstract and hoping it fits later.

### Consequences

- **Positive:** Clear separation of powers mirrors well-understood distributed-systems and compiler-pipeline patterns (plan/execute/verify), making the system easier to reason about, test in isolation, and extend. It gives `constitution.md`'s "Definition of Done" and "no engine grades its own homework" properties an architectural home rather than leaving them as unenforced conventions. It also gives future stack selection (Phase 002) concrete, non-negotiable shape constraints instead of an open-ended design space.
- **Negative:** Seven engines with strict boundaries add coordination overhead compared to a simpler design — more inter-engine contracts to define, version, and keep in sync (`/shared` types per `architecture.md` Section 7.4). Early phases (005–011) will take longer collectively than building one undifferentiated agent loop would.
- **Mitigation:** The phased roadmap (005–011) builds engines in strict dependency order so integration risk is caught early rather than all at once in Phase 012. `architecture.md` Section 7.3's cross-cutting rules (explicit calls only, no bypassing the Orchestrator except for pure state/knowledge reads) keep the coordination overhead bounded and inspectable rather than ad hoc.

### Follow-Up Required

- Phase 002 must select a stack evaluated explicitly against `tech_stack.md` Section 3a (engine-fit criteria) before any engine implementation begins.
- Each engine phase (005–011) should, on completion, log any boundary friction discovered in its `sessions/` entry — recurring friction is a signal for the Learning Engine (once built) or a future ADR revising Section 7, not something to route around silently.

---

## ADR-0003: Adopt a TypeScript Monorepo Scaffold for Titan AI

- **Status:** accepted
- **Date:** 2026-07-08
- **Author:** Claude (acting as Principal Software Architect per assignment)

### Context

The repository now needs an actual codebase structure rather than only governance documents. The approved Titan Core architecture requires a modular monorepo with engine packages and shared infrastructure packages, but the implementation also needs a concrete toolchain that can support testing, linting, formatting, type safety, and environment-based configuration from the first commit.

### Decision

Adopt a TypeScript-based monorepo scaffold for the initial Phase 004 implementation, using:

- **TypeScript** for type-safe source code
- **npm workspaces** for package orchestration
- **Vitest** for automated tests
- **ESLint** and **Prettier** for linting and formatting
- **Environment-based configuration** via `.env` and `.env.example`

This choice is intended to support the approved engine package boundaries while remaining simple enough for the initial scaffold.

### Alternatives Considered

1. **Python monorepo**. Rejected for this phase because the project explicitly requested a TypeScript monorepo and the governance default preferences favor TypeScript for long-term maintainability.
2. **Jest instead of Vitest**. Rejected because Vitest offers a lighter default experience and better fit for a modern TypeScript workspace with fast feedback.
3. **No explicit linting/formatting tooling**. Rejected because the standards require automated formatting and reviewability from the first implementation phase.

### Consequences

- **Positive:** The repository now has a consistent toolchain that supports the package layout required by Titan Core and keeps the initial scaffold easy to understand and extend.
- **Negative:** The stack choice is now a constraint for future implementation; changing it later would require a new ADR and migration work.
- **Mitigation:** Keep the initial stack minimal and use the existing architecture boundaries to avoid premature framework coupling.

---

## ADR-0004: Implement the Context Engine as the Runtime Context Source of Truth

- **Status:** accepted
- **Date:** 2026-07-08
- **Author:** Claude (acting as Principal Software Architect per assignment)

### Context

The approved Titan Core architecture requires a dedicated Context Engine that manages the live runtime state of a session without taking on planning, orchestration, memory, or AI responsibilities. The initial scaffold only had placeholder modules, so the repository needed a concrete implementation that could be consumed by future engines without overstepping boundaries.

### Decision

Implement the Context Engine as an isolated package responsible only for runtime context state. It exposes typed interfaces for project, session, task, phase, user, and engine context, plus a `ContextManager` that creates immutable snapshots, applies versioning, and supports serialization, deserialization, and persistence through a storage adapter.

### Alternatives Considered

1. **Use a shared object module without a dedicated engine package.** Rejected because the architecture requires the Context Engine to be a single, explicit source of truth with clear responsibilities and boundaries.
2. **Implement context as mutable global state.** Rejected because it would break the architectural requirement for explicit state ownership and inspectable snapshots.
3. **Let the Orchestrator or Planner own context state.** Rejected because that would blur engine boundaries and violate the approved architecture.

### Consequences

- **Positive:** Future engines can depend on a typed, versioned runtime context abstraction without coupling to ad hoc state handling.
- **Negative:** The initial implementation is intentionally narrow and will need future expansion when additional context data becomes necessary.
- **Mitigation:** Keep the engine strictly scoped to runtime context and document that boundary clearly.

---

## ADR-0005: Implement a Shared Engine Framework Before Additional Engine Implementation

- **Status:** accepted
- **Date:** 2026-07-08
- **Author:** Claude (acting as Principal Software Architect per assignment)

### Context

After the Context Engine was documented and the broader Titan Core architecture was approved, the project had a clear need for a shared runtime contract for all future engines. Without a common framework, each engine would risk introducing its own lifecycle model, communication pattern, dependency injection strategy, logging, health model, and error-handling approach. That would increase coupling, make testing harder, and weaken the engine-boundary rules established in `architecture.md` Section 7.

### Decision

Implement a shared Engine Framework before implementing additional Titan engines. The framework will define the common contract used by every engine and will be the mandatory path for engine lifecycle management, engine registration, communication, configuration, logging, health monitoring, metrics hooks, error handling, and graceful shutdown. All engine-to-engine communication must flow through the framework using events or approved interfaces unless an explicit ADR allows otherwise.

### Alternatives Considered

1. **Implement the next engine directly without a shared framework.** Rejected because it would preserve ad hoc coupling and make each engine responsible for recreating the same infrastructure.
2. **Allow each engine to define its own runtime assumptions.** Rejected because it would weaken the boundary model and make future replacement or distributed execution much more difficult.
3. **Delay the framework until after several engines exist.** Rejected because it would embed architectural inconsistencies earlier and create more expensive refactoring later.

### Trade-offs

- **Positive:** A shared framework improves consistency, maintainability, testing, and future extensibility across all engines.
- **Negative:** It adds a prerequisite phase before engine implementation can proceed, which slightly delays tangible engine work.

### Benefits

- Stronger engine independence.
- Cleaner event-driven communication.
- Better observability and operational readiness.
- A clearer path to future distributed or multi-process execution.

### Consequences

The shared framework becomes a prerequisite for all future engine implementation work. The roadmap now includes a dedicated framework phase before Knowledge and the remaining engines, and the architecture documents explicitly require the framework to be in place before additional engine implementation proceeds. The public engine contract for all engines is captured in `specification/engine_api.md` so that engine implementations remain consistent with the shared framework and the approved architecture.

### Implementation Status

The shared framework was implemented during Phase 006 as a reusable runtime package under `runtime/`, including the engine contract, lifecycle manager, registry, event bus, configuration service, logger, health monitor, metrics collector, and error hierarchy. The implementation was verified through unit tests and a successful TypeScript build.

---

## ADR-0006: Make Security a First-Class Architecture Concern

- **Status:** accepted
- **Date:** 2026-07-08
- **Author:** Claude (acting as Principal Software Architect per assignment)

### Context

Titan AI is evolving from a governance and engine framework repository into an autonomous software engineering platform. As the system gains the ability to execute actions, access repositories, read secrets, and coordinate multiple engines, security can no longer remain a late-stage concern or a documentation appendix. Without explicit architectural security requirements, future engine implementations could bypass controls, mishandle secrets, or weaken isolation in ways that are difficult to correct later.

### Decision

Security is now a first-class architectural concern for Titan AI. The architecture, engine framework, and engine API contract will explicitly require zero-trust behavior, least privilege, defense in depth, secure-by-default configuration, sandboxed execution, immutable audit logging, encryption at rest and in transit, engine isolation, secret management, and runtime security controls. This decision is reflected in `architecture.md`, `engine_framework.md`, `specification/engine_api.md`, and the new governance documents under `.titan/security/`.

### Alternatives Considered

1. **Treat security as an application-layer concern only.** Rejected because it leaves shared infrastructure and engine boundaries without mandatory protections.
2. **Add security controls after the engine implementations are complete.** Rejected because it would require retrofitting every engine contract and would increase the risk of inconsistent controls.
3. **Keep security guidance only in `security_policy.md`.** Rejected because the architecture itself must enforce the boundaries and requirements that future engines rely on.

### Consequences

- **Positive:** Security requirements are now part of the shared architecture and framework contract, reducing ambiguity and improving consistency across engines.
- **Negative:** Governance scope grows and future engine phases must now satisfy additional security expectations from the start.
- **Mitigation:** The new security governance package provides a structured, reusable reference for future implementation work without introducing implementation code.

---

## ADR-0007: Adopt a Repository-Canonical Knowledge Engine Architecture with Pluggable Indexing

- **Status:** accepted
- **Date:** 2026-07-10
- **Author:** GitHub Copilot

### Context

Titan Core requires a durable, model-agnostic memory system that can preserve governance, decisions, architecture, sessions, lessons learned, and technical documentation across disconnected work sessions. The approved architecture already defines the Knowledge Engine at a high level, but Phase 007 implementation needs a specific architectural blueprint before code is written. Without that design, implementation risks overlapping with the Context Engine, embedding LLM-specific assumptions, or choosing storage and retrieval patterns that conflict with the repository-first governance model.

### Decision

Adopt a Knowledge Engine architecture in which:

1. The canonical durable knowledge store remains repository-backed Markdown and JSON files, with `.titan/` as the primary governance corpus.
2. The Knowledge Engine exposes a model-agnostic public API for loading, saving, searching, querying, updating, archiving, importing, exporting, and versioning knowledge.
3. Exact and structured retrieval are first-class requirements from the beginning.
4. SQLite is the recommended current read-model/index layer for fast local retrieval, full-text search, relationships, and version lookups.
5. Semantic/vector retrieval and cloud-backed storage are future extension points behind pluggable adapters, not initial requirements.
6. The Knowledge Engine remains strictly separate from Context, Planner, Orchestrator, Validation, and Learning responsibilities.

The detailed blueprint is recorded in `specification/knowledge_engine.md`.

### Alternatives Considered

1. **Vector database as the primary initial store.** Rejected because it would overfit the design to semantic retrieval before exact governance fidelity is solved, and it would weaken repository inspectability.
2. **Flat file retrieval only, with no structured index.** Rejected because even the initial repository needs reliable exact, relationship-aware, and scalable structured retrieval.
3. **Merge Context and Knowledge into a single memory engine.** Rejected because ephemeral session state and durable knowledge have different lifecycles, consistency requirements, and security semantics.
4. **LLM-specific memory architecture.** Rejected because Titan must remain independent of any specific model or provider.

### Consequences

- **Positive:** Preserves git-traceable canonical knowledge, keeps the system model-agnostic, and provides a scalable path from repository-native retrieval to richer indexing and semantic search later.
- **Negative:** Requires maintaining both canonical files and one or more derived read models, which increases implementation complexity compared to a single-store design.
- **Mitigation:** Derived indexes are explicitly disposable and rebuildable from canonical records, reducing corruption and migration risk.

### Follow-Up Required

- Phase 007 implementation must follow `specification/knowledge_engine.md`.
- Any future move to cloud-backed or vector-first canonical storage requires a new ADR.

## ADR-0008: Adopt Local/CLI Execution as Titan Core's Initial Deployment Target

- **Status:** accepted
- **Date:** 2026-08-06
- **Author:** Claude

### Context

Phase 015 (Deployment Readiness) requires a hosting/deployment target before its
Staging Environment, staging validation, production deployment, and rollback
milestones can proceed — `deployment_strategy.md` §1 defines Staging as an
environment that "mirrors production config," which cannot be defined without
first knowing what production is. `tech_stack.md` §5 deferred this decision
"until product-specific requirements exist."

Following `tech_stack.md` §2's process, this decision is based on Titan Core's
current implementation, not hypothetical future features. An audit of the
repository as it exists today found:

- No network-facing surface anywhere (`http.createServer`, `express`,
  `fastify`, and `.listen()` all return zero matches across `apps/`,
  `engines/`, `packages/`, `runtime/`).
- No CLI entrypoint (no `bin` field in any `package.json`; `apps/titan-shell`
  is a plain in-process factory function, not a runnable program).
- No database or external persistence (root `package.json` has zero runtime
  dependencies; the Knowledge Engine, per ADR-0007, is repository-file-backed
  with an in-memory read model — the SQLite index layer ADR-0007 recommended
  as a future extension was never implemented).
- No `/interfaces` layer (`architecture.md` §3) built for any of the seven
  Titan Core engines — no HTTP API, no published CLI, no event listener
  consuming external input.

Titan Core, as currently implemented, is an in-process library/toolset invoked
directly against its own git repository — architecturally identical to how
every phase of this project has itself been executed to date.

### Decision

Adopt **local/CLI execution** as Titan Core's deployment target: no external
hosting provider, container platform, or serverless runtime is selected.
Titan Core continues to run in-process, invoked directly against its own
repository, exactly as it does today. This unblocks Phase 015's Staging
Environment milestone in principle: "staging" for a local/CLI-execution
target is a clean, freshly-provisioned local/CI environment running the
packaged artifact (already produced and validated in Phase 015 Milestone 6),
not a network-hosted environment requiring provider-specific configuration.

This decision may be superseded by a future ADR once a concrete `/interfaces`
layer (an HTTP API, a published CLI, or similar) is designed and built, giving
a later hosting evaluation something real to evaluate against.

### Alternatives Considered

1. **Containerized service on a generic cloud platform.** Rejected — requires
   a long-running server process and a specific provider choice that nothing
   in the current architecture needs or defines; would require inventing an
   `/interfaces` layer and a provider decision simultaneously, neither
   grounded in the current implementation.
2. **Serverless/FaaS.** Rejected — requires an HTTP or event trigger that
   doesn't exist, and is a poor fit for the Orchestrator Engine's current
   in-process, synchronous design (`architecture.md` §3a: "long-running
   orchestration support").
3. **Managed Node.js PaaS.** Rejected — same reasoning as containerized
   service; adds a managed-platform dependency for a system with no runnable
   service to deploy.

### Consequences

- **Positive:** No new infrastructure, dependency, cost, or attack surface
  introduced (`tech_stack.md` §3's "Operational cost" and "Security track
  record" criteria both favor this option directly). Unblocks Phase 015's
  Staging Environment milestone in principle. Matches how the project has
  actually operated since Phase 000. Preserves the existing engine-boundary
  design (`architecture.md` §3a) without forcing a premature re-architecture
  for network calls between engines.
- **Negative:** Defers real hosting-provider evaluation to a later ADR;
  "staging," "production deployment," and "rollback" require reinterpretation
  for a CLI/library model (e.g., "production" ≈ the stable, tagged artifact
  produced by `npm run package`) rather than a server/container model.
- **Mitigation:** This ADR can be superseded once an `/interfaces` layer is
  designed, at which point a hosting-provider evaluation will have something
  concrete to evaluate. The reinterpretation of "staging"/"production" for
  this target is left to the Staging Environment milestone itself, not
  decided here.

## ADR-0009: Insert Phase 017 (AI Shell & Command Interface); Renumber Maintenance & Continuous Improvement to Phase 018

- **Status:** accepted
- **Date:** 2026-08-07
- **Author:** Claude

### Context

Phase 016 (Production Release) is complete. `roadmap.md` names the next phase (017) "Maintenance & Continuous Improvement" — an open-ended operational phase (`phases/phase-017-maintenance-and-continuous-improvement.md`: "Operate Titan AI in steady state... no end date... revisited indefinitely," Exit Criteria literally including "Not applicable as a terminal ongoing phase").

A concrete, substantial feature request arrived: build Titan AI's first usable interactive CLI/AI shell on top of the seven existing Titan Core engines — a command parser, a command registry (no giant switch statement), and read-oriented commands (`status`, `engines`, `help`, `version`, `plan create`/`plan explain`, `context`, `knowledge list`, `validate` placeholder) exposed through `apps/titan-shell`, which currently only instantiates and registers engines via `createTitanShell()` with no interactive entry point.

This work does not fit "Maintenance & Continuous Improvement" under any reading of that phase's own Objective/Scope/Deliverables/Exit Criteria. `roadmap.md` §4 requires exactly this situation to be handled via ADR: *"Reordering, adding, or removing phases requires: an ADR in `decisions.md`, an update to this table, an update to `current_phase.md`... Do not silently reorder phases mid-session."* This project has handled the same kind of situation before — ADR-0002 inserted Phases 005–011 and renumbered every phase after them to accommodate concrete engine-implementation work discovered mid-course.

Separately, this work is a plausible instance of the `/interfaces` layer ADR-0008 anticipated: ADR-0008 (local/CLI execution) noted its own decision *"may be superseded by a future ADR once a concrete `/interfaces` layer (an HTTP API, a published CLI, or similar) is designed and built."* A CLI shell is exactly that kind of layer, though it does not by itself require revisiting ADR-0008 (a CLI is still local/CLI execution, consistent with — not contradicting — that decision).

### Decision

Insert a new **Phase 017: AI Shell & Command Interface** immediately after Phase 016, with its own Objective/Scope/Deliverables/Acceptance/Exit Criteria (see `phases/phase-017-ai-shell-and-command-interface.md`). Renumber the existing **Maintenance & Continuous Improvement** phase from 017 to **018**; its content is preserved unchanged (`git mv` to `phases/phase-018-maintenance-and-continuous-improvement.md`, only its Phase ID/title/internal cross-references updated). No other phase numbers change.

### Alternatives Considered

1. **Add AI Shell as Phase 018, after Maintenance** — rejected. Maintenance is open-ended with no fixed completion trigger; sequencing a concrete, completable feature phase *after* an indefinite phase doesn't reflect real dependency order, since the shell doesn't depend on Maintenance ever "finishing" (it can't, by its own Exit Criteria).
2. **Overwrite Phase 017's content in place without renumbering** — rejected. Destroys the existing Maintenance phase definition with nowhere to relocate it, violating `phases/README.md`'s "never delete a phase file... document the pivot" rule and `roadmap.md` §4's explicit change process.
3. **Insert as a lettered sub-phase (e.g., `016a`)** — considered, rejected. This work has its own substantial Deliverables/Acceptance/Exit Criteria — a first-class phase, not a governance-only sub-step in the sense `006a` was. A lettered insertion between 016/017 is equivalent in effect to "insert as 017 and renumber," so it collapses to the chosen option without adding value.

### Consequences

- **Positive:** `roadmap.md` accurately reflects real, concrete work; reuses the established renumbering precedent (ADR-0002) rather than inventing a new mechanism; Maintenance's content is fully preserved, just relocated with full git history via `git mv`.
- **Negative:** Any prior reference to "Phase 017" (in `changelog.md` entries, session logs, or this conversation's own earlier turns) meant Maintenance at the time it was written; from this ADR forward, Phase 017 means AI Shell & Command Interface. This is the same kind of consequence ADR-0002's renumbering already created, and is handled the same way: historical entries are read as accurate snapshots as of their own timestamp, not live truth.
- **Mitigation:** This ADR, the updated `roadmap.md` table, and the `git mv`-preserved phase-018 file make the relocation fully traceable.

## ADR-0010: Insert Phase 018 (Titan Shell Control Plane); Renumber Maintenance & Continuous Improvement to Phase 019

- **Status:** accepted
- **Date:** 2026-08-08
- **Author:** Claude

### Context

Phase 017 (AI Shell & Command Interface) is complete: a thin, ten-command proof-of-life CLI (`help`, `status`, `engines`, `version`, `plan create`/`explain`, `context`, `knowledge list`, `validate` placeholder, `clear`, `exit`), evidenced by 653/653 passing tests and manual end-to-end verification, closed 2026-08-07.

A follow-on request arrived: rebuild Titan Shell as a hierarchical command-tree control plane spanning all seven engines' lifecycle objects (Goal → Plan → Workflow → Dispatch → Execution → Validation → Learning), with quote/flag-aware parsing, structured (human/JSON/concise) output, dispatcher-level error handling, real exit codes, and a services/adapters layer separating CLI concerns from engine business logic. This is substantially larger in scope than Phase 017's own Objective and Exit Criteria, which were deliberately narrow ("build the first usable AI shell," not "build the control plane"). Reopening the closed Phase 017 record to absorb this would falsify an already-evidenced historical snapshot, which `phases/README.md`'s own rule ("never delete a phase file... document the pivot") exists to prevent.

It also does not fit Phase 018 (Maintenance & Continuous Improvement, renumbered from 017 by ADR-0009): that phase's Objective/Scope/Exit Criteria describe indefinite steady-state operation ("no end date... revisited indefinitely," Exit Criteria literally "not applicable as a terminal ongoing phase"), not a scoped, completable redesign. This is the identical situation ADR-0009 already resolved for the original AI Shell request, one phase earlier.

`roadmap.md` §4 requires exactly this to be handled via ADR: *"Reordering, adding, or removing phases requires: an ADR in `decisions.md`, an update to this table, an update to `current_phase.md`... Do not silently reorder phases mid-session."*

### Decision

Insert a new **Phase 018: Titan Shell Control Plane** immediately after Phase 017, with its own Objective/Scope/Milestones/Exit Criteria (see `phases/phase-018-titan-shell-control-plane.md`). Renumber the existing **Maintenance & Continuous Improvement** phase from 018 to **019**; its content is preserved unchanged (`git mv` to `phases/phase-019-maintenance-and-continuous-improvement.md`, only its Phase ID/title/internal cross-references updated). No other phase numbers change.

### Alternatives Considered

1. **Reopen Phase 017 and expand its scope** — rejected. Falsifies a closed, evidenced record; `phases/README.md` requires documenting pivots via a new entry or ADR, not rewriting history in place.
2. **Fold this work into Phase 018 Maintenance** — rejected, same reasoning ADR-0009 already applied to the original AI Shell request: an indefinite, non-terminal phase is not a fit for a scoped, completable feature.
3. **Append as Phase 019, after Maintenance** — rejected. Maintenance is open-ended by its own Exit Criteria ("not applicable as a terminal ongoing phase"); sequencing a concrete, dependent-order phase after an indefinite one doesn't reflect real dependency order, identical to ADR-0009's own Alternative 1 rejection.

### Consequences

- **Positive:** `roadmap.md` accurately reflects real, concrete work; reuses the ADR-0002/ADR-0009 renumbering precedent rather than inventing a new mechanism; Maintenance's content is fully preserved, just relocated with full git history via `git mv`.
- **Negative:** Any prior reference to "Phase 018" (in `changelog.md` entries, session logs, or earlier conversation turns) meant Maintenance at the time it was written; from this ADR forward, Phase 018 means Titan Shell Control Plane. Handled the same way ADR-0002's and ADR-0009's renumbering already established: historical entries are read as accurate snapshots as of their own timestamp, not live truth.
- **Mitigation:** This ADR, the updated `roadmap.md` table, and the `git mv`-preserved phase-019 file make the relocation fully traceable.

## ADR-0011 through ADR-000N

No further decisions have been made yet. Add new entries below this line using `templates/adr-template.md`, incrementing the number sequentially. Do not skip numbers; do not reuse numbers.
