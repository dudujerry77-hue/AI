# CURRENT PHASE

**Document Class:** Live Status
**Authority:** Must always match the "in-progress" row in `roadmap.md` and the `current_phase` field in `project_state.json`. If any of the three disagree, treat this file as suspect and reconcile against `roadmap.md` (the canonical sequence) and `sessions/` (the actual history) before trusting any single source.

---

## Active Phase

- **Phase ID:** 015
- **Name:** Deployment Readiness
- **Status:** in-progress
- **Started:** 2026-08-03
- **Completed:** 

## What This Phase Is

Finalizing CI/CD, staging validation, and operational controls required for a safe first production release: validating deployment pipelines and release gates, performing staging verification for functional and operational readiness, and confirming security/compliance/deployment checklists are satisfied.

**Current state: the CI/pipeline-hygiene portion is implemented and verified; the remaining milestones (artifact packaging, staging environment, staging validation, production deployment, rollback) are governance-blocked, not technically blocked — see Notes below and `phases/phase-015-deployment-readiness.md`'s Current Blockers section. This phase remains `in-progress`: no governance document requires a `blocked` status merely because these blockers exist.**

## Prior Phase Completed

- **Phase ID:** 014
- **Name:** Test Coverage Completion
- **Status:** complete
- **Completed:** 2026-08-03

## Exit Criteria (current phase)

- [ ] Deployment-readiness checklists are complete and approved.
- [ ] Staging validation passes with documented evidence.
- [ ] Production release can proceed under governance controls.

None are checked. The first is partially satisfied (CI/pipeline hygiene only); the second and third cannot be satisfied while no staging or production environment exists.

## Next Phase

- **Phase ID:** 016
- **Name:** Production Release
- **Status:** not-started
- **Entry Criteria:** Phase 015 completion — **not yet met.**
- **What the next agent should do first:** Do not start Phase 016. Phase 015 must first be unblocked (see Notes) and its remaining milestones completed.

## Notes

- Phase 015 (Deployment Readiness) is **in-progress**, not complete. Three CI-gate milestones were completed and verified: a `format:check` gate (`deployment_strategy.md` §2 step 2), a no-skipped/ignored-tests gate (§2 step 3), and a basic, dependency-free secrets pattern scan (§2 step 5) — all added to `.github/workflows/ci.yml`. The pre-existing `npm audit --audit-level=high` dependency scan (added in Phase 014, not Phase 015) is also part of this pipeline. `npm run lint`, `npm test` (612/612), and `npm run build` all pass; `npm run format:check` fails only on 74 pre-existing, out-of-scope `.titan/` files.
- **Every remaining Phase 015 milestone (artifact packaging, staging environment, staging validation, production deployment, rollback) is blocked by the same root governance gap, confirmed by a dedicated per-milestone audit:**
  1. `tech_stack.md` §5: *"Hosting/deployment target: Not yet selected; deferred until product-specific requirements exist."*
  2. Artifact format (`deployment_strategy.md` §2 step 6: container image / bundle / package) cannot be chosen without that decision.
  3. Staging/production environment tiers cannot be defined — `deployment_strategy.md` §1: *"Until a concrete product exists, these are the required environment tiers to establish... this document does not invent infrastructure prematurely."*
  4. Production deployment is additionally, independently blocked by `deployment_strategy.md` §7's hard blocker: unresolved high/critical dependency vulnerabilities (3 high + 2 critical, found in Phase 013's hardening review) with no risk-acceptance ADR.
- **Minimum governance decisions required to unblock:** (a) complete `tech_stack.md` §2's stack-selection process for the hosting/deployment target, recorded in `tech_stack.md` §5 plus an ADR in `decisions.md`; (b) resolve or risk-accept (via a separate ADR) the existing dependency vulnerabilities. Neither is something a later phase resolves automatically — both require a governance-layer update now.
- No deployment infrastructure, artifact format, cloud provider, staging environment, or rollback mechanism was invented to work around this gap.
- Phase 014 (Test Coverage Completion) is complete — see prior entry in `changelog.md` and `phases/phase-014-test-coverage-completion.md` for its own carried-forward items (coverage-threshold ambiguity, a confirmed flaky Validation Engine test), which remain separately unresolved and are unrelated to Phase 015's blocker.

## Instructions for Whoever Reads This Next

1. Continue with the next phase in dependency order: Engine Framework (006) → Security Architecture Governance (006a) → Knowledge Engine (007) → Planner Engine (008) → Orchestrator Engine (009) → Execution Engine (010) → Validation Engine (011) → Learning Engine (012) → Titan Core Integration and Hardening (013) → Test Coverage Completion (014) → Deployment Readiness (015, currently blocked), per `roadmap.md`.
2. **Do not advance to Phase 016.** Deployment Readiness (015) remains active. Before resuming its remaining milestones, the governance decisions listed above (hosting/deployment target; dependency-vulnerability resolution or risk-acceptance) must be made and recorded via ADR, per `tech_stack.md` §2 and `deployment_strategy.md` §7.
3. When you complete work, update this file's Active Phase status, update `project_state.json`, and append to `changelog.md`.
4. If you are picking this project back up after a long gap, also skim the last 2–3 files in `sessions/` for tacit context not yet promoted into these governance docs.
