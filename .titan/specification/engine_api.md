# Engine API Specification

**Document Class:** Technical Governance
**Authority:** Subordinate to `architecture.md`, `engine_framework.md`, and `decisions.md`. This document defines the mandatory public contract that every Titan engine must implement.
**Purpose:** Standardize the external interface, lifecycle, communication, health, configuration, logging, and error behavior of every Titan engine without defining business logic.

---

## 1. Purpose

This specification defines the required public contract for every Titan engine. Its purpose is to ensure that all engines expose a consistent interface, behave predictably across runtime states, and integrate with the shared Engine Framework through explicit contracts rather than ad hoc coupling.

## 2. Scope

This document applies to every Titan engine implemented under the Titan Core architecture. It governs the engine-facing API contract, lifecycle behavior, event model, health reporting, configuration intake, logging, error handling, capability advertising, compatibility expectations, concurrency expectations, shutdown behavior, and extension points.

This document does not define the internal business logic of any engine, nor does it prescribe the implementation language or execution environment.

## 3. TitanEngine Interface

Every Titan engine must expose the following public methods through the standard engine interface.

### 3.1 Required Methods

- **initialize()** — prepares the engine for operation, validates dependencies, loads initial state, and places the engine into the Initialized state without starting active work.
- **start()** — transitions the engine into the Running state and begins accepting work or events according to its role.
- **stop()** — transitions the engine into the Stopped state in an orderly manner, halting work and releasing resources.
- **health()** — returns the engine’s current health status in a structured form suitable for monitoring and diagnostics.
- **metadata()** — returns identifying metadata for registration, discovery, observability, and engine selection.
- **version()** — returns version information that supports compatibility checks and upgrade planning.

### 3.2 Interface Semantics

The interface is mandatory. Implementations may use an async/awaitable pattern when the runtime supports it, but the lifecycle and contract semantics must remain the same. The required methods must be present and callable through the framework contract. Additional engine-specific methods may be added only when they are optional, additive, and documented as extensions rather than replacements for the required interface.

## 4. Lifecycle

Every engine must follow the lifecycle defined below.

### 4.1 Allowed States

- **Created** — The engine instance exists but has not yet been initialized.
- **Initialized** — The engine has completed initialization and is ready for startup.
- **Running** — The engine is actively operating.
- **Stopped** — The engine has been stopped and is no longer accepting work.
- **Failed** — The engine has entered an unrecoverable failure state and requires intervention or restart.

### 4.2 Valid Transitions

Valid lifecycle transitions are:

- Created → Initialized
- Initialized → Running
- Running → Stopped
- Initialized → Failed
- Running → Failed
- Stopped → Initialized
- Failed → Initialized only when a new initialization cycle is explicitly allowed by the framework and the engine’s own contract

The engine must not transition directly from Created to Running or from Stopped to Running without first returning through the appropriate initialization contract.

### 4.3 Lifecycle Observability

State changes must be observable through health reporting and framework events. An engine must not silently change state without emitting the relevant lifecycle event or updating its health state.

## 5. Event Contract

Engines must participate in the framework’s event model rather than communicating through ad hoc direct calls.

### 5.1 Publishing Events

Engines publish events through the framework event bus. Each event must identify its source engine and the event type.

### 5.2 Subscribing to Events

Engines may subscribe to events through the framework event bus if their responsibilities require it. Subscriptions must be explicit and discoverable.

### 5.3 Event Naming Conventions

Event names should be structured and consistent, for example:

- `titan.engine.<engine-name>.started`
- `titan.engine.<engine-name>.stopped`
- `titan.engine.<engine-name>.health.changed`
- `titan.engine.<engine-name>.error`

### 5.4 Event Payload Rules

Event payloads must be structured, typed, and contain enough context to be understood without inspecting hidden state. Each event should include at minimum:

- event name
- source engine identifier
- timestamp
- correlation identifier
- payload body

Payloads must not include secrets or implementation-specific internals that are not required by the contract.

### 5.5 Event Delivery Expectations

Event delivery should be explicit and observable. Events must not be silently dropped without an error signal, and failures to publish or subscribe must be surfaced through logging, health reporting, and framework-level error handling.

## 6. Health Contract

Every engine must provide health reporting through the framework. Health reporting must include at minimum:

- current status
- readiness indicator
- timestamp
- optional diagnostic details
- last known error, if any

The engine must report degraded or failed health when its runtime condition no longer supports normal operation.

## 7. Configuration Contract

Engines must receive configuration through the shared framework rather than reading configuration directly from environment-specific or hidden paths. Configuration must be validated before the engine enters a running state, and invalid configuration must prevent startup or transition the engine to a failed state according to the framework’s rules. Configuration should be treated as immutable during engine execution unless an explicit reconfiguration contract is defined by the framework.

## 8. Logging Contract

Engines must emit structured logs through the framework logging service. Logs must include enough context to be useful for tracing and debugging while avoiding sensitive data. At minimum, logs should include:

- timestamp
- severity
- engine identifier
- event or operation name
- correlation identifier

Logs must be emitted for lifecycle transitions, significant state changes, health changes, recoverable errors, and unrecoverable failures.

## 9. Error Handling Contract

Engines must distinguish between recoverable and unrecoverable errors.

### 9.1 Recoverable Errors

Recoverable errors should be surfaced explicitly, logged, and handled according to the framework’s retry, re-plan, or degraded-mode rules. They must not be silently swallowed.

### 9.2 Unrecoverable Errors

Unrecoverable errors must transition the engine to the Failed state and emit an error event through the framework. The engine must not continue operating in a misleading or partially healthy state.

### 9.3 Error Propagation

Errors must propagate through the framework contract. Engines must not rely on hidden exceptions or unstructured failure modes that prevent the framework from observing the failure.

## 10. Capability Discovery

Every engine must advertise its supported capabilities through the framework. Capability discovery must allow another engine, the registry, or a runtime host to understand what the engine can do without inspecting internal implementation details. Capability data should be stable, versioned, and reflected in metadata.

## 11. Version Compatibility

Engine versions must be compatible with the framework contract they implement. The specification should be interpreted as a compatibility contract: a change to the public interface should be treated as a breaking change unless it is explicitly documented as backwards-compatible. Engines must declare the contract version they support, and the framework should verify compatibility before wiring the engine into a running system.

## 12. Thread and Concurrency Expectations

Engines must not assume a single-threaded environment or rely on hidden global state for correctness. The framework may invoke lifecycle and health methods concurrently, and engines must be safe for concurrent inspection and lifecycle transitions where practical. If an engine uses background tasks, worker threads, or asynchronous execution, those resources must be managed explicitly and must not bypass the lifecycle and shutdown contract.

## 13. Shutdown and Resource Cleanup

The shutdown contract is part of the public interface. The stop() method must be safe to call more than once, must stop accepting new work promptly, must cancel or close background work where possible, must unregister subscriptions or handlers, must release resources, and must leave the engine in the Stopped state unless a failure occurs during shutdown. Cleanup behavior must be observable through health reporting and framework events.

## 14. Extension Points

The public contract is intentionally stable, but the system must support future extension. Extensions must be additive, optional, and versioned. An engine may expose additional capability-specific interfaces or optional metadata fields, but those additions must not change the required semantics of initialize(), start(), stop(), health(), metadata(), or version().

## 15. Mandatory Security Contracts

Every engine must implement the following security contracts as part of the public framework contract:

- **Authentication** — engines must authenticate requests and privileged operations according to the framework policy and the engine's trust boundary.
- **Authorization** — engines must enforce role-based authorization before performing privileged actions.
- **Audit logging** — engines must emit audit events for privileged actions, configuration changes, and security-relevant state transitions.
- **Secret handling** — engines must never expose secrets in logs, metadata, health output, or event payloads.
- **Input validation** — engines must validate all input before acting on it and reject malformed or unsafe input.
- **Secure configuration** — engines must load configuration through the framework and reject insecure or missing required configuration.
- **Permission model** — engines must align with the approved role and permission model defined in `security/authorization.md`.

## 16. Non-Goals

This document does not define:

- business logic
- domain workflows
- application-specific behavior
- concrete implementation details for a specific runtime or language
- persistence format or storage strategy
- transport protocol details beyond the framework event model

Its purpose is to define the mandatory public contract that enables engine interoperability, observability, lifecycle consistency, and predictable extension.

