# rules/

Short, atomic, individually-referenceable rule files that expand on the constitution for specific recurring situations. Where `constitution.md` is the supreme law, files here are more like statutes — specific, practical rules an agent can cite directly (e.g., "per rules/02-ai-agent-protocol.md, I must not do X").

Splitting rules into small files (rather than one giant list) makes them easier for an agent to load selectively and easier for humans to amend individually without touching the whole constitution.

## Index

- `00-supremacy.md` — precedence of governance documents (mirrors `constitution.md` Section 2, kept here for quick reference).
- `01-file-editing-rules.md` — rules for what an agent may and may not edit in `.titan/` and the codebase.
- `02-ai-agent-protocol.md` — session start/end protocol for AI agents specifically.
- `03-escalation-rules.md` — when an agent must stop and ask a human instead of proceeding.
