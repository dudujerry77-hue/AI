# Orchestrator Engine

Milestone 1 foundation package for the Titan Core Orchestrator Engine.

## Scope (Milestone 1)

This milestone implements **only** the runtime foundation and public API
surface. It does **not** implement any orchestration behavior.

- Implements the Titan runtime engine contract via lifecycle, health,
  metadata, version, and state methods (inherited from `BaseEngine`).
- Exposes Orchestrator API method signatures:
	- `orchestrate()`
	- `executeWorkflow()`
	- `pauseWorkflow()`
	- `resumeWorkflow()`
	- `cancelWorkflow()`
	- `getWorkflowStatus()`

## Runtime Contract

`OrchestratorEngine` extends the shared `BaseEngine` and inherits the full
Titan runtime engine contract, unmodified:

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

All six public API methods are defined with typed request/response
signatures, but **every method is an unimplemented stub**:

| Method | Behavior |
|---|---|
| `orchestrate(request)` | throws `NotImplementedError` |
| `executeWorkflow(request)` | throws `NotImplementedError` |
| `pauseWorkflow(request)` | throws `NotImplementedError` |
| `resumeWorkflow(request)` | throws `NotImplementedError` |
| `cancelWorkflow(request)` | throws `NotImplementedError` |
| `getWorkflowStatus(request)` | throws `NotImplementedError` |

## Explicit Statement of Current Behavior

**No orchestration functionality exists in this package.** Specifically,
Milestone 1 does **not** implement:

- Orchestration logic of any kind.
- Workflow routing, sequencing, dispatch, or scheduling.
- Task execution or coordination.
- Escalation handling.
- Any AI-driven or heuristic behavior.
- Any call to the Planner Engine, Knowledge Engine, Context Engine, or any
  other Titan engine.

Every public API method throws `NotImplementedError` unconditionally. This
package currently provides only:

1. A working Titan runtime lifecycle (`initialize` → `start` → `stop`) via
   `BaseEngine`.
2. Working health, metadata, version, and contract-version reporting.
3. Typed method signatures for the six Orchestrator public API methods,
   with no behavior behind them.

Real orchestration behavior will be introduced in later Orchestrator
milestones.
