# Secret Management

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md`.

## Requirements

- Secrets must not be stored in repositories, config files committed to git, comments, tests, or logs.
- Secrets should be provided through environment variables or an approved secrets manager.
- Secret values must be encrypted at rest and access controlled by role.
- Secret rotation must be supported and documented.
- Secret scanning must run before deployment and on pull requests.

## Additional Controls

- Prefer short-lived credentials over long-lived credentials.
- Rotate keys on a regular cadence and after suspected exposure.
- Treat any committed secret as compromised until proven otherwise.
- Fail closed when a required secret is missing or invalid.
