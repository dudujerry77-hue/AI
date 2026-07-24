# Validation Engine

Milestone 2 package for the Titan Core Validation Engine: complete
planned domain model. Runtime behavior is **unchanged from
Milestone 1**.

## Scope (Milestone 2)

This milestone builds on Milestone 1 by expanding
`src/models/types.ts` into the Validation Engine's complete planned
domain model, following the exact pattern used by the Execution
Engine's own Milestone 2. **No runtime behavior changes in this
milestone.**

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`).
- Retains all four public API methods (`validate`,
  `getValidationStatus`, `approveValidation`, `rejectValidation`) as
  unconditional `NotImplementedError` stubs, unchanged in behavior
  from Milestone 1. No request field is read by any method.
- Expands the domain model with pure, immutable data definitions
  covering every domain concept named by the Phase 011 specification:
  the validation verdict pipeline, evidence reporting, testing/
  quality/policy/security/governance checks, escalation triggers, and
  the planned handoff to the Learning Engine.
- Updates `ValidationValidateRequest` (in `src/index.ts`) to
  additionally carry optional `policyRules` and `governanceRules`
  fields, for future-shape consistency with the new
  `ValidationPipelineRequest` type. This is a type-only, additive
  change — `validate()` still unconditionally throws
  `NotImplementedError` and reads none of its request fields.
- Exports all new domain types from the package entry point
  (`src/index.ts`).

**This milestone implements no validation logic whatsoever.** No
verdict is computed, no evidence is collected, no check of any kind
is performed, no escalation is triggered, and no handoff to the
Learning Engine occurs anywhere in this package.

## Runtime Contract (inherited from `BaseEngine`, unchanged since Milestone 1)

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

This is the same complete planned capability list advertised since
Milestone 1.

## Public API (Milestone 2 — all stubs, unchanged from Milestone 1)

| Method | Behavior (Milestone 2) |
|---|---|
| `validate(request)` | Always throws `NotImplementedError`. No request field is read. `request` may now optionally carry `policyRules`/`governanceRules` (type-only addition; still unread). |
| `getValidationStatus(request)` | Always throws `NotImplementedError`. No request field is read. |
| `approveValidation(request)` | Always throws `NotImplementedError`. No request field is read. |
| `rejectValidation(request)` | Always throws `NotImplementedError`. No request field is read. |

Every method remains fully typed, returns the appropriate `Promise`
type, and contains exactly one statement:
`throw new NotImplementedError(...)`.

## Domain Model (Milestone 2 — expanded)

All types in `src/models/types.ts` remain pure, immutable data
definitions only — no algorithms, no helper functions, no validation
logic, and no runtime behavior. Milestone 1 types are retained
unchanged; Milestone 2 adds:

| Type | Purpose |
|---|---|
| `ValidationVerdictStatus` | `'pass' \| 'fail' \| 'partial'` (unchanged from Milestone 1). |
| `ValidationCheckType` | `'testing' \| 'quality' \| 'policy' \| 'security' \| 'governance'` (unchanged from Milestone 1). |
| `ValidationTarget` | Identifies which Execution Engine output is under review (unchanged from Milestone 1). |
| `ValidationCheckResult` | A single structured check result (unchanged from Milestone 1). |
| `ValidationVerdict` | The structured, reproducible verdict outcome (unchanged from Milestone 1). |
| `ValidationEvidence` | Supports verdict traceability (unchanged from Milestone 1). |
| `ValidationLearningHandoff` | Describes the planned handoff to the Learning Engine (unchanged from Milestone 1). |
| `ValidationSubject` | The (future) Execution Engine output to be verified (unchanged from Milestone 1). |
| `ValidationIssueCode`, `ValidationIssue` | Reserved for a future milestone's structural validator (unchanged from Milestone 1). |
| `ValidationStructuralResult` | **New.** Reserved, structural validation report shape parallel to the Execution Engine's `ExecutionValidationResult`. |
| `ValidationEscalationReason` | **New.** Classification for reasons contributing to an escalation decision. |
| `ValidationEscalation` | **New.** Structured escalation decision associated with a verdict, for Orchestrator consumption. |
| `ValidationPolicyRule` | **New.** Declarative policy constraint for a `'policy'`-typed check. |
| `ValidationGovernanceRule` | **New.** Declarative governance rule for a `'governance'`-typed check. |
| `ValidationPipelineRequest` | **New.** Planned input shape for the validation verdict pipeline. |
| `ValidationPipelineResult` | **New.** Planned structured output of the validation verdict pipeline: verdict + evidence + escalations. |

No value of any of these types is created, populated, or transformed
anywhere in this package in Milestone 2.

## Explicit Non-Goals (Milestone 2)

The following are explicitly **not** implemented anywhere in this
package:

- No validation algorithms of any kind.
- No approval logic.
- No rejection logic.
- No policy evaluation or enforcement — `ValidationPolicyRule` fields
  are never read, checked, or enforced.
- No governance rule enforcement — `ValidationGovernanceRule` fields
  are never read, checked, or enforced.
- No rule engines.
- No AI reasoning.
- No scoring.
- No persistence.
- No networking.
- No scheduling.
- No retries.
- No orchestration.
- No execution logic.
- No learning integration — `ValidationLearningHandoff` is a pure
  data contract only; no handoff is ever transmitted.
- No escalation logic — `ValidationEscalation` is a pure data contract
  only; no escalation is ever triggered or evaluated.
- No cross-engine runtime calls — this package never imports,
  instantiates, or calls the runtime of the Planner, Orchestrator,
  Execution, Knowledge, or Context engines. The Execution Engine's
  `ExecutionRecord`/`ExecutionSummary` types are referenced by type
  only, in `ValidationSubject`, purely to describe a future input
  shape.

## Explicit Statement of Current Behavior

This package currently provides only:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unmodified since Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   inherited unchanged from `BaseEngine`.
3. The Validation Engine's complete planned domain model
   (`src/models/types.ts`), expanded in this milestone.
4. Four typed, unimplemented public API stubs (`validate`,
   `getValidationStatus`, `approveValidation`, `rejectValidation`),
   each of which always throws `NotImplementedError`, unchanged in
   behavior from Milestone 1.

No independent verification of Execution Engine output, no evidence
collection, no verdict computation, no escalation logic, no learning
handoff, and no cross-engine behavior of any kind exists anywhere in
this package. Those remain out of scope for this milestone and will
be introduced by later Validation Engine milestones.
