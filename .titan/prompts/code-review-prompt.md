# Prompt: Code Review

Use when asking any agent to review a change against project governance.

---

Review the following change strictly against this project's governance documents:

- `.titan/coding_standards.md`
- `.titan/naming_conventions.md`
- `.titan/architecture.md`
- `.titan/security_policy.md`
- `.titan/testing_strategy.md`

Produce your review using `.titan/templates/code-review-template.md`, saved into `.titan/reviews/`. For each finding, cite the specific governance document/section it violates or aligns with — do not give purely subjective style opinions unless they trace back to a documented standard. Flag any fabricated/mocked functionality presented as real, per the constitution's prohibition on fabrication.
