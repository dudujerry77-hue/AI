# Learning Engine

Milestone 1 package for the Titan Core Learning Engine: the shared
runtime lifecycle contract only. No business methods exist yet.

## Scope (Milestone 1)

- `LearningEngine` extends the shared `BaseEngine`, inheriting the
  full Titan runtime engine contract (lifecycle, health, metadata,
  version, contract version, and state) unmodified.
- No business methods, request/response types, or domain model exist
  in this package yet.

## Runtime Contract (inherited from `BaseEngine`)

`LearningEngine` extends the shared `BaseEngine` and inherits the full
Titan runtime engine contract without any override:

- `initialize()`
- `start()`
- `stop()`
- `health()`
- `metadata()`
- `version()`
- `contractVersion()`
- `getState()`

`metadata()` reports:

- `id`: `learning-engine`
- `name`: `Learning Engine`
- `version`: `1.0.0`
- `contractVersion`: the shared `ENGINE_API_CONTRACT_VERSION`
- `capabilities`: `[]` (empty — no business capability is advertised
  until it is implemented)

## Why No Business Methods Exist Yet

Every other Titan Core engine declared its complete planned public API
as `NotImplementedError` stubs from its own Milestone 1 (e.g.
`ValidationEngine.validate`/`getValidationStatus`/`approveValidation`/
`rejectValidation`). The Learning Engine deliberately does not follow
that precedent for Milestone 1.

`phases/phase-012-learning-engine-implementation.md` describes the
Learning Engine's Scope, Deliverables, and Acceptance Criteria in
prose (observing plan-execute-validate cycles, generating reusable
heuristics and improvement proposals, and feeding approved learning
artifacts into governance-aware memory) but — unlike `validate`,
`execute`, or `orchestrate` for prior engines — does not name a single
concrete method. Declaring specific method names now would mean
inventing a business API surface rather than deriving it from
governance text, which Phase 012 governance has explicitly ruled out.

A specification-grounding review — reading
`phases/phase-012-learning-engine-implementation.md`, `architecture.md`,
and any Learning Engine specification document they reference — must
be performed before Milestone 3 to derive the Learning Engine's real
public API and remaining milestones directly from repository
requirements. Milestone 2 (domain model) and any business method
stubs will follow from that review's findings.

## Explicit Non-Goals (Milestone 1)

- No signal extraction from plan-execute-validate cycles.
- No heuristic or improvement-proposal generation.
- No knowledge writes or feedback to the Knowledge Engine.
- No scoring, no rule engines, no AI reasoning, no heuristics.
- No persistence, no networking, no filesystem access.
- No scheduling, no retries.
- No orchestration, no execution, no validation logic.
- No cross-engine runtime calls — this package does not import,
  instantiate, or call the runtime of any other Titan engine.
