# Authentication

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md`.

## Authentication Requirements

All privileged interactions must be authenticated before action is taken. Authentication is mandatory for human users, service accounts, and engine-to-engine calls where policy or state changes are involved.

## Supported Mechanisms

- **OAuth 2.0 / OpenID Connect** for user and service authentication.
- **API keys** for machine-to-machine integrations, with scoped permissions and rotation support.
- **JWT bearer tokens** for short-lived authorization context, with signature verification and expiration checks.
- **MFA support** for privileged accounts and administrative workflows.

## Session and Credential Rules

- Sessions must expire automatically.
- Access tokens must be short-lived and strictly time-bounded.
- Refresh tokens must be rotated and revocable.
- Credentials must never be logged or exposed through telemetry.
- Authentication failures must be recorded in audit logs.

## Session Lifetime Policy

- Interactive human sessions must use a maximum lifetime of 8 hours and an idle timeout of 30 minutes.
- Privileged administrative sessions should require re-authentication after 15 minutes of inactivity.
- Machine-to-machine sessions must use non-interactive short-lived credentials and no indefinite session state.
- Long-running background workloads must renew credentials through approved refresh or re-authentication flows before expiry.

## Token Expiration Policy

- Access token maximum TTL: 15 minutes.
- Refresh token maximum TTL: 7 days.
- One-time tokens (password reset, invitation, enrollment): maximum TTL 15 minutes and single-use only.
- Expired tokens must be rejected without grace periods for privileged operations.

## Refresh Policy

- Refresh token rotation is mandatory on every successful refresh.
- Reuse detection must treat previously rotated refresh tokens as suspicious and trigger token family revocation.
- Refresh operations must be denied when device, client, or session context fails policy checks.
- Immediate revocation is required on password change, MFA reset, privilege escalation, or suspected compromise.
- Refresh and revocation events must be captured in audit logs with actor, timestamp, and correlation identifiers.
