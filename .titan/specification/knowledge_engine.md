# Knowledge Engine Specification

**Document Class:** Technical Governance
**Authority:** Subordinate to `constitution.md`, `security_policy.md`, `architecture.md`, `engine_framework.md`, and `decisions.md`. This document defines the approved architectural blueprint for the Knowledge Engine. It does not implement runtime behavior.
**Purpose:** Define the Knowledge Engine as Titan's permanent memory system and governance retrieval layer, independent of any specific LLM or model vendor.

---

## 1. Purpose and Scope

The Knowledge Engine is Titan AI's persistent memory and retrieval system. It owns durable knowledge across sessions, contributors, and models so future work can continue without relying on hidden context or model-specific memory.

This specification is a design-phase artifact only. It defines architecture, contracts, storage strategy, security requirements, and extension points for the Knowledge Engine. It does not introduce implementation code.

## 2. Responsibilities

The Knowledge Engine is responsible for:

- storing and serving long-term project memory;
- owning and retrieving the `.titan/` governance corpus and related approved technical records;
- preserving ADRs, session history, lessons learned, and technical documentation as durable knowledge;
- supporting exact and structured retrieval for governance, architecture, planning, validation, and execution support;
- supporting user-approved knowledge updates and durable provenance for who changed what and why;
- maintaining AI-to-AI continuity across sessions by exposing authoritative persistent knowledge;
- enforcing knowledge classification, integrity, archival, and versioning rules;
- exposing a model-agnostic public API for load, save, search, query, update, archive, import, and export operations.

The Knowledge Engine is not responsible for:

- storing ephemeral working state for the active task or session;
- planning, orchestration, execution, or validation decisions;
- rewriting constitutional or security-governance authority without the approved human-gated process;
- deciding whether a proposed lesson or heuristic should be accepted automatically when governance requires approval;
- storing secrets as ordinary knowledge records;
- embedding any LLM-specific prompts, hidden memory state, or provider-locked retrieval assumptions into its core contract.

## 3. Boundary Separation

The Knowledge Engine must not overlap with other engines.

| Engine | Owns | Knowledge Engine Boundary |
|---|---|---|
| Context Engine | Live, session-scoped, ephemeral state | Knowledge Engine never owns volatile in-flight state as the primary source of truth |
| Planner Engine | Goal decomposition and plan generation | Knowledge Engine returns knowledge and precedent; it never plans |
| Orchestrator Engine | Task routing, sequencing, escalation | Knowledge Engine never coordinates work or enforce task flow directly |
| Validation Engine | Independent verification of outputs | Knowledge Engine may provide standards and historical precedent, but never issues verdicts |
| Learning Engine | Observation and proposal of improvements | Knowledge Engine stores approved durable learning outputs, but does not generate or approve them itself |

## 4. Knowledge Model

Titan knowledge is stored as typed, versioned records. Each knowledge record should conceptually include:

- `recordId`
- `kind`
- `category`
- `title`
- `canonicalLocation`
- `tags`
- `relationships`
- `summary`
- `body` or `bodyRef`
- `securityClass`
- `source`
- `version`
- `createdAt`
- `updatedAt`
- `author`
- `approvalStatus`
- `checksum`
- `archived`

### 4.1 Knowledge Categories

**Governance**
- Constitutional documents, master plan, roadmap, current phase, project state, changelog, standards, and governance rules.
- Highest importance for system continuity and policy compliance.

**Architecture**
- Canonical structural design, boundaries, integration rules, diagrams, and architecture-specific specifications.
- Used by implementation and validation flows to avoid design drift.

**Decisions (ADR)**
- Accepted, proposed, superseded, or rejected architectural and process decisions.
- Provides rationale, alternatives, and binding consequences.

**Sessions**
- Historical working logs capturing what happened in specific work periods.
- Primary source for reconstructing recent intent and execution history.

**Project State**
- Machine-readable current status snapshots, counters, phase state, and implementation progress metadata.
- Optimized for structured lookups rather than long-form narrative retrieval.

**User Preferences**
- Approved and durable preferences that affect how Titan should work for a specific repository or stakeholder.
- Must remain explicitly approved and traceable, never inferred silently into governance authority.

**Technical Documentation**
- README files, design notes, package docs, operational references, and future engine specifications.
- Supports engineering continuity outside core governance documents.

**Rules**
- Escalation rules, file-editing rules, agent protocols, and other enforceable behavioral constraints.

**Templates**
- Reusable document scaffolds and standard output shapes.
- Used to keep future updates consistent and machine-readable.

**Security Policies**
- Security baseline, authentication, authorization, audit logging, secure execution, incident response, secret handling, and threat model content.

**Runtime Metadata**
- Contract versions, engine capabilities, compatibility metadata, indexing state, and retrieval summaries that support runtime introspection.

**Lessons Learned**
- Durable, approved heuristics or observations promoted from Learning Engine outputs or human review.
- Must remain distinct from raw session notes and draft proposals.

**Plugin Metadata**
- Namespaced metadata contributed by future plugin providers, including manifests, schemas, and capability declarations.

**History and Archives**
- Archived records, prior versions, superseded decisions, deprecated docs, and immutable historical snapshots.

## 5. Knowledge Hierarchy

Recommended hierarchy:

```text
Knowledge
├── Governance
│   ├── Constitution
│   ├── Planning
│   ├── Standards
│   ├── Rules
│   └── Templates
├── Architecture
│   ├── Core Architecture
│   ├── Engine Specifications
│   └── Integration Constraints
├── Decisions
│   ├── Accepted ADRs
│   ├── Proposed ADRs
│   └── Superseded ADRs
├── Sessions
│   ├── Active History
│   └── Archived History
├── Project State
│   ├── Current Status
│   └── Historical Snapshots
├── Security
│   ├── Policies
│   ├── Threat Models
│   ├── Audit Guidance
│   └── Incident Records
├── Documentation
│   ├── Technical Docs
│   ├── Operational Docs
│   └── Package Docs
├── User
│   ├── Preferences
│   └── Approved Overrides
├── Runtime
│   ├── Engine Metadata
│   ├── Compatibility Data
│   └── Index Metadata
├── Plugins
│   ├── Provider Metadata
│   └── Extension Schemas
└── History
    ├── Archived Versions
    └── Lessons Learned
```

This hierarchy is conceptual, not a hard-coded storage implementation. The canonical store may represent it through directories, indexes, and typed records.

## 6. Public API Design

The Knowledge Engine must implement the base Titan engine contract (`initialize()`, `start()`, `stop()`, `health()`, `metadata()`, `version()`, `contractVersion()`) and may expose additive Knowledge Engine operations.

### 6.1 Knowledge Operations

- `load(request)`
  - Load one or more canonical knowledge records by identifier, location, category, or version selector.

- `save(record)`
  - Persist a new or updated knowledge record using canonical validation, versioning, and provenance rules.

- `search(criteria)`
  - Retrieve records using text, tags, categories, relationships, ranking preferences, or scope filters.

- `query(expression)`
  - Execute structured queries over indexed metadata and relationships for higher-precision retrieval.

- `add(record)`
  - Create a new knowledge record with required metadata, provenance, and classification.

- `update(recordId, patch)`
  - Apply an approved change to an existing knowledge record while preserving history and access policy.

- `remove(recordId)`
  - Perform policy-controlled logical removal or deactivation. Hard deletion should be rare and governed.

- `archive(recordId)`
  - Move a record into an archived state while preserving retrievability, provenance, and historical linkage.

- `version(recordId, selector)`
  - Retrieve or compare specific versions of a knowledge record.

- `export(request)`
  - Export selected knowledge as structured data or portable archives under policy constraints.

- `import(source)`
  - Ingest approved external or migrated knowledge through validation, mapping, and provenance capture.

### 6.2 API Semantics

- All write-capable operations must enforce access control, classification, validation, and audit logging.
- Read operations may expose ranking hints and confidence metadata, but not fabricate knowledge.
- Search/query results should return canonical references and version metadata, not only opaque text blobs.
- LLM-specific embeddings or prompt transformations must remain behind optional adapters, not inside the public contract.

## 7. Retrieval Strategy

Knowledge retrieval should support multiple strategies layered in increasing cost order:

1. **Exact lookup**
   - By record ID, path, canonical filename, ADR number, phase ID, session timestamp, or explicit key.

2. **Structured lookup**
   - By category, tag, author, approval status, relationship, or security classification.

3. **Relationship traversal**
   - Navigate links such as `phase -> ADR -> architecture section -> session log`.

4. **Ranked text search**
   - Search body text, titles, summaries, and indexed fields.

5. **Semantic lookup (future-capable)**
   - Optional semantic retrieval over embeddings or vector backends through pluggable adapters.

### 7.1 Ranking Inputs

Ranking should consider:

- exactness of match;
- authority level;
- recency when appropriate;
- approval status;
- category priority;
- relationship distance from the requesting task;
- version freshness;
- session or phase relevance.

### 7.2 Category Priority Guidance

When conflicts occur, retrieval should prefer higher-authority sources:

1. Constitution and security policy
2. Architecture and accepted ADRs
3. Roadmap/current phase/project state
4. Standards and rules
5. Sessions and historical notes
6. Proposed or archived materials

## 8. Context Integration

### 8.1 What Context Provides

The Context Engine provides:

- active phase and task identifiers;
- current goal and task dependencies;
- session recency and working-set hints;
- actor/session identifiers;
- current repository or file focus;
- transient conflict indicators and active workflow state.

### 8.2 What Knowledge Returns

The Knowledge Engine returns:

- authoritative governance records;
- historical precedent and prior decisions;
- policy-constrained documentation and standards;
- versioned references and related records;
- approved lessons learned and reusable heuristics;
- retrieval metadata such as ranking, provenance, and version information.

### 8.3 Synchronization Model

- Context is the short-lived working set; Knowledge is the durable source of truth.
- Context may request projections or summaries from Knowledge for the active workflow.
- At session end, approved durable outputs may be promoted from session context into Knowledge through explicit write operations.

### 8.4 Conflict Resolution

- Durable governance records outrank transient context.
- When context and knowledge disagree, the engine should surface the conflict rather than silently merge it.
- Conflicts involving authority documents require human review or approved governance workflow.
- Learning-derived updates remain pending until approved by the correct authority path.

## 9. Storage Strategy

### 9.1 Storage Options Considered

- **Repository files**
  - Excellent for canonical governance documents, ADRs, sessions, rules, and technical docs.
- **JSON**
  - Best for machine-readable state, indexes, manifests, metadata snapshots, and import/export payloads.
- **Markdown**
  - Best for human-readable governance, ADRs, design docs, and sessions.
- **SQLite**
  - Strong option for local indexed retrieval, relationships, full-text search, and query acceleration.
- **Vector databases (future)**
  - Suitable for optional semantic retrieval at larger scale, but not required for the initial design.
- **Cloud storage (future)**
  - Useful for shared multi-repository or multi-instance deployment, but not required for the current repository-local system.

### 9.2 Recommended Current Strategy

Titan should use:

- **Canonical store:** repository-backed Markdown and JSON files, with `.titan/` remaining the authoritative durable knowledge corpus.
- **Indexed read model:** optional local SQLite index generated from canonical records for fast retrieval, relationship traversal, and version lookups.

Rationale:

- aligns with the Constitution's repository-first memory model;
- preserves human inspectability and git traceability;
- avoids premature dependence on cloud or vector infrastructure;
- supports exact and structured retrieval immediately;
- allows semantic retrieval later without changing canonical storage.

### 9.3 Future Storage Evolution

- Add pluggable vector indexing as an optional retrieval accelerator.
- Add optional cloud replication or shared knowledge services for distributed deployments.
- Preserve repository-backed canonical truth even when read models diversify.

## 10. Versioning and Schema Evolution

The Knowledge Engine must support:

- record-level versioning;
- schema versioning for metadata envelopes;
- migration descriptors for canonical stores and indexes;
- backward-compatible readers where possible;
- explicit migration tooling for breaking schema changes.

### 10.1 Version Rules

- Canonical records should include schema version and content version.
- Indexes are disposable read models and may be rebuilt from canonical records after schema evolution.
- Breaking changes must be recorded in ADRs and migration plans.

### 10.2 Migration Strategy

- Prefer additive schema changes first.
- When breaking changes are unavoidable, provide:
  - migration path;
  - compatibility window;
  - validation against canonical records;
  - rollback strategy.

## 11. Security Design

### 11.1 Access Control

- Read/write operations must enforce role-based and engine-role-based authorization.
- Not all engines or actors may write to all knowledge categories.
- Constitutional, security, and accepted-ADR updates require stronger approval paths than routine session archival.

### 11.2 Sensitive Knowledge Handling

- Sensitive knowledge must be classified and tagged.
- Secrets must never be stored as ordinary Knowledge Engine records.
- Secret references may be stored only as non-secret metadata pointing to approved secret-management systems.

### 11.3 Audit Logging

- All write, archive, import, export, and policy-relevant read operations should be auditable.
- Audit events should capture actor, target record, timestamp, action, result, and correlation metadata.

### 11.4 Integrity and Tamper Detection

- Canonical records should support checksum or hash verification.
- High-authority knowledge should support integrity verification during retrieval and migration.
- Index corruption must be recoverable by rebuilding from canonical records.

### 11.5 Backup and Recovery

- Repository-backed knowledge is protected by version control and backup policy.
- SQLite or future indexes should be rebuildable, not irreplaceable.
- Recovery strategy should prioritize canonical files, provenance, and audit continuity.

## 12. Extension Points

Future plugins must be able to contribute knowledge without modifying core Knowledge Engine logic.

Recommended extension model:

- plugin-defined namespaces;
- plugin manifests declaring record kinds, schemas, and retrieval hints;
- provider adapters for indexing, import/export, or semantic enrichment;
- policy hooks that allow governance review before plugin-contributed knowledge becomes authoritative.

Plugins may extend:

- metadata schemas;
- retrieval enrichers;
- exporters/importers;
- relationship resolvers;
- category-specific validators.

Plugins must not bypass:

- access control;
- audit logging;
- canonical versioning;
- human-gated governance rules.

## 13. Performance and Scalability

### 13.1 Scale Targets

- **10 projects**
  - Repository files plus lightweight indexing are sufficient.
- **100 projects**
  - SQLite indexing, relationship tables, and selective caching become important.
- **1,000 projects**
  - Sharded indexes, asynchronous indexing, and stronger metadata normalization are likely needed.
- **Millions of knowledge records**
  - Distributed index services, optional vector backends, cache layers, and partitioned storage become necessary.

### 13.2 Indexing Strategy

- file-path and record-ID indexes;
- category/tag indexes;
- relationship indexes;
- version history indexes;
- optional full-text search indexes;
- optional semantic indexes as future adapters.

### 13.3 Caching Strategy

- cache immutable or rarely changing high-authority documents;
- cache query plans and frequently traversed relationship paths;
- invalidate caches on canonical record change or index rebuild;
- never let cache contents become the sole source of truth.

## 14. Architectural Risks and Mitigations

| Risk | Description | Mitigation |
|---|---|---|
| Boundary drift | Knowledge starts absorbing Context or Learning responsibilities | Enforce explicit contracts and category ownership; validate via ADR review and engine specs |
| Retrieval ambiguity | Wrong document is returned because ranking is weak | Use authority-aware ranking, exact IDs, relationship metadata, and provenance-rich results |
| Index divergence | SQLite or future indexes drift from canonical files | Treat indexes as rebuildable read models and verify via checksums/version stamps |
| Governance mutation risk | High-authority documents are changed without approval | Apply category-specific write controls, approval states, and audit logging |
| Secret leakage | Sensitive or secret content is stored like normal knowledge | Enforce classification rules and prohibit storing raw secrets in canonical knowledge |
| Overfitting to one LLM | Knowledge formats assume a specific model context size or retrieval method | Keep contracts model-agnostic and adapter-based |
| Scale bottlenecks | File-only retrieval becomes too slow at larger scale | Add indexed read models first, then optional vector/cloud adapters |
| Plugin abuse | Extensions inject untrusted knowledge or bypass controls | Require manifests, namespaces, validation, audit, and policy enforcement |

## 15. Validation Against Existing Governance

This design aligns with:

- `constitution.md` by preserving repository-first memory, traceability, and human-gated authority changes;
- `architecture.md` by keeping the Knowledge Engine distinct from Context, Planner, Orchestrator, Validation, and Learning;
- `engine_framework.md` by assuming the shared runtime contract and approved event/configuration/logging patterns;
- `specification/engine_api.md` by treating Knowledge Engine operations as additive over the standard engine lifecycle contract;
- security governance by requiring access control, audit logging, integrity verification, backup/recovery, and explicit handling of sensitive knowledge.

No production implementation is authorized by this document. It is the approved architecture blueprint for future Knowledge Engine implementation work.