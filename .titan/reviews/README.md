# reviews/

Code and design review records, one file per review, named `YYYY-MM-DD-<subject-slug>.md`. Reviews here are the durable record of quality gates being enforced — not just a chat comment that disappears.

## When to Create a Review File

- Before merging any non-trivial feature or refactor (per `constitution.md` Section 5, "Definition of Done").
- When a second agent (e.g., Gemini reviewing Claude's work, or vice versa) is asked to audit a change.
- At the end of a phase, as a final phase-level review against `architecture.md`, `coding_standards.md`, `security_policy.md`, and `testing_strategy.md`.

## Format

Use `templates/code-review-template.md`. Every finding must cite the specific governance document it relates to. Findings are categorized as `blocking`, `should-fix`, or `nit`. A review with any `blocking` findings means the change is not yet "Done."
