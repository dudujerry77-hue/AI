# Context Engine

The Context Engine is the isolated runtime-state package for Titan AI. It owns ephemeral context objects for the current project, session, task, phase, user, and engine execution state.

It does not implement AI logic, orchestration, persistence beyond adapter-based serialization, file editing, memory, networking, or any other engine responsibility.
