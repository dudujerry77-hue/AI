# Validation Engine

Milestone 5 package for the Titan Core Validation Engine: a
deterministic structural validation pipeline — verdict construction
(Milestone 3, `ValidationBuilder`) composed with structural evidence
collection (Milestone 5, `ValidationEvidenceCollector`) via
`ValidationPipelineRunner` — and a deterministic structural validation
validator (Milestone 4, `ValidationValidator`). `approveValidation`
and `rejectValidation` remain unconditional `NotImplementedError`
stubs, unchanged in behavior from Milestone 1; Milestone 6 (approval/
rejection workflows) was evaluated and deliberately deferred — see
"Milestone 6 — Deliberately Deferred" below.

## Scope (Milestones 3–5)

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`).
- **Milestone 3** introduces `ValidationBuilder`
  (`src/builders/validation-builder.ts`): a pure, synchronous,
  deterministic translator that consumes a `ValidationSubject`
  (wrapping an Execution Engine `ExecutionRecord` and, optionally, its
  `ExecutionSummary` — imported by type only) and produces a
  `ValidationPipelineResult`. Unchanged since Milestone 3.
- **Milestone 4** introduces `ValidationValidator`
  (`src/validation/validation-validator.ts`): a pure, synchronous,
  deterministic structural validator that checks an already-built
  `ValidationVerdict` for structural correctness (required
  identifiers, enum membership, timestamp format, and internal
  reference consistency) and returns a `ValidationStructuralResult`.
  `ValidationEngine.getValidationStatus()` validates only the shape of
  its request and delegates entirely to `ValidationValidator.validate`,
  returning its output unchanged. Unchanged since Milestone 4.
- **Milestone 5** introduces `ValidationEvidenceCollector`
  (`src/evidence/validation-evidence-collector.ts`) and
  `ValidationPipelineRunner` (`src/pipeline/validation-pipeline-runner.ts`):
  - `ValidationEvidenceCollector.collect(subject, verdict, timestamp?)`
    is a pure, synchronous, deterministic function that derives
    exactly one `ValidationEvidence` record per call, structurally
    recording which Execution Engine representation
    (`ExecutionSummary` or `ExecutionRecord`) the verdict was derived
    from. This is **not** real evidence collection — no test output
    capture, log collection, artifact inspection, or check execution
    is performed; every field is copied or composed verbatim from data
    already present on `subject`/`verdict`.
  - `ValidationPipelineRunner.run(subject, timestamp?)` resolves a
    single timestamp, delegates verdict construction to
    `ValidationBuilder.build` and evidence collection to
    `ValidationEvidenceCollector.collect` (both receiving the same
    resolved timestamp), and composes their outputs into one
    `ValidationPipelineResult`. It contains no structural logic beyond
    this composition.
  - `ValidationEngine.validate()` now validates only the shape of its
    request and delegates entirely to `ValidationPipelineRunner.run`
    (previously `ValidationBuilder.build` directly), returning its
    output unchanged. As a result, `ValidationPipelineResult.evidence`
    is no longer always empty on a successful call.
    `ValidationPipelineResult.escalations` remains always empty —
    escalation determination is out of scope for this milestone.
- `approveValidation` and `rejectValidation` remain unconditional
  `NotImplementedError` stubs, unchanged in behavior from Milestone 1.
  No request field is read by either method.

**Neither `ValidationBuilder`, `ValidationEvidenceCollector`,
`ValidationPipelineRunner`, nor `ValidationValidator` performs any
approval, rejection, policy evaluation, governance enforcement,
escalation determination, learning integration, execution,
orchestration, persistence, networking, AI logic, or heuristic
behavior.** No scheduling, no retries, and no call to any other Titan
engine's runtime exist anywhere in this package — the Execution
Engine's `ExecutionSummary`/`ExecutionRecord` types are used only as
read-only, type-only input shapes.

## Milestone 6 — Deliberately Deferred

Milestone 6 (`approveValidation`/`rejectValidation`) was evaluated
against the architectural boundaries established since Milestone 1 and
found to be **not implementable as pure deterministic structural
processing**, for two independent reasons:

1. **No lookup mechanism exists.** Both methods' request shapes
   (`ValidationApproveValidationRequest`/`ValidationRejectValidationRequest`)
   carry only a `validationId` and an optional `reason` — not a
   `ValidationVerdict`. Producing a `ValidationVerdict` from a bare id
   would require a validation store/lookup mechanism. No such store
   exists anywhere in this package (the same reasoning that drove
   `getValidationStatus()`'s Milestone 4 request-shape change to carry
   a full `ValidationVerdict` instead of an id), and introducing one
   would mean adding persistence — explicitly out of scope.
2. **Approval/rejection are not structural transformations.** Even if
   the request shape were changed to carry a full verdict, "approving"
   or "rejecting" a verdict is inherently a business/authority
   decision (who may approve, under what conditions, with what audit
   trail) rather than a value derivable purely from the shape of its
   input. Implementing it as a real decision would introduce business
   logic and (for a meaningful audit trail) persistence; implementing
   it as a no-op structural placeholder (e.g., unconditionally forcing
   `status` to `'pass'`/`'fail'`) would misrepresent an approval
   decision that was never actually made.

This mirrors the precedent set by `cancelExecution()` in the Execution
Engine (Phase 010) and `cancelPlan()` in the Planner Engine (Phase
008): both were left as intentionally unimplemented
`NotImplementedError` stubs after a governance review found no
explicit requirement and no way to implement them without crossing an
established architectural boundary. `approveValidation` and
`rejectValidation` remain unconditional `NotImplementedError` stubs;
their implementation is deferred until a future phase or ADR defines
approval/rejection authority and persistence semantics for the
Validation Engine.

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

## Public API (Milestone 5)

| Method                         | Behavior (Milestone 5)                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate(request)`            | Validates that `request` is a non-null object, then delegates entirely to `ValidationPipelineRunner.run(request.subject)`. Returns a `ValidationPipelineResult`, now with a populated `evidence` array. `request.policyRules`/`request.governanceRules`, if present, are never read. Throws `ValidationRequestError` for a malformed request or subject. |
| `getValidationStatus(request)` | Validates that `request` is a non-null object, then delegates entirely to `ValidationValidator.validate(request.verdict)`. Returns a `ValidationStructuralResult`. Throws `ValidationRequestError` for a malformed request or verdict. Unchanged since Milestone 4.                                                                                      |
| `approveValidation(request)`   | Always throws `NotImplementedError`. No request field is read. Milestone 6 deliberately deferred — see above.                                                                                                                                                                                                                                            |
| `rejectValidation(request)`    | Always throws `NotImplementedError`. No request field is read. Milestone 6 deliberately deferred — see above.                                                                                                                                                                                                                                            |

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

Note: `ValidationBuilder.build`'s own return value still sets
`evidence: []` — this is unchanged since Milestone 3. The populated
`evidence` seen via `ValidationEngine.validate()` is added afterward
by `ValidationPipelineRunner`, described below.

## `ValidationEvidenceCollector` (Milestone 5)

`ValidationEvidenceCollector.collect(subject, verdict, timestamp?)`
derives exactly one `ValidationEvidence` record per call:

- `validationId` is copied verbatim from `verdict.validationId`.
- `source` is `'execution-summary'` if `subject.summary` is present,
  otherwise `'execution-record'`.
- `description` is a fixed, deterministic sentence naming the
  verdict's `validationId`, the source representation, and
  `verdict.target.executionId`.
- `capturedAt` is the same caller-supplied (or freshly read) ISO-8601
  timestamp used elsewhere in the pipeline.
- `attachments` is never populated.

This is **not** real evidence collection — no test output, log, or
artifact is ever inspected, captured, or referenced. It structurally
records which input representation a verdict came from, nothing more.
`ValidationEvidenceCollector` never mutates its input. It throws
`ValidationRequestError` only when `subject` or `verdict` (or
`verdict.target`) is missing or malformed.

## `ValidationPipelineRunner` (Milestone 5)

`ValidationPipelineRunner.run(subject, timestamp?)` resolves a single
timestamp (caller-supplied, or freshly read once if omitted),
delegates to `ValidationBuilder.build(subject, timestamp)` for verdict
construction and to
`ValidationEvidenceCollector.collect(subject, verdict, timestamp)` for
evidence, and returns `{ verdict, evidence, escalations: built.escalations }`.
It performs no structural logic beyond this composition and is the
sole delegate of `ValidationEngine.validate()`.

## `ValidationValidator` (Milestone 4)

`ValidationValidator.validate(verdict, timestamp?)` checks only the
_structure_ of an already-constructed `ValidationVerdict`:

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
catalogue; no type was added, removed, or changed in Milestones 3–5.

## Explicit Non-Goals (Milestones 3–5)

The following are explicitly **not** implemented anywhere in this
package:

- No approval logic — `approveValidation` remains an unconditional
  `NotImplementedError` stub, deliberately deferred as Milestone 6
  (see above).
- No rejection logic — `rejectValidation` remains an unconditional
  `NotImplementedError` stub, deliberately deferred as Milestone 6
  (see above).
- No policy evaluation or enforcement — `ValidationPolicyRule` fields
  are never read, checked, or enforced by `ValidationBuilder`,
  `ValidationEvidenceCollector`, `ValidationPipelineRunner`, or
  `ValidationValidator`.
- No governance rule enforcement — `ValidationGovernanceRule` fields
  are never read, checked, or enforced.
- No check execution of any kind (testing, quality, policy, security,
  governance) — `ValidationBuilder` always returns an empty `checks`
  array; `ValidationValidator` only checks the _shape_ of any checks
  already present.
- No **real** evidence collection — `ValidationEvidenceCollector`
  records only which Execution Engine representation a verdict was
  derived from; no test output, log, or artifact is ever captured or
  referenced.
- No escalation logic — `ValidationPipelineResult.escalations` remains
  always an empty array (unchanged since Milestone 3).
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
   unchanged, now invoked via `ValidationPipelineRunner`.
5. A deterministic structural `ValidationEvidenceCollector` and
   `ValidationPipelineRunner` (Milestone 5), wired into `validate()`.
6. A deterministic structural `ValidationValidator` (Milestone 4),
   wired into `getValidationStatus()`.
7. Two remaining typed, unimplemented public API stubs
   (`approveValidation`, `rejectValidation`), each of which always
   throws `NotImplementedError`, unchanged in behavior from
   Milestone 1, deliberately deferred as Milestone 6 (see above).

No independent business-level verification, no **real** evidence
collection (only structural source-representation recording), no
verdict _evaluation_ (only structural translation), no escalation
logic, no learning handoff, no approval/rejection workflow, and no
cross-engine runtime behavior of any kind exists anywhere in this
package. Those remain out of scope pending a future phase or ADR that
defines their semantics.
