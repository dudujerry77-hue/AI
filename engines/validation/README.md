# Validation Engine

Milestone 1 package for the Titan Core Validation Engine: runtime
foundation only.

## Scope (Milestone 1)

This milestone establishes the Validation Engine's runtime foundation
and typed public API surface, following the exact pattern used by the
Planner, Orchestrator, and Execution engines' own Milestone 1
implementations.

- Implements `ValidationEngine`, extending the shared `BaseEngine`.
  Inherits the complete Titan runtime engine contract **unchanged**:
  no lifecycle method is overridden.
- Defines the initial planned Validation Engine domain model
  (`src/models/types.ts`) as pure, immutable data type definitions
  covering the domain concepts named by the Phase 011 specification:
  validation verdicts, evidence reporting, testing/quality/policy
  checks, and structured pass/fail/partial outcomes.
- Defines four typed, async public API methods — `validate`,
  `getValidationStatus`, `approveValidation`, `rejectValidation` — all
  of which **unconditionally throw `NotImplementedError`**.
- Defines `NotImplementedError` and a reserved
  `ValidationRequestError` (not yet thrown anywhere in this package).

**This milestone implements no validation logic whatsoever.** No
request field is read by any public API method. No verdict is
computed. No evidence is collected. No check of any kind (testing,
quality, policy, security, or governance) is performed.

## Runtime Contract (inherited from `BaseEngine`, unchanged)

`ValidationEngine` extends the shared `BaseEngine` and inherits the
full Titan runtime engine contract without any override:

- `initialize()`
- `start()`
- `stop()`
- `health()`
- `metadata()`
- `version()`
- `contractVersion()`
- `getState()`

`metadata()` reports:

- `id`: `validation-engine`
- `name`: `Validation Engine`
- `version`: `1.0.0`
- `contractVersion`: the shared `ENGINE_API_CONTRACT_VERSION`
- `capabilities`: `validation.validate`,
  `validation.get-validation-status`,
  `validation.approve-validation`, `validation.reject-validation`

This capability list advertises the Validation Engine's **planned**
public API surface; it does not imply any of these capabilities is
currently implemented.

## Public API (Milestone 1 — all stubs)

| Method | Behavior (Milestone 1) |
|---|---|
| `validate(request)` | Always throws `NotImplementedError`. No request field is read. |
| `getValidationStatus(request)` | Always throws `NotImplementedError`. No request field is read. |
| `approveValidation(request)` | Always throws `NotImplementedError`. No request field is read. |
| `rejectValidation(request)` | Always throws `NotImplementedError`. No request field is read. |

Every method is fully typed, returns the appropriate `Promise` type,
and contains exactly one statement: `throw new NotImplementedError(...)`.

## Domain Model (Milestone 1)

All types in `src/models/types.ts` are pure, immutable data
definitions only — no algorithms, no helper functions, no validation
logic, and no runtime behavior:

- `ValidationVerdictStatus` — `'pass' | 'fail' | 'partial'`
- `ValidationCheckType` — `'testing' | 'quality' | 'policy' | 'security' | 'governance'`
- `ValidationTarget` — identifies which Execution Engine output is
  under review.
- `ValidationCheckResult` — a single structured check result.
- `ValidationVerdict` — the structured, reproducible verdict outcome.
- `ValidationEvidence` — supports verdict traceability.
- `ValidationLearningHandoff` — describes the planned handoff to the
  Learning Engine.
- `ValidationSubject` — the (future) Execution Engine output to be
  verified, referencing the Execution Engine's `ExecutionRecord` and
  `ExecutionSummary` **by type only**.
- `ValidationIssueCode`, `ValidationIssue` — reserved for a future
  milestone's structural validator; not populated in Milestone 1.

No value of any of these types is created, populated, or transformed
anywhere in this package in Milestone 1.

## Explicit Non-Goals (Milestone 1)

The following are explicitly **not** implemented anywhere in this
package:

- No validation algorithms of any kind.
- No approval logic.
- No rejection logic.
- No policy evaluation.
- No rule engines.
- No AI reasoning.
- No scoring.
- No persistence.
- No networking.
- No scheduling.
- No retries.
- No orchestration.
- No execution logic.
- No cross-engine runtime calls — this package never imports,
  instantiates, or calls the runtime of the Planner, Orchestrator,
  Execution, Knowledge, or Context engines. The Execution Engine's
  `ExecutionRecord`/`ExecutionSummary` types are referenced by type
  only, in `ValidationSubject`, purely to describe a future input
  shape.

## Explicit Statement of Current Behavior

This package currently provides only:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unmodified.
2. Working health, metadata, version, and contract-version reporting,
   inherited unchanged from `BaseEngine`.
3. The Validation Engine's initial planned domain model
   (`src/models/types.ts`).
4. Four typed, unimplemented public API stubs (`validate`,
   `getValidationStatus`, `approveValidation`, `rejectValidation`),
   each of which always throws `NotImplementedError`.

No independent verification of Execution Engine output, no evidence
collection, no verdict computation, and no cross-engine behavior of
any kind exists anywhere in this package. Those remain out of scope
for this milestone and will be introduced by later Validation Engine
milestones.
