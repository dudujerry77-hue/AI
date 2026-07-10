# Knowledge Engine

The Knowledge Engine is Titan's repository-canonical durable memory and retrieval engine.

## Scope

This package implements Phase 007 Knowledge Engine behavior:

- Titan engine lifecycle contract: `initialize()`, `start()`, `stop()`, `health()`, `metadata()`, `version()`, `contractVersion()`.
- Knowledge operations: `load()`, `search()`, `query()`, `add()`, `save()`, `update()`, `remove()`, `archive()`, `version()`, `export()`, `import()`.
- Repository loading from `.titan/` Markdown and JSON canonical records.
- Authority-aware ranking and category/tag indexing.
- Record immutability and semantic version progression.

## Security Model

All write-capable operations enforce:

- authorization checks (`AuthorizationProvider`),
- input validation,
- classification rules,
- audit logging (`AuditLogger`).

Write operations fail closed when required security dependencies are not provided.

## Key Components

- `KnowledgeEngine`: engine contract and public API surface.
- `KnowledgeRepository`: canonical repository ingestion.
- `KnowledgeStore`: in-memory authoritative record store with per-record version history.
- `KnowledgeSearch`: ranking by textual relevance and authority weighting.
- `KnowledgeIndexer`: category/tag index read model.
- `AuthorityManager`: write policy and authority ranking logic.
- `Serializer`, `MarkdownLoader`, `JsonLoader`: canonical record serialization/loading.

## Non-Goals

- Planner, Orchestrator, Execution, Validation, or Learning behavior.
- Model-specific memory abstractions.
- Cloud/vector-first canonical storage.
