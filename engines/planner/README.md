# Planner Engine

Milestone 1 foundation package for the Titan Core Planner Engine.

Milestone 2 adds Planner domain model definitions and typed API signatures only.

## Scope (Milestone 1)

- Implements the Titan runtime engine contract via lifecycle, health, metadata, version, and state methods.
- Exposes Planner API method signatures:
	- `createPlan()`
	- `validatePlan()`
	- `optimizePlan()`
	- `estimatePlan()`
	- `explainPlan()`
	- `cancelPlan()`

## Current Behavior

Planner API methods are stubs and throw `NotImplementedError`.
No planning functionality is implemented in this milestone.

## Planner Domain Model (Milestone 2)

The planner package now defines immutable domain types for:

- goals: `Goal`, `GoalType`, `GoalPriority`, `GoalStatus`
- plans: `Plan`, `PlanStatus`, `PlanMetadata`
- steps: `PlanStep`, `StepType`, `StepStatus`
- tasks: `Task`, `TaskStatus`
- dependencies: `Dependency`, `DependencyType`
- constraints: `Constraint`, `ConstraintType`
- planning context: `PlanningContext`
- estimates: `PlanEstimate`, `CostEstimate`, `TimeEstimate`, `ResourceEstimate`
- explanation: `PlanExplanation`

These models are exported through the planner package entry point and used by PlannerEngine API method signatures.
