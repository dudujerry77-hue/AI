# Incident Response

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md`.

## Response Lifecycle

### Detection

- Monitor health, security events, and audit logs.
- Escalate suspicious activity immediately.

### Containment

- Isolate affected systems, revoke credentials, and limit access.
- Preserve evidence and suspend risky execution paths.

### Recovery

- Restore safe operation from verified backups or known-good state.
- Rotate affected secrets and review affected systems.

### Postmortem

- Document the incident, root cause, and corrective actions.
- Update threat models, controls, and governance documents where needed.
