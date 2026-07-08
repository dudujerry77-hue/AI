# Engine Framework

**Document Class:** Technical Governance
**Authority:** Subordinate to `architecture.md` and `decisions.md`. This document defines the architectural contract for the shared runtime foundation used by Titan engines.
**Purpose:** Describe the shared framework that every Titan engine must use, without implementing it.

---

## 1. Purpose

The Engine Framework exists to provide a common architectural foundation for every Titan engine. Its purpose is to standardize engine lifecycle management, communication, observability, configuration, error handling, and runtime coordination so engines can remain independent, testable, and replaceable. The mandatory public engine contract is defined in `specification/engine_api.md` and must be implemented by every engine that uses the framework.

## 2. Architecture

The framework sits between the engines and the surrounding runtime environment. It provides the shared services and contracts that all engines depend on, while keeping each engine focused on its own responsibility.

## 3. Responsibilities

The framework is responsible for:

- Defining the standard engine contract used by all Titan engines.
- Managing engine registration and discovery.
- Providing a common communication path for events and approved interfaces.
- Providing shared infrastructure for logging, configuration, health, metrics, and error handling.
- Enforcing lifecycle behavior such as initialization, execution, and shutdown.

## 4. Lifecycle

Every engine must follow a consistent lifecycle defined by the framework. The lifecycle includes startup preparation, initialization, runtime execution, health evaluation, and graceful shutdown.

## 5. Communication Model

Engines must not communicate directly unless explicitly allowed through an approved interface or ADR. Communication between engines and the framework should happen through standardized events or explicit contracts.

## 6. Event Bus

The framework provides an internal event bus so engine activity can be routed, observed, and coordinated without direct coupling between engines.

## 7. Dependency Injection

The framework provides a dependency injection model so engines receive collaborators and services through explicit injection rather than hidden shared state.

## 8. Engine Registration

The framework maintains a registry of available engines and their capabilities so the system can discover, load, and coordinate them consistently.

## 9. Health Checks

The framework provides health and readiness signals so runtime state can be observed and monitored without inspecting engine internals directly.

## 10. Configuration

The framework provides a shared configuration path that ensures engines consume validated, centrally managed configuration values.

## 11. Logging

The framework provides structured logging so engine activity is observable and consistent across the system.

## 12. Metrics

The framework provides a common metrics interface so engines can expose runtime information for monitoring and assessment.

## 13. Shutdown Sequence

The framework defines a graceful shutdown sequence that allows engines to stop safely, release resources, and preserve state where appropriate.

## 14. Mandatory Security Requirements

Every engine that uses the framework must comply with the following security requirements:

- expose health and version information through the framework contract
- authenticate requests and privileged operations
- authorize operations using the approved role and permission model
- validate all external and internal inputs before acting on them
- emit audit logs for privileged actions and security-relevant state changes
- never expose secrets in logs, health output, events, or metadata
- support graceful shutdown and controlled termination during security events
- consume secure configuration values through the framework rather than ad hoc access paths

## 15. Future Extension Points

The framework should be designed so that future capabilities such as remote execution, distributed orchestration, or additional engine-specific services can be added without changing the fundamental engine model.
