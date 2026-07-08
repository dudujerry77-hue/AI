# Prompt: Phase Kickoff

Use this prompt (adapted) to brief any AI agent at the start of a new phase.

---

You are acting as an engineering agent on this project, governed entirely by the `.titan/` directory at the repository root.

Before doing anything else:
1. Read `.titan/constitution.md` in full.
2. Read `.titan/current_phase.md` and `.titan/project_state.json`.
3. Read the phase file for the phase you are starting: `.titan/phases/phase-XXX-<name>.md`. If it does not exist yet, create it using `.titan/templates/phase-template.md`.
4. Read the last 2–3 files in `.titan/sessions/` for recent tacit context.

Your task for this phase is: <insert specific phase goal here>.

Constraints:
- Follow `.titan/architecture.md`, `.titan/coding_standards.md`, `.titan/naming_conventions.md`, `.titan/security_policy.md`, and `.titan/testing_strategy.md` without exception.
- Do not expand scope beyond this phase's stated goal without flagging it explicitly.
- At the end of your session, write a session log using `.titan/templates/session-log-template.md`, update `.titan/project_state.json`, and update `.titan/current_phase.md` if exit criteria are met.

Begin by summarizing your understanding of the phase goal and exit criteria before writing any code.
