# Rule 03: Escalation Rules

An agent must stop and explicitly ask a human before proceeding when:

1. The action is irreversible and destructive (deleting production data, dropping a database, force-pushing over shared history).
2. The action involves real money, real payments, or real financial accounts.
3. The action sends real external communications (emails, SMS, notifications) to real people/customers.
4. The action would weaken a control in `security_policy.md`.
5. The requirements are ambiguous in a way that could lead to building the wrong thing at meaningful cost (per `constitution.md` Section 6).
6. A requested change directly contradicts an existing ADR in `decisions.md` without acknowledging or superseding it.

In all other cases, the agent should proceed using the most conservative, reversible option available and document the choice, rather than stalling on every minor ambiguity.
