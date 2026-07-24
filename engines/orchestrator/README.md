# Orchestrator Engine

Milestone 6 package for the Titan Core Orchestrator Engine: deterministic
Plan → Workflow structural translation, deterministic Workflow structural
validation, deterministic Workflow status reporting, and deterministic
Workflow lifecycle state transitions.

## Scope (Milestone 6)

This milestone builds on Milestones 1–5 by implementing the fourth real
orchestration capability: **deterministic workflow lifecycle state
transitions**, wired into `pauseWorkflow()`, `resumeWorkflow()`, and
`cancelWorkflow()`.

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`).
- Retains the Milestone 2 domain model unchanged.
- Retains `WorkflowBuilder` and `orchestrate()` unchanged from
  Milestone 3.
- Retains `WorkflowValidator` and `executeWorkflow()` unchanged from
  Milestone 4.
- Retains `WorkflowStatusTracker` and `getWorkflowStatus()` unchanged
  from Milestone 5.
- Adds `WorkflowLifecycleManager`
  (`src/lifecycle/workflow-lifecycle-manager.ts`), a deterministic,
  synchronous, offline lifecycle state transition engine for a
  `Workflow`.
- Implements `OrchestratorEngine.pauseWorkflow()`,
  `resumeWorkflow()`, and `cancelWorkflow()`: each validates the
  request, then delegates entirely to `WorkflowLifecycleManager` to
  compute a new `Workflow` reflecting the requested transition, and
  returns it. These methods perform **lifecycle state transition
  only** — they never mutate the input `Workflow`, and none of them
  execute, schedule, retry, run concurrently, persist, or call any
  other engine.

All six public API methods are now implemented. There are no
remaining `NotImplementedError` stubs in this package.

## WorkflowLifecycleManager

`WorkflowLifecycleManager` provides three methods, each accepting a
`Workflow` and returning a **new** `Workflow`:

### `pause(workflow: Workflow): Workflow`

- If `workflow.status === 'running'` → returns a new `Workflow` with
  `status: 'paused'` and `metadata.revision` incremented by exactly 1.
- Otherwise → returns a new `Workflow` with `status` and `metadata`
  unchanged.

### `resume(workflow: Workflow): Workflow`

- If `workflow.status === 'paused'` → returns a new `Workflow` with
  `status: 'running'` and `metadata.revision` incremented by exactly
  1.
- Otherwise → returns a new `Workflow` with `status` and `metadata`
  unchanged.

### `cancel(workflow: Workflow): Workflow`

- If `workflow.status` is neither `'completed'` nor `'cancelled'` →
  returns a new `Workflow` with `status: 'cancelled'` and
  `metadata.revision` incremented by exactly 1.
- Otherwise (already `'completed'` or already `'cancelled'`) →
  returns a new `Workflow` with `status` and `metadata` unchanged.

### Common behavior across all three methods

- **Immutability**: the input `Workflow` is never mutated. Each call
  always returns a distinct new object (`result !== input`), even
  when no transition condition is satisfied.
- **Metadata preservation**: `metadata.createdAt` and
  `metadata.createdBy` are always preserved unchanged. `revision` is
  incremented by exactly 1 only when a transition actually occurs;
  otherwise it is preserved unchanged.
- **Structural preservation**: `workflowId`, `planId`, `priority`,
  `executionMode`, `steps`, `tasks`, and `dependencies` are always
  preserved exactly as given. No task state, dependency state, or
  step state is ever changed by this manager.
- **Determinism**: identical input always produces deep-equal output.
- **Validation**: throws `OrchestratorValidationError` only for
  malformed input — `null`, `undefined`, or a non-object value. For
  any well-formed `Workflow`, these methods never throw.
- **No execution behavior**: no scheduling, no execution, no retries,
  no concurrency, no persistence, no networking, and no calls to any
  other Titan engine.

## Runtime Contract

`OrchestratorEngine` extends the shared `BaseEngine` and inherits the
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

- `id`: `orchestrator-engine`
- `name`: `Orchestrator Engine`
- `version`: `1.0.0`
- `contractVersion`: the shared `ENGINE_API_CONTRACT_VERSION`
- `capabilities`: `orchestrator.orchestrate`, `orchestrator.execute-workflow`,
  `orchestrator.pause-workflow`, `orchestrator.resume-workflow`,
  `orchestrator.cancel-workflow`, `orchestrator.get-workflow-status`

## Public API

| Method | Behavior (Milestone 6) |
|---|---|
| `orchestrate(request)` | Unchanged from Milestone 3: validates the request, then returns `WorkflowBuilder.build(request.plan)`. |
| `executeWorkflow(request)` | Unchanged from Milestone 4: validates the request, then returns `WorkflowValidator.validate(request.workflow)`. |
| `getWorkflowStatus(request)` | Unchanged from Milestone 5: validates the request, then returns `WorkflowStatusTracker.summarize(request.workflow)`. |
| `pauseWorkflow(request)` | Validates the request, then returns `WorkflowLifecycleManager.pause(request.workflow)`. |
| `resumeWorkflow(request)` | Validates the request, then returns `WorkflowLifecycleManager.resume(request.workflow)`. |
| `cancelWorkflow(request)` | Validates the request, then returns `WorkflowLifecycleManager.cancel(request.workflow)`. |

Each of `pauseWorkflow`, `resumeWorkflow`, and `cancelWorkflow` throws
`OrchestratorValidationError` if the request or its `workflow` field
is missing or malformed; otherwise it always returns a new `Workflow`.
None of them mutate the supplied `Workflow`.

## Explicit Statement of Current Behavior

**This package performs structural translation, structural
validation, structural status reporting, and lifecycle state
transitions only. No orchestration execution behavior exists.**
Specifically, Milestone 6 does **not** implement:

- Workflow execution, dispatch, or running of any kind.
- Scheduling algorithms of any kind.
- Retries.
- Concurrency or parallel execution.
- Background workers.
- Any change to task state, dependency state, or step state — lifecycle
  transitions affect only the top-level `Workflow.status` and
  `metadata.revision`.
- Any call to the Execution Engine.
- Any call to `PlannerEngine.createPlan()` or any other Planner,
  Knowledge, or Context Engine method.
- Any network call, filesystem access, or database access.
- Any AI-driven or heuristic behavior.
- Any mutation of a supplied `Workflow`.

All six public API methods (`orchestrate`, `executeWorkflow`,
`getWorkflowStatus`, `pauseWorkflow`, `resumeWorkflow`,
`cancelWorkflow`) are fully deterministic: for identical input, they
always produce deep-equal output. This package currently provides:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unchanged from Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   unchanged from Milestone 1.
3. The Orchestrator domain model (`src/models/types.ts`), unchanged
   from Milestone 2.
4. `WorkflowBuilder` and a working `orchestrate()` implementation,
   unchanged from Milestone 3.
5. `WorkflowValidator` and a working `executeWorkflow()`
   implementation, unchanged from Milestone 4.
6. `WorkflowStatusTracker` and a working `getWorkflowStatus()`
   implementation, unchanged from Milestone 5.
7. `WorkflowLifecycleManager`, a deterministic, pure lifecycle state
   transition engine for a `Workflow`.
8. Working `pauseWorkflow()`, `resumeWorkflow()`, and
   `cancelWorkflow()` implementations built entirely on
   `WorkflowLifecycleManager` — these methods transition workflow
   status only, they do not execute, schedule, or otherwise modify
   anything.
9. `OrchestratorValidationError` for malformed requests to any of the
   six implemented methods, and for malformed inputs to
   `WorkflowBuilder`/`WorkflowValidator`/`WorkflowStatusTracker`/`WorkflowLifecycleManager`.

Phase 009 Orchestrator Engine now has all six public API methods
implemented with deterministic, offline, synchronous behavior. Real
workflow execution and scheduling behavior — actually running steps
and tasks — remain out of scope for this package and will be
introduced by the Execution Engine and later Orchestrator phases.
