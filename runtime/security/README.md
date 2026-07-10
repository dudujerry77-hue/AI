# Runtime Security Interfaces

This folder defines runtime-level security contracts used by Titan engines.

These contracts are interface-only and dependency-injection friendly. They define
how engines depend on authentication, authorization, permission checks, audit
logging, and secret access without prescribing a concrete implementation.

No authentication logic, networking, database access, token parsing, or JWT
implementation exists in this folder.
