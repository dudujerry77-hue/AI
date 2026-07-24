# Orchestrator Engine

Milestone 5 package for the Titan Core Orchestrator Engine: deterministic
Plan → Workflow structural translation, deterministic Workflow structural
validation, and deterministic Workflow status reporting.

## Scope (Milestone 5)

This milestone builds on Milestones 1–4 by implementing the third real
orchestration capability: **deterministic structural status reporting for
a `Workflow`**, wired into `getWorkflowStatus()`.

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`).
- Retains the Milestone 2 domain model unchanged, with one additive
  extension: `WorkflowSummary` (`src/models/types.ts`) now includes
  per-status step and task breakdown counts (see below).
- Retains `WorkflowBuilder` and `orchestrate()` unchanged from
  Milestone 3.
- Retains `WorkflowValidator` and `executeWorkflow()` unchanged from
  Milestone 4.
- Adds `WorkflowStatusTracker` (`src/status/workflow-status-tracker.ts`),
  a deterministic, synchronous, offline structural status reporter for
  a `Workflow`.
- Implements `OrchestratorEngine.getWorkflowStatus()`: validates the
  request, then delegates entirely to `WorkflowStatusTracker` to
  compute a `WorkflowSummary` for the request's `Workflow`, and
  returns it. This method performs **structural status reporting
  only** — it never mutates the input `Workflow`.
- `pauseWorkflow()`, `resumeWorkflow()`, and `cancelWorkflow()` remain
  unimplemented stubs that throw `NotImplementedError`, exactly as in
  Milestone 4.

## WorkflowStatusTracker

`WorkflowStatusTracker.summarize(workflow: Workflow): WorkflowSummary`
performs **pure structural status reporting only**:

- Throws `OrchestratorValidationError` only for malformed input:
  `null`, `undefined`, or a non-object value.
- For an object-shaped `Workflow`, it always returns a
  `WorkflowSummary` — it never throws for ordinary, well-formed
  workflow content.
- Never mutates the input `Workflow`.
- Produces deterministic output for identical input.

`WorkflowSummary` fields, computed purely from data already present on
the `Workflow`:

| Field | Source |
|---|---|
| `workflowId` | `workflow.workflowId` |
| `status` | `workflow.status` |
| `totalSteps` | `workflow.steps.length` |
| `completedSteps` / `pendingSteps` / `runningSteps` / `failedSteps` / `cancelledSteps` | tally of `workflow.steps[].status` |
| `totalTasks` | `workflow.tasks.length` |
| `completedTasks` / `pendingTasks` / `runningTasks` / `failedTasks` / `cancelledTasks` | tally of `workflow.tasks[].status` |
| `dependencyCount` | `workflow.dependencies.length` |

### Status classification rules (exhaustive, fixed, never inferred)

**Steps** (`WorkflowStepStatus`):

| Status | Counted as |
|---|---|
| `completed` | completed |
| `in-progress` | running |
| `failed` | failed |
| `cancelled` | cancelled |
| `skipped` | cancelled (terminal non-completion outcome; `WorkflowSummary` defines no separate "skipped" bucket) |
| `pending`, `ready`, `blocked` | pending |

**Tasks** (`WorkflowTaskStatus`):

| Status | Counted as |
|---|---|
| `completed` | completed |
| `in-progress` | running |
| `failed` | failed |
| `cancelled` | cancelled |
| `pending`, `ready`, `blocked` | pending |

`WorkflowStatusTracker` performs no graph traversal, no cycle
detection, no scheduling, no execution, no retries, no concurrency, no
persistence, no networking, and calls no other Titan engine. It does
not simulate or infer progress — every count is a direct, deterministic
tally of status values already present on the input `Workflow`.

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

| Method | Behavior (Milestone 5) |
|---|---|
| `orchestrate(request)` | Unchanged from Milestone 3: validates the request, then returns `WorkflowBuilder.build(request.plan)`. |
| `executeWorkflow(request)` | Unchanged from Milestone 4: validates the request, then returns `WorkflowValidator.validate(request.workflow)`. |
| `getWorkflowStatus(request)` | Validates the request, then returns `WorkflowStatusTracker.summarize(request.workflow)`. Throws `OrchestratorValidationError` if the request or its `workflow` is missing/malformed; otherwise always returns a `WorkflowSummary`. Never mutates the supplied `Workflow`. |
| `pauseWorkflow(request)` | throws `NotImplementedError` |
| `resumeWorkflow(request)` | throws `NotImplementedError` |
| `cancelWorkflow(request)` | throws `NotImplementedError` |

## Explicit Statement of Current Behavior

**This package performs structural translation, structural validation,
and structural status reporting only. No orchestration execution
behavior exists.** Specifically, Milestone 5 does **not** implement:

- Workflow execution, dispatch, or running of any kind.
- Scheduling algorithms of any kind.
- Retries.
- Concurrency or parallel execution.
- Background workers.
- Progress simulation or inference of any kind — status counts are a
  direct tally of data already present on the input `Workflow`.
- Any call to the Execution Engine.
- Any call to `PlannerEngine.createPlan()` or any other Planner,
  Knowledge, or Context Engine method.
- Any network call, filesystem access, or database access.
- Any AI-driven or heuristic behavior.
- Any mutation of a supplied `Workflow`.

`orchestrate()`, `executeWorkflow()`, and `getWorkflowStatus()` are all
fully deterministic: for identical input, they always produce
deep-equal output. This package currently provides:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unchanged from Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   unchanged from Milestone 1.
3. The Orchestrator domain model (`src/models/types.ts`), unchanged
   from Milestone 2 except for the additive `WorkflowSummary`
   breakdown fields introduced in Milestone 5.
4. `WorkflowBuilder` and a working `orchestrate()` implementation,
   unchanged from Milestone 3.
5. `WorkflowValidator` and a working `executeWorkflow()`
   implementation, unchanged from Milestone 4.
6. `WorkflowStatusTracker`, a deterministic, pure structural status
   reporter for a `Workflow`.
7. A working `getWorkflowStatus()` implementation built entirely on
   `WorkflowStatusTracker` — this method reports status only, it does
   not execute, schedule, or modify anything.
8. `OrchestratorValidationError` for malformed requests to any of the
   three implemented methods, and for malformed inputs to
   `WorkflowBuilder`/`WorkflowValidator`/`WorkflowStatusTracker`.
9. `pauseWorkflow()`, `resumeWorkflow()`, and `cancelWorkflow()`
   remaining unimplemented stubs, exactly as in Milestone 4.

Real workflow execution, scheduling, pausing, resuming, and
cancellation behavior will be introduced in later Orchestrator
milestones.
