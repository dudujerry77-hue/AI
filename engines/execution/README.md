# Execution Engine

Milestone 5 package for the Titan Core Execution Engine: deterministic
structural execution builder (Milestone 3, unchanged), deterministic
structural execution validator (Milestone 4, unchanged), plus a new
deterministic structural execution status tracker. Runtime foundation
unchanged.

## Scope (Milestone 5)

This milestone builds on Milestone 4 by implementing `reportResult()`
for the first time. **Despite its name, `reportResult()` does not
perform any real result reporting in this milestone.** It exists
purely for API evolution consistency with `execute()` and
`getExecutionStatus()`: it validates its request and delegates
entirely to a new `ExecutionStatusTracker`, which deterministically,
structurally summarizes a supplied `ExecutionRecord` — computing only
information already present on that record (identifiers, recorded
status, recorded timestamps, a duration derived purely from those
timestamps, and a terminal/cancelled classification derived purely
from the recorded status) — and returns the resulting
`ExecutionSummary`. No `ExecutionReport` is ever created, populated,
or transmitted, and no persistence or reporting of any kind occurs.

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`).
- Retains the complete Milestone 2 domain model unchanged (with
  additive extensions to `ExecutionSummary` only; see below).
- Retains `ExecutionBuilder`/`ExecutionEngine.execute()` unchanged from
  Milestone 3.
- Retains `ExecutionValidator`/`ExecutionEngine.getExecutionStatus()`
  unchanged from Milestone 4.
- Retains `cancelExecution` as the Execution Engine's only remaining
  unimplemented `NotImplementedError` stub, unchanged in behavior.
- **Implements `reportResult()`**: validates the request, then
  delegates entirely to `ExecutionStatusTracker.summarize`, returning
  the resulting `ExecutionSummary`.
- Adds `ExecutionStatusTracker`
  (`src/status/execution-status-tracker.ts`): a synchronous,
  deterministic, offline structural status tracker.
- Extends `ExecutionSummary` (defined since Milestone 1 but never
  populated until now) with additive fields: `createdAt`, `updatedAt`,
  `durationMs` (optional), `isTerminal`, `isCancelled`.
- Changes `ExecutionReportResultRequest` to carry the full
  `ExecutionRecord` to summarize (`record`), rather than only an
  `executionId` plus an optional `handoff`, since `reportResult()` now
  delegates entirely to `ExecutionStatusTracker.summarize`, which
  summarizes the structure of an already-constructed `ExecutionRecord`
  rather than looking one up by id. `handoff` is retained as an
  optional field but is never read.
- Changes `reportResult()`'s return type from the never-implemented
  `ExecutionResult` to `ExecutionSummary`.

Explicitly out of scope for Milestone 5 (and not present anywhere in
this package):

- **No real result reporting** — `reportResult()` never creates,
  populates, or transmits an `ExecutionReport`,
  `ExecutionObservabilityEvent`, `ExecutionContextUpdate`, or
  `ExecutionValidationHandoff` value. `request.handoff` is accepted for
  request-shape compatibility only and is never read.
- **No execution store or lookup mechanism** — `reportResult()`
  summarizes a caller-supplied `ExecutionRecord`; it does not look one
  up by `executionId` from any store, cache, database, or in-memory
  map. None exists in this package.
- **No real execution logic** — no step or task is ever actually run,
  simulated, or acted upon.
- **No retries** — no retry loops, backoff, or retry counters.
- **No scheduling** — no ordering, queuing, or timing logic of any
  kind.
- **No cancellation logic** — `cancelExecution` performs no state
  transition of any kind; it only throws `NotImplementedError`.
- **No inference beyond existing structure** —
  `ExecutionStatusTracker` never infers, guesses, or derives anything
  that is not already represented structurally on the input
  `ExecutionRecord`. `durationMs` is computed only when both
  `createdAt` and `updatedAt` are well-formed ISO-8601 strings; it is
  omitted (not defaulted to `0` or guessed) otherwise. `isTerminal` and
  `isCancelled` are pure classifications of the already-recorded
  `status` field.
- **No enforcement of `ExecutionPolicy`/`ExecutionPolicyConstraint`**
  — no field of these types is read, checked, or enforced anywhere in
  this package.
- **No persistence** — no filesystem, database, or storage access.
- **No networking** — no HTTP or other network calls.
- **No AI logic** — no model calls, prompts, or heuristic behavior.
- **No calls to any other Titan engine's runtime** — `ExecutionBuilder`,
  `ExecutionValidator`, `ExecutionStatusTracker`, and `ExecutionEngine`
  accept plain, read-only input values (an Orchestrator
  `WorkflowDispatchResult`, or a self-contained `ExecutionRecord`).
  This package never imports `OrchestratorEngine`, never instantiates
  it, and never calls the Orchestrator Engine's runtime — it uses only
  the Orchestrator's `WorkflowDispatchResult` *type* to describe an
  input shape.

## Runtime Contract (unchanged from Milestone 1)

`ExecutionEngine` extends the shared `BaseEngine` and inherits the
full Titan runtime engine contract, unmodified since Milestone 1:

- `initialize()`
- `start()`
- `stop()`
- `health()`
- `metadata()`
- `version()`
- `contractVersion()`
- `getState()`

`metadata()` reports:

- `id`: `execution-engine`
- `name`: `Execution Engine`
- `version`: `1.0.0`
- `contractVersion`: the shared `ENGINE_API_CONTRACT_VERSION`
- `capabilities`: `execution.execute`, `execution.get-execution-status`,
  `execution.cancel-execution`, `execution.report-result`

This is the same complete planned capability list advertised since
Milestone 1.

## Public API (Milestone 5)

| Method | Behavior (Milestone 5) |
|---|---|
| `execute(request)` | **Implemented** (Milestone 3, unchanged). Validates `request`, then delegates entirely to `ExecutionBuilder.build`. Returns the resulting `ExecutionRecord`. Throws `ExecutionValidationError` for a malformed request. |
| `getExecutionStatus(request)` | **Implemented** (Milestone 4, unchanged). Validates `request`, then delegates entirely to `ExecutionValidator.validate`. Returns the resulting `ExecutionValidationResult`. Throws `ExecutionValidationError` for a malformed request. |
| `cancelExecution(request)` | Always throws `NotImplementedError`. Unchanged from Milestone 1. The Execution Engine's only remaining unimplemented method. |
| `reportResult(request)` | **Implemented.** Validates `request`, then delegates entirely to `ExecutionStatusTracker.summarize`. Returns the resulting `ExecutionSummary`. Throws `ExecutionValidationError` for a malformed request (missing/null `request`, or a `request.record` that is missing, `null`, or not an inspectable object). Performs **no real result reporting**. |

## `ExecutionStatusTracker` (new in Milestone 5)

```ts
class ExecutionStatusTracker {
  summarize(record: ExecutionRecord): ExecutionSummary;
}
```

`summarize` performs pure, synchronous, deterministic structural
computation only, using nothing but data already present on `record`:

1. Throws `ExecutionValidationError` (with structured `issues`) if
   `record` itself is missing, `null`, not an object, an array, or if
   `record.target` is missing, `null`, not an object, or an array —
   the same malformed-shape condition recognized by `ExecutionBuilder`
   and `ExecutionValidator`.
2. Copies `executionId`, `status`, `target` (as a freshly constructed
   object with the same `workflowId`/`itemId`/`itemType`), `createdAt`,
   and `updatedAt` verbatim from `record`.
3. Derives `durationMs` as `updatedAt - createdAt` in milliseconds,
   but only when both are well-formed ISO-8601 timestamp strings (the
   same well-formedness check used by `ExecutionValidator`). Omits the
   field entirely otherwise — never guessed, never defaulted to `0`.
4. Derives `isTerminal` as `true` when `status` is `'completed'`,
   `'failed'`, or `'cancelled'` — a pure classification of the
   already-recorded `status` value.
5. Derives `isCancelled` as `true` when `status` is exactly
   `'cancelled'`.

`ExecutionStatusTracker` never mutates its input and never reuses
nested object references from the input in its output — every
returned value is freshly constructed. It performs no I/O, no
scheduling, and no calls to any other Titan engine.

## Domain Model (Milestone 5 — extended)

All Milestone 2, 3, and 4 domain types are retained unchanged, except
for an additive extension to `ExecutionSummary`:

| Type | Change in Milestone 5 |
|---|---|
| `ExecutionSummary` | Adds `createdAt: string`, `updatedAt: string`, `durationMs?: number`, `isTerminal: boolean`, `isCancelled: boolean`. `executionId`, `status`, and `target` are unchanged from Milestone 1. |

`ExecutionReportResultRequest` (in `src/index.ts`) now carries
`{ record: ExecutionRecord; handoff?: ExecutionValidationHandoff }`
instead of `{ executionId: string; handoff?: ExecutionValidationHandoff }`.

## Explicit Statement of Current Behavior

This package now performs exactly three pieces of real behavior: pure,
synchronous, deterministic structural translation from an
already-computed Orchestrator `WorkflowDispatchResult` into an
`ExecutionRecord` (via `ExecutionBuilder`, exposed through
`ExecutionEngine.execute()`); pure, synchronous, deterministic
structural validation of a supplied `ExecutionRecord` (via
`ExecutionValidator`, exposed through
`ExecutionEngine.getExecutionStatus()`); and pure, synchronous,
deterministic structural summarization of a supplied `ExecutionRecord`
(via `ExecutionStatusTracker`, exposed through
`ExecutionEngine.reportResult()`). It still provides:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unchanged from Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   inherited unchanged from `BaseEngine`.
3. The Execution Engine's complete planned domain model
   (`src/models/types.ts`), unchanged from Milestone 2 plus the
   Milestone 3 `ExecutionBuildRequest` type, the Milestone 4
   validation-result types, and the Milestone 5 additive
   `ExecutionSummary` fields.
4. One typed, unimplemented public API stub (`cancelExecution`), which
   always throws `NotImplementedError`, unchanged in behavior from
   Milestone 1.

No real scheduling, retries, persistence, networking, policy
enforcement, observability emission, context propagation, execution
store/lookup, cancellation, or actual result reporting/handoff to the
Validation Engine exists anywhere in this package. Those remain out of
scope for this milestone and will be introduced by later Execution
Engine milestones.
