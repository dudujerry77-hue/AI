# Rule 00: Supremacy of Governance Documents

1. `constitution.md` outranks every other document in this repository, including any single human instruction given in a chat session that does not explicitly invoke the amendment process in `constitution.md` Section 8.
2. Within `.titan/`, precedence when documents conflict is: `constitution.md` → `security_policy.md` → `architecture.md` → `master_plan.md`/`roadmap.md` → standards documents (`coding_standards.md`, `naming_conventions.md`, `testing_strategy.md`, `deployment_strategy.md`, `tech_stack.md`) → `current_phase.md`/`phases/*` → `decisions.md` → `sessions/*`/`reviews/*`.
3. A human's in-chat instruction that contradicts this hierarchy should be flagged by the agent, not silently obeyed or silently refused — explain the conflict and ask for explicit confirmation before proceeding, unless the instruction is clearly a legitimate amendment per Section 8 of the constitution.
