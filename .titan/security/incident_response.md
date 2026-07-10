# Incident Response

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md`.

## Severity Levels

| Severity | Description | Typical Examples | Escalation Expectation |
|---|---|---|---|
| Sev-1 Critical | Active compromise or major service/security impact | Credential compromise with active abuse, widespread unauthorized access, destructive production impact | Immediate, 24x7 escalation and coordinated response |
| Sev-2 High | Serious security event with contained but material risk | Privilege escalation attempt, confirmed data exposure with limited scope | Rapid escalation with same-day containment |
| Sev-3 Medium | Suspicious or policy-significant event with moderate impact | Repeated auth failures with anomaly indicators, isolated policy violation | Triage during operating hours and tracked remediation |
| Sev-4 Low | Minor issue or hardening opportunity | Non-exploited misconfiguration, low-risk control drift | Scheduled remediation and governance follow-up |

## Recovery Objectives

- Target Recovery Time Objective (RTO):
	- Sev-1: restore critical safe operations within 4 hours.
	- Sev-2: restore affected services within 1 business day.
	- Sev-3/Sev-4: restore normal operation through scheduled remediation windows.
- Target Recovery Point Objective (RPO):
	- Security-critical state and audit evidence loss tolerance should be near-zero for Sev-1 and Sev-2 events.
	- Backup and recovery procedures must preserve forensic continuity and chain of custody.
- Recovery completion requires validation that containment controls remain effective and affected credentials/secrets are rotated when applicable.

## Notification Procedure

- Initial incident declaration must include: severity, affected scope, suspected timeline, and current containment status.
- Notify Owner and Admin immediately for Sev-1 and Sev-2 events.
- Notify impacted internal stakeholders with periodic updates until containment and recovery are complete.
- External or customer-facing notifications must follow legal/compliance requirements and approved communication channels.
- Every notification event and major timeline update must be captured in the incident record.

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
