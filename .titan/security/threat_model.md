# Threat Model

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md` and `architecture.md`.

## Threat Catalogue

| Threat | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Prompt injection | Malicious instructions alter tool or engine behavior | High | High | Input validation, policy enforcement, isolated execution, human approval for privileged actions |
| Malicious repositories | Untrusted code or content causes harmful effects | High | High | Repository trust model, sandboxing, dependency scanning, review gates |
| Remote code execution | Arbitrary code runs in the environment | Medium | Critical | Sandboxed execution, command allowlists, process isolation, least-privilege identities |
| Credential theft | Secrets are exposed or misused | Medium | Critical | Secret manager, no secrets in repositories, rotation, short-lived credentials |
| Dependency attacks | Vulnerable or malicious third-party packages are introduced | Medium | High | Dependency scanning, lockfiles, version pinning, review and update policy |
| Supply chain attacks | Trusted build or distribution paths are compromised | Medium | High | Verified artifacts, provenance, signed dependencies, controlled release process |
| Sandbox escape | Isolation boundaries are bypassed | Low | Critical | Layered containment, minimal privileges, kernel-level restrictions where available |
| Privilege escalation | An attacker gains broader access than intended | Medium | High | Least privilege, role separation, approval workflows, audit logging |
| Data leakage | Sensitive data is exposed to unauthorized parties | Medium | High | Encryption, authorization checks, audit logs, data minimization |
| API abuse | Automated or unauthorized use of interfaces | Medium | High | Rate limits, authentication, authorization, anomaly detection |
| Denial of service | System availability is degraded | Medium | Medium | Resource limits, request throttling, circuit breakers, observability |
| Session hijacking | Valid sessions are stolen or replayed | Medium | High | Short-lived sessions, MFA, refresh controls, binding to context |
