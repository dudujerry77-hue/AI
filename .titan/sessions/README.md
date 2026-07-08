# sessions/

A chronological log of every meaningful work session by any agent or human, one file per session, named `YYYY-MM-DD-HHMM-<short-slug>.md` (24h, UTC or clearly noted timezone). This is the project's short-term, granular memory — more detailed and more frequent than `changelog.md`, and the primary way a new agent picks up tacit context that hasn't yet been promoted into the formal governance documents.

## Rules

- Every session that changes code, documents, or project state should produce one session log, written using `templates/session-log-template.md`.
- Session logs are append-only history — never edit a past session log to rewrite what happened; if a correction is needed, add a note in a new session log referencing the old one.
- When starting a new session, read at least the last 2–3 session logs for context per `constitution.md` Section 7.
