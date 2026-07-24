# Orchestrator Engine

Milestone 2 domain model package for the Titan Core Orchestrator Engine.

## Scope (Milestone 2)

This milestone builds on Milestone 1 by introducing the Orchestrator's
**domain model and typed public API signatures**. It does **not**
implement any orchestration behavior.

- Retains the Milestone 1 runtime foundation and public API surface
  unchanged (lifecycle, health, metadata, version, and state methods,
  inherited from `BaseEngine`).
- Adds a dedicated domain model module (`src/models/types.ts`)
  defining the Orchestrator's core workflow concepts.
- Updates the six Orchestrator public API method signatures to use
  the new domain model types for their request/response shapes.
- Exposes Orchestrator API method signatures:
	- `orchestrate()`
	- `executeWorkflow()`
	- `pauseWorkflow()`
	- `resumeWorkflow()`
	- `cancelWorkflow()`
	- `getWorkflowStatus()`

## Domain Model

`src/models/types.ts` defines the following immutable domain model
types:

- `Workflow` — the top-level workflow aggregate.
- `WorkflowStatus` — runtime status of a workflow.
- `WorkflowStep` — a single step within a workflow.
- `WorkflowStepStatus` — runtime status of a workflow step.
- `WorkflowTask` — an atomic dispatch unit within a step.
- `WorkflowTaskStatus` — runtime status of a workflow task.
- `WorkflowDependency` — a dependency edge between steps or tasks.
- `WorkflowDependencyType` — the relationship type of a dependency.
- `WorkflowContext` — the context envelope passed to API operations.
- `WorkflowMetadata` — workflow-level metadata for traceability.
- `WorkflowExecutionMode` — how a workflow's steps are intended to run.
- `WorkflowPriority` — relative priority of a workflow.
- `WorkflowResult` — outcome payload for a completed/terminated workflow.
- `WorkflowSummary` — deterministic summary of a workflow's shape and progress.

All of these types are exported from the package entry point
(`src/index.ts`) alongside the existing runtime and error exports.

These types are **pure data definitions only**. Nothing in this
package constructs, validates, persists, or transforms values of
these types yet — they exist solely as typed shapes for later
milestones to implement behavior against.

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

All six public API methods are now typed against the Orchestrator
domain model (via `WorkflowContext` in their request shapes), but
**every method remains an unimplemented stub**, exactly as in
Milestone 1:

| Method | Behavior |
|---|---|
| `orchestrate(request)` | throws `NotImplementedError` |
| `executeWorkflow(request)` | throws `NotImplementedError` |
| `pauseWorkflow(request)` | throws `NotImplementedError` |
| `resumeWorkflow(request)` | throws `NotImplementedError` |
| `cancelWorkflow(request)` | throws `NotImplementedError` |
| `getWorkflowStatus(request)` | throws `NotImplementedError` |

## Explicit Statement of Current Behavior

**No orchestration functionality exists in this package.**
Specifically, Milestone 2 does **not** implement:

- Orchestration logic of any kind.
- Workflow routing, sequencing, dispatch, or scheduling.
- Task execution or coordination.
- Escalation handling.
- Any AI-driven or heuristic behavior.
- Any call to the Planner Engine, Knowledge Engine, Context Engine,
  Execution Engine, or any other Titan engine.

Every public API method throws `NotImplementedError` unconditionally,
exactly as in Milestone 1. This package currently provides only:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`)
   via `BaseEngine`, unchanged from Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   unchanged from Milestone 1.
3. The Orchestrator domain model (`src/models/types.ts`): `Workflow`,
   `WorkflowStatus`, `WorkflowStep`, `WorkflowStepStatus`,
   `WorkflowTask`, `WorkflowTaskStatus`, `WorkflowDependency`,
   `WorkflowDependencyType`, `WorkflowContext`, `WorkflowMetadata`,
   `WorkflowExecutionMode`, `WorkflowPriority`, `WorkflowResult`, and
   `WorkflowSummary`.
4. Typed method signatures for the six Orchestrator public API
   methods, now referencing the domain model, with no behavior behind
   them.

Real orchestration behavior will be introduced in later Orchestrator
milestones.
