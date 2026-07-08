# SECURITY POLICY

**Document Class:** Technical Governance — High Authority
**Authority:** Subordinate only to `constitution.md`. Superior to `architecture.md`, `tech_stack.md`, and all phase-level decisions. **No agent may weaken this document's protections to satisfy a deadline, client request, or convenience.**

---

## 1. Core Security Principles

1. **Least privilege by default.** Every component, credential, and user gets the minimum access required — never broad access "to be safe" or "to save time."
2. **Defense in depth.** No single control is trusted alone (e.g., input validation at the boundary AND parameterized queries AND least-privilege DB accounts).
3. **Secure by default, opt-in to risk.** Defaults should be the safe choice; anything less safe requires explicit, documented opt-in with an ADR.
4. **Assume breach.** Design logging, monitoring, and containment so that if one layer fails, the blast radius is limited and detectable.
5. **No security through obscurity as the sole control.** Obscurity may be a layer, never the only layer.

## 2. Secrets Management

- **No secrets, API keys, tokens, passwords, or credentials are ever committed to the repository** — not in code, not in config files, not in comments, not in test fixtures, not in commit messages.
- Secrets live in environment variables or a dedicated secrets manager appropriate to the deployment target, loaded via the project's Config Manager (see `architecture.md` Section 4).
- `.env` files (or equivalent) must be listed in `.gitignore` from the very first commit. A `.env.example` with placeholder keys (no real values) should be committed instead.
- If a secret is ever accidentally committed: treat it as compromised, rotate it immediately, and record the incident in `sessions/` and, if severe, in `decisions.md`.

## 3. Input Handling

- All external input (user input, API responses, file contents, environment variables) is untrusted until validated.
- Validate and sanitize at the boundary (`/interfaces` layer per `architecture.md`), not deep inside business logic.
- Use parameterized queries / prepared statements for all database access — never string-concatenated queries.
- Escape or encode output appropriately for its context (HTML, shell, SQL, log) to prevent injection.

## 4. Authentication & Authorization (When Applicable)

- Passwords, when stored, must be hashed with a modern, slow, salted algorithm (e.g., Argon2id, bcrypt) — never stored in plaintext or reversibly encrypted.
- Sessions/tokens must have expiration and revocation mechanisms.
- Authorization checks happen server-side / in trusted contexts, never trusting a client-supplied role or permission flag alone.

## 5. Dependency Management

- Dependencies are added deliberately per the process in `tech_stack.md`, not pulled in ad hoc.
- Dependency vulnerabilities (via `npm audit`, `pip-audit`, `cargo audit`, or equivalent) are checked as part of CI (see `deployment_strategy.md`). Known critical/high vulnerabilities block release unless explicitly risk-accepted via an ADR with a remediation timeline.
- Avoid abandoned/unmaintained dependencies for anything security-relevant (auth, crypto, input parsing).

## 6. Logging & Data Handling

- Logs must never contain secrets, full credentials, full payment details, or unnecessary personally identifiable information (PII).
- Sensitive data at rest should be encrypted where the threat model warrants it; document the decision either way in an ADR once a product exists.
- Data retention and deletion policies should be defined once a product with real user data exists (tracked as a Phase 001/002 follow-up).

## 7. AI-Agent-Specific Security Rules

Because this codebase may be modified by autonomous or semi-autonomous AI agents:

1. No agent may execute destructive operations against production data, real payment systems, or real external communications (emails, SMS, etc.) without explicit human confirmation in the current session.
2. No agent may disable, weaken, or remove a security control (auth check, input validation, encryption) without an accompanying ADR explaining why and human sign-off.
3. No agent may introduce code that exfiltrates data to an undisclosed external endpoint.
4. Any tool/library capable of executing arbitrary code (eval, dynamic imports of untrusted input, shell execution from user input) requires explicit justification and review before use.

## 8. Incident Handling

If a security issue is discovered (by an agent, human, or automated scan):

1. Do not attempt to hide or silently patch it without recording it.
2. Log it immediately in `sessions/` with severity and details.
3. If it's a design-level issue, open an ADR describing the fix.
4. Update `project_state.json` → `quality.known_open_security_issues` until resolved.
5. Block deployment per `deployment_strategy.md` if severity is high/critical.

## 9. Compliance Note

This policy defines a strong general-purpose baseline. If the eventual product handles regulated data (health, financial, children's data, etc.), this document must be extended with the specific regime's requirements (e.g., GDPR, HIPAA, PCI-DSS) as an amendment recorded via ADR before that data is handled.
