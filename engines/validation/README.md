# Validation Engine

Milestone 4 package for the Titan Core Validation Engine: a
deterministic structural validation builder (Milestone 3) and a
deterministic structural validation validator (Milestone 4).
`approveValidation` and `rejectValidation` remain unconditional
`NotImplementedError` stubs, unchanged from Milestone 1.

## Scope (Milestones 3–4)

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`).
- **Milestone 3** introduces `ValidationBuilder`
  (`src/builders/validation-builder.ts`): a pure, synchronous,
  deterministic translator that consumes a `ValidationSubject`
  (wrapping an Execution Engine `ExecutionRecord` and, optionally, its
  `ExecutionSummary` — imported by type only) and produces a
  `ValidationPipelineResult`. `ValidationEngine.validate()` now
  validates only the shape of its request and delegates entirely to
  `ValidationBuilder.build`, returning its output unchanged.
- **Milestone 4** introduces `ValidationValidator`
  (`src/validation/validation-validator.ts`): a pure, synchronous,
  deterministic structural validator that checks an already-built
  `ValidationVerdict` for structural correctness (required
  identifiers, enum membership, timestamp format, and internal
  reference consistency) and returns a `ValidationStructuralResult`.
  `ValidationEngine.getValidationStatus()` now validates only the
  shape of its request and delegates entirely to
  `ValidationValidator.validate`, returning its output unchanged. The
  Milestone 1 `NotImplementedError` stub for this method has been
  removed.
- `approveValidation` and `rejectValidation` remain unconditional
  `NotImplementedError` stubs, unchanged in behavior from Milestone 1.
  No request field is read by either method.

**Neither `ValidationBuilder` nor `ValidationValidator` performs any
approval, rejection, learning integration, execution, orchestration,
persistence, networking, AI logic, or heuristic behavior.** No
scheduling, no retries, and no call to any other Titan engine's
runtime exist anywhere in this package — the Execution Engine's
`ExecutionSummary`/`ExecutionRecord` types are used only as read-only,
type-only input shapes.

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

## Public API (Milestone 4)

| Method | Behavior (Milestone 4) |
|---|---|
| `validate(request)` | Validates that `request` is a non-null object, then delegates entirely to `ValidationBuilder.build(request.subject)`. Returns a `ValidationPipelineResult`. `request.policyRules`/`request.governanceRules`, if present, are never read. Throws `ValidationRequestError` for a malformed request or subject. |
| `getValidationStatus(request)` | Validates that `request` is a non-null object, then delegates entirely to `ValidationValidator.validate(request.verdict)`. Returns a `ValidationStructuralResult`. Throws `ValidationRequestError` for a malformed request or verdict. |
| `approveValidation(request)` | Always throws `NotImplementedError`. No request field is read. |
| `rejectValidation(request)` | Always throws `NotImplementedError`. No request field is read. |

## `ValidationBuilder` (Milestone 3)

`ValidationBuilder.build(subject, timestamp?)` performs pure
structural translation only:

- `ValidationTarget.workflowId`, `.itemId`, and `.itemType` are copied
  verbatim from `subject.summary.target` if `summary` is present,
  otherwise from `subject.record.target`.
- `ValidationTarget.executionId` is copied verbatim from
  `subject.summary.executionId` (falling back to
  `subject.record.executionId`).
- `ValidationVerdict.validationId` is deterministically derived as
  `validation-<workflowId>-<itemId>`.
- `ValidationVerdict.status` is always `'partial'` — a fixed,
  structural placeholder; Milestone 3 performs no real check
  evaluation.
- `ValidationVerdict.checks` is always `[]`.
- `ValidationVerdict.createdAt`/`.updatedAt` are set to the same
  caller-supplied (or freshly read) ISO-8601 timestamp.
- `ValidationPipelineResult.evidence` and `.escalations` are always
  `[]`.

`ValidationBuilder` never mutates its input. It throws
`ValidationRequestError` only when `subject`, `subject.record`, or the
target identifiers derivable from it are missing or malformed.

## `ValidationValidator` (Milestone 4)

`ValidationValidator.validate(verdict, timestamp?)` checks only the
*structure* of an already-constructed `ValidationVerdict`:

- Required identifiers (`validationId`, `target.executionId`,
  `target.workflowId`, `target.itemId`) are non-empty strings.
- `target.itemType` is a member of `'step' | 'task'`.
- `status` (verdict-level and per-check) is a member of
  `'pass' | 'fail' | 'partial'`.
- Each entry in `checks` is a well-formed object with a non-empty
  `checkId` and a `checkType` from the known enumeration.
- `createdAt`/`updatedAt` are well-formed ISO-8601 timestamps, and
  `updatedAt` is not earlier than `createdAt`.

Ordinary structural defects are collected and returned in
`ValidationStructuralResult.issues` (never thrown). `validate` throws
`ValidationRequestError` only when `verdict` itself is not a
well-formed, inspectable object (e.g. `null`, an array, or missing its
`target` object entirely).

`ValidationValidator` never approves, rejects, executes policy,
learns, or performs any business decision — it reports structural
defects only.

## Domain Model (unchanged from Milestone 2)

All types in `src/models/types.ts` remain pure, immutable data
definitions. See Milestone 2 documentation history for the full type
catalogue; no type was added, removed, or changed in Milestones 3–4.

## Explicit Non-Goals (Milestones 3–4)

The following are explicitly **not** implemented anywhere in this
package:

- No approval logic — `approveValidation` remains an unconditional
  `NotImplementedError` stub.
- No rejection logic — `rejectValidation` remains an unconditional
  `NotImplementedError` stub.
- No policy evaluation or enforcement — `ValidationPolicyRule` fields
  are never read, checked, or enforced by `ValidationBuilder` or
  `ValidationValidator`.
- No governance rule enforcement — `ValidationGovernanceRule` fields
  are never read, checked, or enforced.
- No check execution of any kind (testing, quality, policy, security,
  governance) — `ValidationBuilder` always returns an empty `checks`
  array; `ValidationValidator` only checks the *shape* of any checks
  already present.
- No evidence collection — `ValidationBuilder` always returns an empty
  `evidence` array.
- No escalation logic — `ValidationBuilder` always returns an empty
  `escalations` array.
- No learning integration — `ValidationLearningHandoff` is a pure data
  contract only; no handoff is ever transmitted.
- No scoring, no rule engines, no AI reasoning, no heuristics.
- No persistence, no networking, no filesystem access.
- No scheduling, no retries.
- No orchestration, no execution logic.
- No cross-engine runtime calls — this package never imports,
  instantiates, or calls the runtime of the Planner, Orchestrator,
  Execution, Knowledge, Context, or Learning engines. The Execution
  Engine's `ExecutionRecord`/`ExecutionSummary` types are referenced by
  type only, in `ValidationSubject` and `ValidationBuilder`.

## Explicit Statement of Current Behavior

This package currently provides only:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unmodified since Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   inherited unchanged from `BaseEngine`.
3. The Validation Engine's complete planned domain model
   (`src/models/types.ts`), unchanged since Milestone 2.
4. A deterministic structural `ValidationBuilder` (Milestone 3),
   wired into `validate()`.
5. A deterministic structural `ValidationValidator` (Milestone 4),
   wired into `getValidationStatus()`.
6. Two remaining typed, unimplemented public API stubs
   (`approveValidation`, `rejectValidation`), each of which always
   throws `NotImplementedError`, unchanged in behavior from
   Milestone 1.

No independent business-level verification, no evidence collection, no
verdict *evaluation* (only structural translation), no escalation
logic, no learning handoff, and no cross-engine runtime behavior of
any kind exists anywhere in this package. Those remain out of scope
for this milestone and will be introduced by later Validation Engine
milestones.
