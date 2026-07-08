# Secure Execution

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md` and `architecture.md`.

## Execution Controls

- Run untrusted or user-provided code only inside a sandboxed execution environment.
- Enforce filesystem permissions that limit read/write access to approved paths.
- Restrict network access to approved endpoints and deny egress by default.
- Isolate processes so one execution context cannot directly impact another.
- Apply execution and resource limits for CPU, memory, and wall-clock time.
- Use command allowlists for privileged operations.
- Protect destructive commands through explicit approval gates and deny-by-default policy.

## Additional Requirements

- No unrestricted shell access for untrusted inputs.
- Privileged actions must require explicit authorization and audit logging.
- Execution failures must be observable and contained.
