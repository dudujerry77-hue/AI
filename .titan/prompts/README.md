# prompts/

Reusable, versioned prompts for invoking AI agents (Claude, Codex, Lovable, Gemini, Titan AI, or others) consistently across sessions. Storing prompts here — rather than reinventing them per session — ensures every agent is instructed the same way for the same kind of task.

## Contents

- `phase-kickoff-prompt.md` — use when starting a new phase.
- `task-prompt-template.md` — use for a single well-scoped task within a phase.
- `code-review-prompt.md` — use when asking an agent to review code against governance standards.
- `session-handoff-prompt.md` — use to brief a new agent/session on prior context before continuing work.

## Rule

When you write a new reusable prompt pattern that works well, save it here instead of only using it once. Future agents (including future instances of yourself) benefit from a growing library of proven prompts.
