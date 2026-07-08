# Rule 01: File Editing Rules

1. Never delete any file in `.titan/` without explicit human instruction to do so.
2. `changelog.md`, `decisions.md`, and files in `sessions/` are append-mostly — add new entries rather than rewriting history. Corrections to past entries are made via a new entry that references the old one, not by silently editing the old one.
3. `current_phase.md` and `project_state.json` are the two files expected to be overwritten/updated frequently — they represent live state, not history.
4. `constitution.md` may only be edited via the amendment process (Section 8 of the constitution itself).
5. Any edit to `architecture.md`, `tech_stack.md`, `coding_standards.md`, `naming_conventions.md`, `security_policy.md`, `testing_strategy.md`, or `deployment_strategy.md` that changes an existing rule (not just adds a new one) must be accompanied by an ADR in `decisions.md` explaining the change.
