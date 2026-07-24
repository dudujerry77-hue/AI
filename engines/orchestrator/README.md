# Orchestrator Engine

Milestone 7 package for the Titan Core Orchestrator Engine: deterministic
Plan → Workflow structural translation, deterministic Workflow structural
validation, deterministic Workflow status reporting, deterministic
Workflow lifecycle state transitions, and deterministic dispatch-readiness
evaluation.

## Scope (Milestone 7)

This milestone builds on Milestones 1–6 by implementing the fifth real
orchestration capability: **deterministic dispatch-readiness
evaluation**, wired into `dispatchWorkflow()`.

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
- Retains `WorkflowLifecycleManager` and `pauseWorkflow()`,
  `resumeWorkflow()`, `cancelWorkflow()` unchanged from Milestone 6.
- Adds `WorkflowDispatcher` (`src/dispatch/workflow-dispatcher.ts`), a
  deterministic, synchronous, offline evaluator that determines which
  steps and tasks on a `Workflow` are currently dispatch-ready, and
  which require escalation.
- Implements `OrchestratorEngine.dispatchWorkflow()`: validates the
  request, then delegates entirely to `WorkflowDispatcher` to compute
  a `WorkflowDispatchResult`, and returns it. This method performs
  **dispatch-readiness evaluation only** — it never mutates the input
  `Workflow`, and it never executes, schedules, runs, retries, or
  dispatches anything to any other engine.

All seven public API methods are now implemented. There are no
remaining `NotImplementedError` stubs in this package.

## WorkflowDispatcher

`WorkflowDispatcher` provides one method:

### `dispatch(workflow: Workflow): WorkflowDispatchResult`

For every step and every task on the `Workflow`, computes a
`WorkflowDispatchDecision` describing whether that item is currently
dispatch-ready:

- **Status check**: a step is only dispatch-ready if its status is
  `'pending'` or `'ready'`; a task is only dispatch-ready if its
  status is `'pending'` or `'ready'`. Any other status yields
  `ready: false` with reason `'status-not-ready'`.
- **Dependency check**: an item is only dispatch-ready if every
  dependency that targets it, of type `'blocks'`, `'requires'`, or
  `'sequential'`, has a source item whose status is one of
  `'completed'`, `'skipped'`, or `'cancelled'`. Dependencies of type
  `'related'` or `'parallel'` are never treated as dispatch
  preconditions. If any precondition dependency is unsatisfied, the
  decision is `ready: false` with reason `'dependencies-unsatisfied'`.
- An item that passes both checks is `ready: true` with reasons
  `['status-ready', 'dependencies-satisfied']`.

The result's `dispatchable` field lists the `itemId`s of every item
with `ready: true`, in the order steps then tasks appear on the
`Workflow`.

Additionally, computes a `WorkflowEscalationDecision` for any item
that requires attention:

- Any item with status `'blocked'` is escalated with reason
  `'blocked-status'`, regardless of `Workflow.priority`.
- On a `Workflow` with `priority: 'critical'`, any item whose status
  is not one of the terminal statuses (`'completed'`, `'failed'`,
  `'cancelled'`, and, for steps, `'skipped'`) and is not already
  escalated for `'blocked-status'` is escalated with reason
  `'critical-priority-not-progressing'`.
- No other escalation conditions exist.

### Common behavior

- **Immutability**: the input `Workflow` is never mutated.
- **Determinism**: identical input always produces deep-equal output.
- **Validation**: throws `OrchestratorValidationError` only for
  malformed input — `null`, `undefined`, or a non-object value. For
  any well-formed `Workflow`, `dispatch()` never throws.
- **No execution behavior**: no scheduling, no execution, no retries,
  no concurrency, no persistence, no networking, and no calls to any
  other Titan engine. `WorkflowDispatcher` only evaluates and reports
  readiness; it never dispatches, runs, or changes any state.

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
  `orchestrator.cancel-workflow`, `orchestrator.get-workflow-status`,
  `orchestrator.dispatch-workflow`

## Public API

| Method | Behavior (Milestone 7) |
|---|---|
| `orchestrate(request)` | Unchanged from Milestone 3: validates the request, then returns `WorkflowBuilder.build(request.plan)`. |
| `executeWorkflow(request)` | Unchanged from Milestone 4: validates the request, then returns `WorkflowValidator.validate(request.workflow)`. |
| `getWorkflowStatus(request)` | Unchanged from Milestone 5: validates the request, then returns `WorkflowStatusTracker.summarize(request.workflow)`. |
| `pauseWorkflow(request)` | Unchanged from Milestone 6: validates the request, then returns `WorkflowLifecycleManager.pause(request.workflow)`. |
| `resumeWorkflow(request)` | Unchanged from Milestone 6: validates the request, then returns `WorkflowLifecycleManager.resume(request.workflow)`. |
| `cancelWorkflow(request)` | Unchanged from Milestone 6: validates the request, then returns `WorkflowLifecycleManager.cancel(request.workflow)`. |
| `dispatchWorkflow(request)` | Validates the request, then returns `WorkflowDispatcher.dispatch(request.workflow)`. |

`dispatchWorkflow` throws `OrchestratorValidationError` if the request
or its `workflow` field is missing or malformed; otherwise it always
returns a `WorkflowDispatchResult`. It never mutates the supplied
`Workflow`.

## Explicit Statement of Current Behavior

**This package performs structural translation, structural
validation, structural status reporting, lifecycle state transitions,
and dispatch-readiness evaluation only. No orchestration execution
behavior exists.** Specifically, Milestone 7 does **not** implement:

- Workflow execution, running, or actual dispatch of any kind — only
  *evaluation* of what would be dispatchable.
- Scheduling algorithms of any kind.
- Retries.
- Concurrency or parallel execution.
- Background workers.
- Any change to task state, dependency state, step state, or
  top-level `Workflow.status`/`metadata` as a result of dispatch
  evaluation — `dispatchWorkflow()` is purely read-only/reporting.
- Any call to the Execution Engine.
- Any call to `PlannerEngine.createPlan()` or any other Planner,
  Knowledge, or Context Engine method.
- Any network call, filesystem access, or database access.
- Any AI-driven or heuristic behavior.
- Any mutation of a supplied `Workflow`.

All seven public API methods (`orchestrate`, `executeWorkflow`,
`getWorkflowStatus`, `pauseWorkflow`, `resumeWorkflow`,
`cancelWorkflow`, `dispatchWorkflow`) are fully deterministic: for
identical input, they always produce deep-equal output. This package
currently provides:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unchanged from Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   unchanged from Milestone 1.
3. The Orchestrator domain model (`src/models/types.ts`), extended in
   Milestone 7 with `WorkflowDispatchDecision`,
   `WorkflowEscalationDecision`, and `WorkflowDispatchResult`.
4. `WorkflowBuilder` and a working `orchestrate()` implementation,
   unchanged from Milestone 3.
5. `WorkflowValidator` and a working `executeWorkflow()`
   implementation, unchanged from Milestone 4.
6. `WorkflowStatusTracker` and a working `getWorkflowStatus()`
   implementation, unchanged from Milestone 5.
7. `WorkflowLifecycleManager` and working `pauseWorkflow()`,
   `resumeWorkflow()`, and `cancelWorkflow()` implementations,
   unchanged from Milestone 6.
8. `WorkflowDispatcher`, a deterministic, pure dispatch-readiness
   evaluator for a `Workflow`.
9. A working `dispatchWorkflow()` implementation built entirely on
   `WorkflowDispatcher` — it evaluates and reports readiness only, it
   does not execute, schedule, or otherwise modify anything.
10. `OrchestratorValidationError` for malformed requests to any of the
    seven implemented methods, and for malformed inputs to
    `WorkflowBuilder`/`WorkflowValidator`/`WorkflowStatusTracker`/
    `WorkflowLifecycleManager`/`WorkflowDispatcher`.

Phase 009 Orchestrator Engine now has all seven public API methods
implemented with deterministic, offline, synchronous behavior. Real
workflow execution behavior — actually running steps and tasks based
on dispatch decisions — remains out of scope for this package and will
be introduced by the Execution Engine and later Orchestrator phases.
