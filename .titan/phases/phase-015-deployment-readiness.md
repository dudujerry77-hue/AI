# Phase 015: Deployment Readiness

- **Status:** in-progress
- **Started:** 2026-08-03
- **Completed:** 
- **Agent(s) involved:** Claude

## Objective

Finalize CI/CD, staging validation, and operational controls required for a safe first production release.

## Scope

- Validate deployment pipelines and release gates.
- Perform staging verification for functional and operational readiness.
- Confirm security/compliance/deployment checklists are satisfied.

## Deliverables

- CI/CD workflows finalized for release.
- Staging validation report and go/no-go recommendation.
- Updated deployment governance artifacts.

## Acceptance Criteria

- Deployment workflows are reproducible and policy-compliant.
- Staging environment demonstrates release viability.
- Operational rollback and incident readiness are verified.

## Dependencies

- Phase 014 completion.

## Risks

- Last-mile deployment misconfigurations.
- Incomplete operational readiness for incident recovery.

## Exit Criteria

- [ ] Deployment-readiness checklists are complete and approved.
- [ ] Staging validation passes with documented evidence.
- [ ] Production release can proceed under governance controls.

None of the three Exit Criteria are checked. The CI/pipeline-hygiene portion of the first criterion is implemented (see Milestone History), but "Staging validation passes with documented evidence" and "Production release can proceed under governance controls" cannot be honestly satisfied while no staging or production environment exists — see Governance Resolution below.

## Milestone History

- **Milestone 1 — Format-Check CI Gate:** Added `format:check` (`prettier --check .`) as a new `npm` script and a CI step, closing `deployment_strategy.md` §2 step 2's named-but-previously-missing "format check" static check. Uses the pre-existing `prettier` devDependency; no new dependency.
- **Milestone 2 — No-Skipped/Ignored-Tests CI Gate:** Added a `grep`-based CI step (`! grep -rnE "\b(it|describe|test)\.(skip|only|todo)\(" tests --include=*.ts`) that fails the build if any `.skip()`/`.only()`/`.todo()` marker exists anywhere in `tests/`, closing `deployment_strategy.md` §2 step 3's "no skipped/ignored tests without explicit, reviewed justification" requirement. No new dependency; verified empirically both against the clean suite and a deliberately-injected violation in a throwaway fixture.
- **Milestone 3 — Basic Secrets Pattern Scan:** Added a `grep`-based CI step matching fixed-format credentials (AWS access key IDs, PEM private-key headers, GitHub tokens, Slack tokens) across the whole tracked tree, closing `deployment_strategy.md` §2 step 5's "secrets-scanning of the diff" in a dependency-free form — explicitly *not* a general-purpose secrets-scanning tool (gitleaks/trufflehog), which would be a new core dependency requiring `tech_stack.md` §2's stack-selection process. Verified against the exact GitHub Actions bash invocation mode (no history-expansion or `errexit` issues), against a fabricated secret (correctly fails), and against the full repository including `.titan/` and the workflow file itself (zero false positives, including no self-match on the regex source text). Reviewed and confirmed technically sound in a dedicated follow-up audit.
- The CI workflow's dependency vulnerability scan (`npm audit --audit-level=high`, `deployment_strategy.md` §2 step 5 / `security_policy.md` §5) was added in **Phase 014 Milestone 5**, not Phase 015 — it is inherited and reused by this phase's CI workflow, not new Phase 015 work, and is recorded here only for completeness against `deployment_strategy.md` §2's full step list.
- All CI-gate work above is verified: `npm run lint`, `npm test` (612/612), and `npm run build` pass; `npm run format:check` fails only on 74 pre-existing, out-of-scope `.titan/` files (unchanged, not part of this phase's mandate).
- **No deployment infrastructure was implemented.** No Dockerfile, container configuration, cloud-provider configuration, artifact-packaging step, staging environment, or rollback mechanism exists anywhere in the repository. This is a deliberate scope boundary, not an oversight — see Governance Resolution.

## Current Blockers — Remaining Milestones Are Governance-Blocked, Not Technically Blocked

No governance document requires changing this phase's Status away from `in-progress` merely because these blockers exist — `roadmap.md` and `templates/phase-template.md` define `blocked` as one of four allowed status values, but no document specifies when it must be used, and `constitution.md` §7's handoff protocol ties `current_phase.md` updates only to exit criteria being met. The blockers below are therefore documented here, under this phase's own record, rather than expressed as a phase-level status change.

A dedicated read-only audit (per-milestone: artifact packaging, staging environment, staging validation, production deployment, rollback) was performed against `phase-015-deployment-readiness.md`, `deployment_strategy.md`, `tech_stack.md`, and `architecture.md` before this closure. Every remaining milestone is blocked by the same root cause, not by any missing technical capability:

1. **Hosting/deployment target has not been selected.** `tech_stack.md` §5: *"Hosting/deployment target: Not yet selected; deferred until product-specific requirements exist."*
2. **Artifact format depends on that decision.** `deployment_strategy.md` §2 step 6 requires the pipeline to *"produce the deployable artifact (container image, bundle, package)"* — the format itself cannot be chosen without first knowing the hosting target, and choosing one now would be inventing the very decision `tech_stack.md` §5 defers.
3. **Staging and production environments cannot be defined.** `deployment_strategy.md` §1: *"Until a concrete product exists, these are the required environment tiers to establish once Phase 004 (Environment & Tooling Setup) begins — this document does not invent infrastructure prematurely."* Phase 004's own recorded scope (tooling/CI scaffolding only) never established these tiers, and nothing since has.
4. **Production deployment is additionally, independently blocked by unresolved dependency vulnerabilities.** `deployment_strategy.md` §7's explicit hard blocker: *"A known critical/high security vulnerability is unresolved without an accepted risk ADR."* Phase 013's hardening review found 8 vulnerabilities (3 moderate, 3 high, 2 critical) in devDependency transitives; none has been remediated or risk-accepted via an ADR. This blocker exists independently of the hosting-target question — resolving hosting alone would not clear it.

**Minimum governance decisions required before implementation can continue:**
- Complete `tech_stack.md` §2's mandatory stack-selection process for the hosting/deployment target: evaluate candidates against §3/§3a's criteria, record the decision in `tech_stack.md` §5, and log it as an ADR in `decisions.md`.
- Resolve or explicitly risk-accept (via a separate ADR) the existing high/critical dependency vulnerabilities, per `deployment_strategy.md` §7.

Both decisions require a governance-layer update (an ADR is the mechanism `tech_stack.md` §2 itself prescribes) — they are not something a later phase resolves automatically by existing. No document currently names which phase or trigger is responsible for making the hosting-target decision; this sequencing gap is itself worth a future governance note.

No deployment infrastructure, artifact format, cloud provider, staging environment, or rollback mechanism was invented to work around this. Per `deployment_strategy.md` §1's own instruction, this document "does not invent infrastructure prematurely," and neither does this implementation.

## Verification

- **`npm run format:check`:** FAILS as expected — but confirmed the only violations are the same 74 pre-existing, out-of-scope `.titan/` files; 0 violations outside `.titan/`.
- **`npm run lint`:** PASS (0 errors, 0 warnings).
- **`npm test`:** PASS (612/612 tests).
- **`npm run build`:** PASS (`tsc -p tsconfig.json`, no errors).

## Handoff Notes

**Phase 015 remains active and in-progress — do not advance to Phase 016.** Phase 016's own entry criteria require Phase 015 completion, which has not occurred. Before further Phase 015 work (artifact packaging → staging environment → staging validation → production deployment → rollback, in that dependency order) can proceed, the two governance decisions above must be made and recorded (hosting/deployment target via `tech_stack.md` §2's process + ADR; dependency-vulnerability resolution or risk-acceptance via ADR). Once made, resume Phase 015 starting with artifact packaging, since every remaining milestone depends on it transitively.
