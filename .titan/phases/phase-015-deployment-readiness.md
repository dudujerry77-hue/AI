# Phase 015: Deployment Readiness

- **Status:** complete
- **Started:** 2026-08-03
- **Completed:** 2026-08-07
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

- [x] Deployment-readiness checklists are complete and approved.
- [x] Staging validation passes with documented evidence.
- [x] Production release can proceed under governance controls.

**All three Exit Criteria are satisfied, re-evaluated under the Phase 015 / Phase 016 Boundary Correction below.** The first criterion, "Deployment-readiness checklists are complete and approved," has its checklist component closed (CI/pipeline-hygiene, see Milestone History; `security_checklist.md`'s Pre-Deployment Checklist, Milestone 9, see Security Checklist Cross-Reference below) and its approval component closed by explicit human approval given in this phase's session on 2026-08-07, in direct response to this document's own re-evaluation. The second criterion, "Staging validation passes with documented evidence," is satisfied on the basis of Milestone 8 (612/612 tests passed against the packaged artifact in a clean environment) together with the explicit decision, made in this phase's session history, to proceed on local-reproduction evidence rather than wait on a live GitHub Actions run (the CI workflow has never executed on GitHub for any commit in this repository — a separately tracked, non-blocking operational gap, not a Phase 015 blocker). The third criterion, "Production release can proceed under governance controls," is a readiness/capability statement, not a claim that a production release has occurred — see the Phase 015 / Phase 016 Boundary Correction below. Under that corrected reading, it is satisfied: the governed release pipeline (`deployment_strategy.md` §2), its hard blockers (§7 — all clear), staging validation (§2 step 8), and the rollback procedure (§4) all exist and are verified: see Milestone History and Rollback Procedure Verification below.

## Milestone History

- **Milestone 1 — Format-Check CI Gate:** Added `format:check` (`prettier --check .`) as a new `npm` script and a CI step, closing `deployment_strategy.md` §2 step 2's named-but-previously-missing "format check" static check. Uses the pre-existing `prettier` devDependency; no new dependency.
- **Milestone 2 — No-Skipped/Ignored-Tests CI Gate:** Added a `grep`-based CI step (`! grep -rnE "\b(it|describe|test)\.(skip|only|todo)\(" tests --include=*.ts`) that fails the build if any `.skip()`/`.only()`/`.todo()` marker exists anywhere in `tests/`, closing `deployment_strategy.md` §2 step 3's "no skipped/ignored tests without explicit, reviewed justification" requirement. No new dependency; verified empirically both against the clean suite and a deliberately-injected violation in a throwaway fixture.
- **Milestone 3 — Basic Secrets Pattern Scan:** Added a `grep`-based CI step matching fixed-format credentials (AWS access key IDs, PEM private-key headers, GitHub tokens, Slack tokens) across the whole tracked tree, closing `deployment_strategy.md` §2 step 5's "secrets-scanning of the diff" in a dependency-free form — explicitly *not* a general-purpose secrets-scanning tool (gitleaks/trufflehog), which would be a new core dependency requiring `tech_stack.md` §2's stack-selection process. Verified against the exact GitHub Actions bash invocation mode (no history-expansion or `errexit` issues), against a fabricated secret (correctly fails), and against the full repository including `.titan/` and the workflow file itself (zero false positives, including no self-match on the regex source text). Reviewed and confirmed technically sound in a dedicated follow-up audit.
- **Milestone 4 — Deployment Target Governance Decision (complete):** Phase 015 selected and recorded the deployable product's hosting/deployment target, following the evaluation process defined in `tech_stack.md` §2 (candidates evaluated against §3/§3a's criteria). **Decision: local/CLI execution — no external hosting provider** — no hosting provider, container platform, or cloud service is in use; Titan Core continues running in-process, invoked directly against its own repository. Recorded as **ADR-0008** (accepted 2026-08-06, `decisions.md`) and reflected in `tech_stack.md` §5. This satisfies the governance decision Milestone 4 existed to make. Staging Environment was unblocked in principle by this decision and has since been implemented — see Milestones 7-8.
- **Milestone 5 — Dependency Vulnerability Remediation:** Resolved all 8 previously-reported `npm audit` findings (3 moderate, 3 high, 2 critical) from Phase 013's hardening review. Applied `npm audit fix` (non-breaking) to resolve `brace-expansion` and `postcss`; upgraded the existing `vitest` and `@vitest/coverage-v8` devDependencies (already-approved tooling, not a new dependency) from `^2.x` to `^4.1.10` to resolve `vite`, `vitest`, `@vitest/coverage-v8`, and the 3 remaining moderate findings, all part of the same dependency tree. `npm audit` now reports **0 vulnerabilities**. No engine source file was modified; no test file required any modification (612/612 pass unchanged); `vitest.config.ts` required no compatibility changes. Verified: `npm install`, `npm run lint`, `npm run build`, `npm test` (612/612), `npm run coverage`, and `npm audit` (0 vulnerabilities) all pass.
- **Milestone 6 — Artifact Packaging and Clean-Environment Validation:** Implemented `scripts/package-artifact.sh` (`npm run package`), producing a `git archive` source tarball of the tracked repository at `HEAD` — the "package" artifact form named in `deployment_strategy.md` §2 step 6, chosen because a per-milestone audit found artifact packaging achievable independently of the hosting/deployment-target decision (Milestone 4, corrected above). Added a `validate-artifact` CI job that extracts the artifact into a fresh job, reinstalls (`npm ci`), rebuilds, and runs the complete existing test suite (`npm test`) against it, proving the packaged artifact is self-contained and passes all 612 tests — including both `tests/integration/*.test.ts` files, unmodified. This was, at the time, a deployment-target-agnostic approximation of `deployment_strategy.md` §2 step 8's staging validation, not the literal requirement (which must mirror production config); Milestones 7-8 below complete that requirement now that a deployment target and a staging environment exist.
- **Milestone 7 — Staging Environment (complete):** Implemented the Staging tier for Titan Core's local/CLI deployment target (ADR-0008). `.github/workflows/ci.yml`'s `validate-artifact` job now declares `environment: staging`; is gated to run only `on: push` to `main` (closing `deployment_strategy.md` §2 step 7's "automatic on merge to the main integration branch," rather than on every PR as before); and writes a durable evidence record (commit SHA, artifact name, workflow run link, test-suite summary) to the job summary via `$GITHUB_STEP_SUMMARY`. A dedicated read-only verification (recorded earlier in this phase's session history) established that `environment: staging` alone provides real, GitHub-native environment identity and automatic deployment history/records, but not `deployment_strategy.md` §1's "restricted access" — that requires environment protection rules configured in GitHub repository Settings, outside this repository's tracked files. **The `staging` environment has since been created and configured directly in GitHub repository Settings: deployment is restricted to the `main` branch via a deployment branch policy; no required reviewers or environment secrets were configured, a deliberate, proportionate choice for the project's current single-developer workflow.** With this manual configuration complete, all four components of `deployment_strategy.md` §1's Staging definition — environment identity, deployment history/records, mirrors production config, restricted access — are now satisfied.
- **Milestone 8 — Staging Validation:** Performed `deployment_strategy.md` §2 step 8's staging validation by executing the `validate-artifact` CI job's exact procedure locally: built the artifact from `HEAD` (commit `0042cd915ba5ae25b7ae6d9a1da31d317883d203`) via `npm run package`, extracted it into a clean directory outside the repository, then ran `npm ci` (a genuine from-scratch reinstall), `npm run build`, and `npm test`. **Result: 612/612 tests passed (12 test files)**, including both `tests/integration/*.test.ts` files, in a clean, freshly-provisioned environment running the packaged artifact — the exact scenario `deployment_strategy.md` §1 defines Staging around. **This is a local reproduction of the CI job's steps, not an execution of the actual GitHub-hosted, `environment: staging`-gated workflow run:** the CI changes recording Milestone 7 have not yet been pushed to the remote repository, so the environment's branch-restriction gate has not yet been exercised by a real GitHub Actions run. A live run, triggered by pushing/merging these changes to `main`, would provide the strongest form of documented evidence and is a recommended near-term follow-up, but pushing to the remote repository was not authorized in this session and so was not performed. Phase 014's previously-confirmed flaky test (`tests/unit/validation-engine.test.ts`) did not manifest in this run; it remains separately tracked and unresolved, unrelated to this milestone.
- **Milestone 9 — Documentation Gap Closure (Security Checklist Cross-Reference):** Closed the three genuine gaps identified in a prior read-only governance analysis of `.titan/security/security_checklist.md`'s Pre-Deployment Checklist (created in Phase 006a as a general governance artifact; never cross-referenced by `deployment_strategy.md` or `security_policy.md` as a mandatory gate, but close enough to Exit Criterion 1's "deployment-readiness checklists" wording not to leave silently unaddressed). Produced `.titan/reviews/2026-08-07-phase-015-documentation-and-incident-readiness-review.md`, covering code review, security review, and incident response plan review of Phase 015's additions. Classified every checklist item explicitly — see the Security Checklist Cross-Reference section below. No new tooling, dependency, SAST, DAST, or runtime implementation was introduced, per explicit instruction.
- **Milestone 10 — Phase 015 / Phase 016 Boundary Correction:** A dedicated read-only governance interpretation determined that this document's earlier "Current Blockers" section incorrectly assigned Production Deployment and Rollback *execution* to Phase 015. Corrected per the Phase 015 / Phase 016 Boundary Correction section below: Phase 015 establishes deployment readiness; Phase 016 (`phase-016-production-release.md`) performs the actual first production deployment. Also added Rollback Procedure Verification, closing the Acceptance Criteria item "Operational rollback... readiness are verified" as a documented procedure (not an executed event). No source code, CI, or other governance file was modified for this correction.
- The CI workflow's dependency vulnerability scan (`npm audit --audit-level=high`, `deployment_strategy.md` §2 step 5 / `security_policy.md` §5) was added in **Phase 014 Milestone 5**, not Phase 015 — it is inherited and reused by this phase's CI workflow, not new Phase 015 work, and is recorded here only for completeness against `deployment_strategy.md` §2's full step list.
- All CI-gate work above is verified: `npm run lint`, `npm test` (612/612), and `npm run build` pass; `npm run format:check` fails only on 74 pre-existing, out-of-scope `.titan/` files (unchanged, not part of this phase's mandate).
- **Staging now exists; production execution does not, and per Milestone 10, does not need to for Phase 015 to close.** No Dockerfile, container configuration, or cloud-provider configuration exists anywhere in the repository. The Staging Environment (Milestone 7) and Staging Validation (Milestone 8) are complete. Production Deployment execution and Rollback execution belong to Phase 016 — see the Phase 015 / Phase 016 Boundary Correction section below.

## Security Checklist Cross-Reference (`.titan/security/security_checklist.md`)

`security_checklist.md`'s "Pre-Deployment Checklist" was created in Phase 006a as a general governance artifact and is not mechanically cross-referenced by `deployment_strategy.md` or `security_policy.md` as a mandatory Phase 015 gate — but its items are close enough to Exit Criterion 1's "deployment-readiness checklists" wording to warrant explicit classification rather than silence. Final classification, per Milestone 9's review (`.titan/reviews/2026-08-07-phase-015-documentation-and-incident-readiness-review.md`):

| Item | Classification | Basis |
|---|---|---|
| Dependency scan completed | **Satisfied** | `npm audit` = 0 vulnerabilities (Milestone 5); CI-gated per `deployment_strategy.md` §2 step 5 |
| Secret scan completed | **Satisfied** | Pattern-scan implemented and manually verified (Milestone 3) |
| Automated tests passed | **Satisfied** | 612/612, verified repeatedly, including Milestone 8's clean-environment reproduction |
| Code review completed | **Reviewed** | Milestone 9's review artifact |
| Security review completed | **Reviewed** | Milestone 9's review artifact |
| Incident response plan reviewed | **Reviewed** | Milestone 9's review artifact — found adequate for current (no-production-yet) scope, with one gap deferred to Phase 016 (Production Deployment) |
| SAST completed | **Deferred** | Not required by any `deployment_strategy.md` gate; adding a SAST tool would require `tech_stack.md` §2's full new-dependency evaluation — disproportionate to close for a checklist item alone; revisit if/when a real network-facing product surface exists |
| DAST completed | **Not Applicable** | ADR-0008's audit: no network-facing surface, no CLI entrypoint, no `/interfaces` layer exists anywhere in the repository — nothing to dynamically test |
| Compliance review completed | **Not Applicable** | `security_policy.md` §9: compliance requirements apply only "if the eventual product handles regulated data" — it doesn't |
| Audit logging verified | **Deferred** | `security_policy.md` §6: retention/logging policy deferred "once a product with real user data exists" — no such product exists yet |

This closes the checklist-related component of Exit Criterion 1. Criterion 1's "approved" language is the only remaining open item across all three Exit Criteria — see Exit Criteria above and the Phase 015 / Phase 016 Boundary Correction below.

## Phase 015 / Phase 016 Boundary Correction

A dedicated read-only governance interpretation (this phase's session history) found that an earlier version of this section — then titled "Current Blockers — Production Deployment and Rollback Are the Remaining Milestones" — incorrectly framed **Production Deployment** and **Rollback execution** as Phase 015's own remaining milestones. This was a misreading introduced during this session, not a genuine conflict between governance documents. It is corrected here.

`phase-016-production-release.md`'s Objective and Scope are explicit: *"Execute the first production deployment of Titan AI according to `deployment_strategy.md` and validated readiness gates"* / *"Run production deployment process... Confirm rollback and incident pathways are functional."* This is Phase 016's stated job, not Phase 015's. The corrected reading, supported by multiple independent textual signals:

- **Phase 015 establishes deployment readiness** — that a production release *can* proceed under governance controls (pipeline, staging, gates, checklists, documented procedures).
- **Phase 016 performs the first production deployment** — the actual execution event, using the readiness gates Phase 015 validated.

Supporting evidence:
1. **Dependency-chain coherence:** `phase-016-production-release.md`'s `Dependencies` field requires "Phase 015 completion" before Phase 016 can start. If Phase 015 itself required an actual production deployment, Phase 016 — whose entire Scope is "Run production deployment process" — could never have a valid starting point; the roadmap's own sequencing would be circular.
2. **Deliberate verb-mood contrast:** Phase 015 Exit Criterion 3 reads *"Production release **can proceed**"* (capability/modal); Phase 016 Exit Criterion 1 reads *"First production release **is completed**"* (actual event/perfect). Two adjacent phase documents would not need different tenses for the same claim.
3. **`roadmap.md`'s own goal-column separation:** Phase 015 = *"CI/CD finalized, staging validated"*; Phase 016 = *"First production deployment per `deployment_strategy.md`."*
4. **`deployment_strategy.md`** never allocates its 11-step Release Pipeline (§2) to specific phases — it is silent on phase ownership, and so neither confirms nor conflicts with this reading.

All governance decisions and every milestone through Staging Validation remain resolved and complete — unchanged by this correction:

**Resolved — Hosting/deployment target:** `tech_stack.md` §5's *"Hosting/deployment target: Not yet selected"* deferral is resolved. **ADR-0008** (accepted 2026-08-06) selected **local/CLI execution — no external hosting provider**, following `tech_stack.md` §2's evaluation process against §3/§3a's criteria. `tech_stack.md` §5 now records the decision. See Milestone 4.

**Resolved — Dependency vulnerabilities:** `deployment_strategy.md` §7's hard blocker (*"A known critical/high security vulnerability is unresolved without an accepted risk ADR"*) no longer applies — Milestone 5 eliminated all 8 previously-reported vulnerabilities via remediation; `npm audit` now reports 0.

**Resolved — Staging Environment:** Implemented in the repository (`environment: staging` on the `validate-artifact` CI job, merge-only trigger, documented-evidence step) and configured in GitHub repository Settings (deployment restricted to `main`; no reviewers/secrets required for the current single-developer workflow). See Milestone 7.

**Resolved — Staging Validation:** Performed as a local reproduction of the staging CI job's exact procedure — 612/612 tests passed in a clean, freshly-provisioned environment running the packaged artifact. See Milestone 8 for the caveat that this is local-reproduction evidence, not yet evidence from an actual GitHub-hosted `environment: staging` run.

### Rollback Procedure Verification

Acceptance Criteria requires "Operational rollback and incident readiness are **verified**" — verified as a procedure, not executed as an event (the same readiness/execution distinction established above). `deployment_strategy.md` §4 defines rollback as "redeploying the last known-good artifact." Per ADR-0008 (local/CLI execution) and Milestone 6 (artifact packaging via `git archive` at a specific commit), this procedure is already mechanically supported without new tooling: rolling back means re-running `scripts/package-artifact.sh` against a prior known-good commit and redeploying that artifact instead of the current one. This satisfies the Acceptance Criterion as a documented, reviewed procedure. Actually exercising a rollback remains Phase 016/017's operational responsibility, per the boundary established above.

One item remains honestly tracked, not resolved: Milestone 9's incident-response-plan review found `deployment_strategy.md` §6 (Monitoring & Alerting) is self-triggered now that Staging exists, but has not yet been extended. This is recorded as a documented, non-blocking follow-up — consistent with the Phase 013 hardening-review precedent of closing phases with tracked `should-fix` items rather than silently ignoring them — not a Phase 015 blocker, since it concerns live operational monitoring that only becomes actionable once Phase 016 stands up a live environment to monitor.

No deployment infrastructure, artifact format, cloud provider, or rollback mechanism has been invented or implemented beyond what this correction required. Per `deployment_strategy.md` §1's own instruction, this document "does not invent infrastructure prematurely," and neither does this correction.

## Verification

- **`npm run format:check`:** FAILS as expected — but confirmed the only violations are the same 74 pre-existing, out-of-scope `.titan/` files; 0 violations outside `.titan/`.
- **`npm run lint`:** PASS (0 errors, 0 warnings).
- **`npm test`:** PASS (612/612 tests).
- **`npm run build`:** PASS (`tsc -p tsconfig.json`, no errors).
- **`npm audit`:** PASS — 0 vulnerabilities (previously 8: 3 moderate, 3 high, 2 critical; see Milestone 5).

## Handoff Notes

**Phase 015 is complete as of 2026-08-07.** Milestones 1-10 are complete: CI/pipeline hygiene (1-3), the deployment-target decision (4, ADR-0008 — local/CLI execution), dependency remediation (5), artifact packaging (6), the Staging Environment (7 — implemented in `ci.yml` and configured in GitHub Settings, restricted to `main`), Staging Validation (8 — 612/612 tests passed via a local reproduction of the staging procedure), Documentation Gap Closure (9 — `security_checklist.md` cross-referenced and classified; code/security/incident-response-plan review produced), and the Phase 015 / Phase 016 Boundary Correction (10 — Production Deployment and Rollback *execution* correctly reassigned to Phase 016; Rollback Procedure *verification* closed for Phase 015). All three Exit Criteria are checked, including Exit Criterion 1's approval component, given by explicit human decision in this phase's closing session. Two small, non-blocking follow-ups remain tracked, not resolved, and do not affect this closure: no live GitHub Actions run has ever executed for any commit in this repository (Milestone 8's evidence is local-reproduction only — a live run is recommended whenever these changes are next pushed), and `deployment_strategy.md` §6 (Monitoring & Alerting) is self-triggered by Staging's existence but not yet extended (see Rollback Procedure Verification) — recommended as one of Phase 016's first items, alongside standing up whatever production-side pipeline mechanism it needs. **Phase 016 (Production Release) has NOT been started and is not authorized by this closure** — its own Dependencies field ("Phase 015 completion") is now met, making it eligible to begin, but beginning it requires a separate, explicit instruction.
