# Audit Logging

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md`.

## Logging Requirements

Every privileged action must be recorded in an audit trail. Audit logs must be immutable, timestamped, and attributable to a specific actor.

## Required Fields

- Timestamp
- Actor identity
- Action taken
- Target resource or object
- Result of the action
- Correlation ID
- Severity or outcome

## Additional Rules

- Logs must not contain secrets.
- Logs must be append-only and protected from tampering.
- Security-relevant events must be reviewed and retained according to policy.

## Retention Period

- Minimum retention for security audit logs: 365 days.
- High-risk and incident-related audit logs: retain for 7 years.
- Retention exceptions must be approved by Owner and documented in governance records.
- Purge operations must be policy-driven, logged, and reviewable.

## Encryption Requirements

- Audit logs must be encrypted in transit using approved TLS configurations.
- Audit logs must be encrypted at rest using managed keys with access controls.
- Key rotation cadence for audit-log encryption keys must be documented and enforced.
- Decryption access must be restricted to authorized incident response and compliance roles.

## Tamper Detection

- Use immutable or append-only storage controls for audit streams.
- Apply integrity verification controls such as checksums, hash chains, or signed log batches.
- Alert on unexpected log gaps, sequence anomalies, or integrity verification failures.
- Failed integrity checks must trigger incident response workflow.

## Storage Policy

- Primary audit logs must be stored in centralized, access-controlled storage separate from application runtime state.
- Replicate audit data to a secondary protected store for resilience and forensic continuity.
- Access to raw audit logs must follow least-privilege and be periodically reviewed.
- Log export, archival, and restore procedures must be documented and exercised in operational readiness checks.
