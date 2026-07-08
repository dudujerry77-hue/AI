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
- Refresh tokens must be rotated and revocable.
- Credentials must never be logged or exposed through telemetry.
- Authentication failures must be recorded in audit logs.
