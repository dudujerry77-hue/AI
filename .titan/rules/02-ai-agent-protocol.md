# Rule 02: AI Agent Session Protocol

## On Session Start
1. Read `constitution.md`.
2. Read `current_phase.md` and `project_state.json`.
3. Read the active phase's file in `phases/`.
4. Skim the last 2–3 files in `sessions/` (by date).
5. Do not assume you are continuing a specific prior conversation — you are not. Treat the repository as the entire source of context.

## During the Session
6. Stay within the scope of the active phase and task unless the human explicitly expands scope.
7. Never fabricate test results, benchmarks, or completion claims.
8. Record any non-trivial decision as an ADR in `decisions.md` as you make it, not retroactively at the end.

## On Session End
9. Write a session log in `sessions/` using `templates/session-log-template.md`.
10. Update `project_state.json` to reflect the true current state.
11. Update `current_phase.md` if exit criteria for the active phase are now met.
12. Update `changelog.md` if user-visible or architecturally significant changes were made.
