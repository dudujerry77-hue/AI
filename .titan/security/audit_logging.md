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
