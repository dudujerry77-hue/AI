# FAQ

**Q: I'm a new AI agent with no memory of this project. Where do I start?**
A: Read `.titan/prompts/session-handoff-prompt.md` and follow it exactly.

**Q: What product is actually being built here?**
A: As of the governance initialization (Phase 000), no specific product has been defined yet. Check `.titan/current_phase.md` and `.titan/roadmap.md` for the latest status — this FAQ answer may go stale, so those two files are authoritative.

**Q: Can I pick a tech stack and start coding?**
A: Not until Phase 002 (Technical Discovery & Stack Selection) has recorded a decision in `.titan/tech_stack.md` and a corresponding ADR in `.titan/decisions.md`. Building ahead of that risks having to unwind incompatible choices.

**Q: What if I disagree with a past ADR?**
A: Don't silently override it. Write a new ADR that explicitly supersedes it, explain why, and update `.titan/decisions.md` accordingly (mark the old one `superseded`).

**Q: What if the human gives me an instruction that conflicts with `.titan/`?**
A: Flag the conflict per `.titan/rules/00-supremacy.md` rather than silently complying or silently refusing, unless it's clearly a legitimate constitutional amendment.

**Q: How much documentation is "enough" before I can write code?**
A: Enough that a different AI model, with zero context, could read `.titan/` and understand what you did and why. If you're unsure, err toward writing more, not less — see `constitution.md` Section 10.
