# Orchestrator Engine

Milestone 4 package for the Titan Core Orchestrator Engine: deterministic
Plan → Workflow structural translation, plus deterministic Workflow
structural validation.

## Scope (Milestone 4)

This milestone builds on Milestones 1–3 by implementing the second real
orchestration capability: **deterministic structural validation of a
`Workflow`**, wired into `executeWorkflow()`.

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`).
- Retains the Milestone 2 domain model unchanged (`src/models/types.ts`).
- Retains `WorkflowBuilder` and `orchestrate()` unchanged from
  Milestone 3.
- Adds `WorkflowValidator` (`src/validation/workflow-validator.ts`), a
  deterministic, synchronous, offline structural validator for a
  `Workflow`.
- Implements `OrchestratorEngine.executeWorkflow()`: validates the
  request, then delegates entirely to `WorkflowValidator` to validate
  the request's `Workflow`, and returns the resulting
  `WorkflowValidationResult`. **Despite its name (kept for API
  stability), `executeWorkflow()` does not execute anything in
  Milestone 4** — it only validates.
- `pauseWorkflow()`, `resumeWorkflow()`, `cancelWorkflow()`, and
  `getWorkflowStatus()` remain unimplemented stubs that throw
  `NotImplementedError`, exactly as in Milestone 3.

## WorkflowValidator

`WorkflowValidator.validate(workflow: Workflow): WorkflowValidationResult`
performs **pure structural validation only**:

- Throws `OrchestratorValidationError` only for malformed input:
  `null`, `undefined`, or a non-object value.
- For an object-shaped `Workflow`, all structural issues are collected
  and returned in `WorkflowValidationResult.issues` — **never
  thrown**.

Rules checked:

- **Workflow**: `workflowId` required; `planId` required; `status`
  must be a valid `WorkflowStatus`; `priority` must be a valid
  `WorkflowPriority`; `executionMode` must be a valid
  `WorkflowExecutionMode`.
- **Metadata**: `createdAt`/`updatedAt` must be required, valid
  ISO-8601 timestamps (with `updatedAt` not earlier than `createdAt`);
  `createdBy` must be a non-empty string; `revision` must be a finite
  number.
- **Steps**: `stepId` required and unique across `steps`; `title`
  required; `status` must be a valid `WorkflowStepStatus`.
- **Tasks**: `taskId` required and unique across `tasks`; `title`
  required; `status` must be a valid `WorkflowTaskStatus`.
- **Dependencies**: `dependencyId` required and unique;
  `sourceId`/`targetId` required and must reference an existing
  step or task ID; self-dependencies (`sourceId === targetId`) are
  rejected; duplicate dependencies (same `type`, `sourceId`, and
  `targetId`) are rejected; `type` must be a valid
  `WorkflowDependencyType`.

`WorkflowValidator` produces deterministic output for identical input
and never mutates the input `Workflow`. It performs no graph traversal
beyond simple reference-existence checks, no cycle detection, no
scheduling, no execution, no retries, no concurrency, and calls no
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

| Method | Behavior (Milestone 4) |
|---|---|
| `orchestrate(request)` | Unchanged from Milestone 3: validates the request, then returns `WorkflowBuilder.build(request.plan)`. |
| `executeWorkflow(request)` | Validates the request, then returns `WorkflowValidator.validate(request.workflow)`. Throws `OrchestratorValidationError` if the request or its `workflow` is missing/malformed; otherwise always returns a `WorkflowValidationResult` (never throws for ordinary validation failures). |
| `pauseWorkflow(request)` | throws `NotImplementedError` |
| `resumeWorkflow(request)` | throws `NotImplementedError` |
| `cancelWorkflow(request)` | throws `NotImplementedError` |
| `getWorkflowStatus(request)` | throws `NotImplementedError` |

## Explicit Statement of Current Behavior

**This package performs structural translation and structural
validation only. No orchestration execution behavior exists.**
Specifically, Milestone 4 does **not** implement:

- Workflow execution, dispatch, or running of any kind.
- Scheduling algorithms of any kind.
- Retries.
- Concurrency or parallel execution.
- Background workers.
- Any call to the Execution Engine.
- Any call to `PlannerEngine.createPlan()` or any other Planner,
  Knowledge, or Context Engine method.
- Any network call, filesystem access, or database access.
- Any AI-driven or heuristic behavior.
- Graph cycle detection (only direct reference-existence and
  self-dependency checks are performed).

Both `orchestrate()` and `executeWorkflow()` are fully deterministic:
for identical input, they always produce deep-equal output. This
package currently provides:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unchanged from Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   unchanged from Milestone 1.
3. The Orchestrator domain model (`src/models/types.ts`), unchanged
   from Milestone 2.
4. `WorkflowBuilder` and a working `orchestrate()` implementation,
   unchanged from Milestone 3.
5. `WorkflowValidator`, a deterministic, pure structural validator for
   a `Workflow`.
6. A working `executeWorkflow()` implementation built entirely on
   `WorkflowValidator` — this method validates only, it does not
   execute.
7. `OrchestratorValidationError` for malformed `orchestrate()` and
   `executeWorkflow()` requests, and for malformed `Plan`/`Workflow`
   inputs to `WorkflowBuilder`/`WorkflowValidator`.
8. `pauseWorkflow()`, `resumeWorkflow()`, `cancelWorkflow()`, and
   `getWorkflowStatus()` remaining unimplemented stubs, exactly as in
   Milestone 3.

Real workflow execution, scheduling, and coordination behavior will be
introduced in later Orchestrator milestones.
