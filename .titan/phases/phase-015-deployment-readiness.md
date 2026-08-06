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

None of the three Exit Criteria are checked. The CI/pipeline-hygiene portion of the first criterion is implemented (see Milestone History). The second criterion, "Staging validation passes with documented evidence," now has real supporting evidence (Milestone 8: 612/612 tests passed against the packaged artifact in a clean environment), but is left unchecked because that evidence is from a local reproduction of the staging CI job, not yet from an actual GitHub-hosted `environment: staging` run — see Milestone 8 and Current Blockers. The third criterion, "Production release can proceed under governance controls," cannot be honestly satisfied while no production deployment exists — see Current Blockers below.

## Milestone History

- **Milestone 1 — Format-Check CI Gate:** Added `format:check` (`prettier --check .`) as a new `npm` script and a CI step, closing `deployment_strategy.md` §2 step 2's named-but-previously-missing "format check" static check. Uses the pre-existing `prettier` devDependency; no new dependency.
- **Milestone 2 — No-Skipped/Ignored-Tests CI Gate:** Added a `grep`-based CI step (`! grep -rnE "\b(it|describe|test)\.(skip|only|todo)\(" tests --include=*.ts`) that fails the build if any `.skip()`/`.only()`/`.todo()` marker exists anywhere in `tests/`, closing `deployment_strategy.md` §2 step 3's "no skipped/ignored tests without explicit, reviewed justification" requirement. No new dependency; verified empirically both against the clean suite and a deliberately-injected violation in a throwaway fixture.
- **Milestone 3 — Basic Secrets Pattern Scan:** Added a `grep`-based CI step matching fixed-format credentials (AWS access key IDs, PEM private-key headers, GitHub tokens, Slack tokens) across the whole tracked tree, closing `deployment_strategy.md` §2 step 5's "secrets-scanning of the diff" in a dependency-free form — explicitly *not* a general-purpose secrets-scanning tool (gitleaks/trufflehog), which would be a new core dependency requiring `tech_stack.md` §2's stack-selection process. Verified against the exact GitHub Actions bash invocation mode (no history-expansion or `errexit` issues), against a fabricated secret (correctly fails), and against the full repository including `.titan/` and the workflow file itself (zero false positives, including no self-match on the regex source text). Reviewed and confirmed technically sound in a dedicated follow-up audit.
- **Milestone 4 — Deployment Target Governance Decision (complete):** Phase 015 selected and recorded the deployable product's hosting/deployment target, following the evaluation process defined in `tech_stack.md` §2 (candidates evaluated against §3/§3a's criteria). **Decision: local/CLI execution — no external hosting provider** — no hosting provider, container platform, or cloud service is in use; Titan Core continues running in-process, invoked directly against its own repository. Recorded as **ADR-0008** (accepted 2026-08-06, `decisions.md`) and reflected in `tech_stack.md` §5. This satisfies the governance decision Milestone 4 existed to make. Staging Environment was unblocked in principle by this decision and has since been implemented — see Milestones 7-8.
- **Milestone 5 — Dependency Vulnerability Remediation:** Resolved all 8 previously-reported `npm audit` findings (3 moderate, 3 high, 2 critical) from Phase 013's hardening review. Applied `npm audit fix` (non-breaking) to resolve `brace-expansion` and `postcss`; upgraded the existing `vitest` and `@vitest/coverage-v8` devDependencies (already-approved tooling, not a new dependency) from `^2.x` to `^4.1.10` to resolve `vite`, `vitest`, `@vitest/coverage-v8`, and the 3 remaining moderate findings, all part of the same dependency tree. `npm audit` now reports **0 vulnerabilities**. No engine source file was modified; no test file required any modification (612/612 pass unchanged); `vitest.config.ts` required no compatibility changes. Verified: `npm install`, `npm run lint`, `npm run build`, `npm test` (612/612), `npm run coverage`, and `npm audit` (0 vulnerabilities) all pass.
- **Milestone 6 — Artifact Packaging and Clean-Environment Validation:** Implemented `scripts/package-artifact.sh` (`npm run package`), producing a `git archive` source tarball of the tracked repository at `HEAD` — the "package" artifact form named in `deployment_strategy.md` §2 step 6, chosen because a per-milestone audit found artifact packaging achievable independently of the hosting/deployment-target decision (Milestone 4, corrected above). Added a `validate-artifact` CI job that extracts the artifact into a fresh job, reinstalls (`npm ci`), rebuilds, and runs the complete existing test suite (`npm test`) against it, proving the packaged artifact is self-contained and passes all 612 tests — including both `tests/integration/*.test.ts` files, unmodified. This was, at the time, a deployment-target-agnostic approximation of `deployment_strategy.md` §2 step 8's staging validation, not the literal requirement (which must mirror production config); Milestones 7-8 below complete that requirement now that a deployment target and a staging environment exist.
- **Milestone 7 — Staging Environment (complete):** Implemented the Staging tier for Titan Core's local/CLI deployment target (ADR-0008). `.github/workflows/ci.yml`'s `validate-artifact` job now declares `environment: staging`; is gated to run only `on: push` to `main` (closing `deployment_strategy.md` §2 step 7's "automatic on merge to the main integration branch," rather than on every PR as before); and writes a durable evidence record (commit SHA, artifact name, workflow run link, test-suite summary) to the job summary via `$GITHUB_STEP_SUMMARY`. A dedicated read-only verification (recorded earlier in this phase's session history) established that `environment: staging` alone provides real, GitHub-native environment identity and automatic deployment history/records, but not `deployment_strategy.md` §1's "restricted access" — that requires environment protection rules configured in GitHub repository Settings, outside this repository's tracked files. **The `staging` environment has since been created and configured directly in GitHub repository Settings: deployment is restricted to the `main` branch via a deployment branch policy; no required reviewers or environment secrets were configured, a deliberate, proportionate choice for the project's current single-developer workflow.** With this manual configuration complete, all four components of `deployment_strategy.md` §1's Staging definition — environment identity, deployment history/records, mirrors production config, restricted access — are now satisfied.
- **Milestone 8 — Staging Validation:** Performed `deployment_strategy.md` §2 step 8's staging validation by executing the `validate-artifact` CI job's exact procedure locally: built the artifact from `HEAD` (commit `0042cd915ba5ae25b7ae6d9a1da31d317883d203`) via `npm run package`, extracted it into a clean directory outside the repository, then ran `npm ci` (a genuine from-scratch reinstall), `npm run build`, and `npm test`. **Result: 612/612 tests passed (12 test files)**, including both `tests/integration/*.test.ts` files, in a clean, freshly-provisioned environment running the packaged artifact — the exact scenario `deployment_strategy.md` §1 defines Staging around. **This is a local reproduction of the CI job's steps, not an execution of the actual GitHub-hosted, `environment: staging`-gated workflow run:** the CI changes recording Milestone 7 have not yet been pushed to the remote repository, so the environment's branch-restriction gate has not yet been exercised by a real GitHub Actions run. A live run, triggered by pushing/merging these changes to `main`, would provide the strongest form of documented evidence and is a recommended near-term follow-up, but pushing to the remote repository was not authorized in this session and so was not performed. Phase 014's previously-confirmed flaky test (`tests/unit/validation-engine.test.ts`) did not manifest in this run; it remains separately tracked and unresolved, unrelated to this milestone.
- The CI workflow's dependency vulnerability scan (`npm audit --audit-level=high`, `deployment_strategy.md` §2 step 5 / `security_policy.md` §5) was added in **Phase 014 Milestone 5**, not Phase 015 — it is inherited and reused by this phase's CI workflow, not new Phase 015 work, and is recorded here only for completeness against `deployment_strategy.md` §2's full step list.
- All CI-gate work above is verified: `npm run lint`, `npm test` (612/612), and `npm run build` pass; `npm run format:check` fails only on 74 pre-existing, out-of-scope `.titan/` files (unchanged, not part of this phase's mandate).
- **Staging now exists; production and rollback do not.** No Dockerfile, container configuration, cloud-provider configuration, or rollback mechanism exists anywhere in the repository. The Staging Environment (Milestone 7) and Staging Validation (Milestone 8) are complete. This is a deliberate scope boundary, not an oversight — see Current Blockers.

## Current Blockers — Production Deployment and Rollback Are the Remaining Milestones (Staging Complete)

All governance decisions and every milestone up to and including Staging Validation are now resolved and complete — see below. No governance document requires changing this phase's Status away from `in-progress` merely because implementation work remains; `roadmap.md` and `templates/phase-template.md` define `blocked` as one of four allowed status values, but no document specifies when it must be used, and `constitution.md` §7's handoff protocol ties `current_phase.md` updates only to exit criteria being met.

A dedicated read-only audit (per-milestone: artifact packaging, staging environment, staging validation, production deployment, rollback) was performed against `phase-015-deployment-readiness.md`, `deployment_strategy.md`, `tech_stack.md`, and `architecture.md` earlier in this phase. It found two governance gaps blocking the remaining milestones at the time; both are now closed:

**Resolved — Hosting/deployment target:** `tech_stack.md` §5's *"Hosting/deployment target: Not yet selected"* deferral is resolved. **ADR-0008** (accepted 2026-08-06) selected **local/CLI execution — no external hosting provider**, following `tech_stack.md` §2's evaluation process against §3/§3a's criteria. `tech_stack.md` §5 now records the decision. See Milestone 4.

**Resolved — Dependency vulnerabilities:** `deployment_strategy.md` §7's hard blocker (*"A known critical/high security vulnerability is unresolved without an accepted risk ADR"*) no longer applies — Milestone 5 eliminated all 8 previously-reported vulnerabilities via remediation; `npm audit` now reports 0.

**Resolved — Staging Environment:** Implemented in the repository (`environment: staging` on the `validate-artifact` CI job, merge-only trigger, documented-evidence step) and configured in GitHub repository Settings (deployment restricted to `main`; no reviewers/secrets required for the current single-developer workflow). See Milestone 7.

**Resolved — Staging Validation:** Performed as a local reproduction of the staging CI job's exact procedure — 612/612 tests passed in a clean, freshly-provisioned environment running the packaged artifact. See Milestone 8 for the important caveat that this is local-reproduction evidence, not yet evidence from an actual GitHub-hosted `environment: staging` run (which requires pushing these changes to `main`, not yet authorized or performed).

1. **Production Deployment is now the next remaining milestone.** `deployment_strategy.md` §2 steps 9-11 (manual promotion approval, production deploy using the staging-validated artifact, post-deploy verification) and §7's hard-blocker checklist define what it requires. **Not started, and explicitly not authorized to start yet.**
2. **Rollback is the milestone after that.** `deployment_strategy.md` §4 defines rollback as redeploying the last known-good artifact, with every rollback event logged in `sessions/`. **Not started, and explicitly not authorized to start yet.**

No governance decision remains outstanding for Phase 015. The remaining work (Production Deployment → Rollback, in that dependency order) is implementation, not governance, and has not been started — per explicit instruction, it should not be started until authorized.

No deployment infrastructure, artifact format, cloud provider, or rollback mechanism has been invented or implemented to get ahead of this. Per `deployment_strategy.md` §1's own instruction, this document "does not invent infrastructure prematurely," and neither does this implementation.

## Verification

- **`npm run format:check`:** FAILS as expected — but confirmed the only violations are the same 74 pre-existing, out-of-scope `.titan/` files; 0 violations outside `.titan/`.
- **`npm run lint`:** PASS (0 errors, 0 warnings).
- **`npm test`:** PASS (612/612 tests).
- **`npm run build`:** PASS (`tsc -p tsconfig.json`, no errors).
- **`npm audit`:** PASS — 0 vulnerabilities (previously 8: 3 moderate, 3 high, 2 critical; see Milestone 5).

## Handoff Notes

**Phase 015 remains active and in-progress — do not advance to Phase 016.** Phase 016's own entry criteria require Phase 015 completion, which has not occurred. **No governance decision remains outstanding**, and Milestones 1-8 are complete: CI/pipeline hygiene (1-3), the deployment-target decision (4, ADR-0008 — local/CLI execution), dependency remediation (5), artifact packaging (6), the Staging Environment (7 — implemented in `ci.yml` and configured in GitHub Settings, restricted to `main`), and Staging Validation (8 — 612/612 tests passed via a local reproduction of the staging procedure; a live GitHub-hosted run is recommended as a follow-up once these changes are pushed, but was not performed here). The next work is implementation: **Production Deployment**, then **Rollback**, in that dependency order. Per explicit instruction, neither has been started and neither should be started without further authorization.
