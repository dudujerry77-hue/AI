# Phase 016: Production Release

- **Status:** in-progress
- **Started:** 2026-08-07
- **Completed:** 
- **Agent(s) involved:** Claude

## Objective

Execute the first production deployment of Titan AI according to `deployment_strategy.md` and validated readiness gates.

## Scope

- Run production deployment process.
- Monitor release health and key operational indicators.
- Confirm rollback and incident pathways are functional.

## Deliverables

- Production release execution record.
- Post-release validation and monitoring summary.
- Changelog and governance updates for release milestone.

## Acceptance Criteria

- Deployment workflows are reproducible and policy-compliant.
- Production deployment completes successfully with no unmanaged critical incidents. **Not yet evidenced — see Exit Criteria.**
- Core Titan workflows are operational post-release. **Not yet evidenced — see Exit Criteria.**
- Release evidence and governance traceability are complete for all mechanism/policy work performed (Milestones 1-6); pending for the release event itself.

## Dependencies

- Phase 015 completion. **Met** (2026-08-07).

## Risks

- Production-only defects not visible in staging.
- Operational alerting/response gaps during initial rollout.
- No authenticated GitHub write/dispatch access is available to any agent working this repository (confirmed during this phase) — the actual production trigger can only be pulled by a human with repository access, via the GitHub Actions UI or their own authenticated tooling.

## Exit Criteria

- [ ] First production release is completed and validated.
- [ ] Post-release health checks meet defined operational thresholds.
- [ ] Transition to maintenance phase is documented.

**None are checked.** All three depend on an actual live `deploy-production` run having occurred, which has not happened — see Milestone History and Handoff Notes. The mechanism, policy, and rollback path are built and verified to the fullest extent possible without that live event.

## Milestone History

- **Milestone 1 — CI Restoration:** Root-caused the GitHub Actions pipeline never completing on any recent commit: `prettier --check .` failed on 75 pre-existing `.titan/` files (deliberately unformatted, per standing governance decision), and as a hard gate this skipped every downstream step — tests, build, coverage, audit, secrets scan, and the entire staging job — on every run in this repository's history. Fixed with a single-line `.prettierignore` scoping the check to exclude `.titan/`; evaluated and rejected CLI-glob scoping (fragile, diverges local/CI behavior), `continue-on-error` (masks real problems), and reformatting `.titan/` (explicitly excluded by governance). Also fixed an unrelated, newly-disclosed high-severity advisory (CVE-2026-59870, `js-yaml`, transitive via `eslint`, devDependency-only) via a non-breaking `npm audit fix` (`package-lock.json` only, no `package.json` change). **Verified live on GitHub** (commit `0f16635`): the pipeline completed successfully end-to-end for the first time ever recorded for this repository — both `quality-gates` and the staging job (`validate-artifact`) succeeded, every step.
- **Milestones 2-4 — Production Environment, Deploy Mechanics, Post-Deploy Verification (combined, one `ci.yml` change):** Added a `deploy-production` job triggered only by `workflow_dispatch` — by construction, it cannot fire automatically on any push or PR, satisfying `deployment_strategy.md` §2 step 9's "never fully automatic" requirement without depending on external GitHub Settings configuration. On dispatch, the full pipeline runs in one continuous execution; `deploy-production` reuses the exact artifact `validate-artifact` already built in the same run via `actions/upload-artifact`/`download-artifact`, honoring §2 step 6's "build exactly once... promote that same artifact." Steps 10 (deploy) and 11 (post-deploy verification) are combined: per ADR-0008, there is no running service to separately health-check post-deploy, so the job reinstalls and re-runs the full test suite against the promoted artifact as the verification act, then records a "Production Release Evidence" summary (commit, actor, run link, test results) to the job summary — satisfying the Deliverable "Production release execution record." The `production` GitHub environment will auto-create (unprotected) on first dispatch, mirroring `staging`'s own history; adding required-reviewer protection afterward is a recommended, optional hardening step. **Verified locally** to the fullest extent possible without live dispatch access: every shell command the job runs (extract, `npm ci`, `npm run build`, `npm test`) was executed directly against a locally-built copy of the same artifact — clean build, 612/612 tests. `download-artifact`/`upload-artifact` themselves are standard, official GitHub Actions, used per their documented interface; YAML validity confirmed via `js-yaml` parse.
- **Milestone 5 — Monitoring & Alerting Policy:** Extended `deployment_strategy.md` §6, self-triggered since Phase 015's Staging environment went live but left unactioned until now. Defined metrics (CI pipeline pass/fail as the health signal — no live service exists to emit uptime/error-rate telemetry per ADR-0008), on-call (the single repository owner, via GitHub's native failure notifications — no rotation, no new tool), and log retention (GitHub Actions' default retention, consistent with `security_policy.md` §6's no-secrets-in-logs principle, which the evidence-recording steps already honor). No new tooling or dependency introduced.
- **Milestone 6 — Rollback Exercise:** Actually exercised (not merely described) the rollback procedure `deployment_strategy.md` §4 defines: packaged the last known-good commit prior to this phase's work (`3b4d2df`, Phase 015's closure commit) via `git archive`, extracted it into a clean directory, and ran the full verification suite against it. **Result: build clean, 612/612 tests pass — the rollback mechanism works.** Also surfaced an honest, documented finding: `npm audit` against that commit reproduces the `js-yaml` advisory Milestone 1 fixed, since that commit predates the fix — a real, worth-knowing consequence of rolling back to that specific point, not a defect in the rollback mechanism itself. Logged in `.titan/sessions/2026-08-07-1500-phase-016-production-release-kickoff.md`, per §4's "a rollback event must always be logged in `sessions/`."
- **No Production Deployment has occurred.** This is the honest, load-bearing fact governing this phase's status. No agent working this repository has authenticated GitHub write/dispatch access (`gh` CLI is not installed; no API token is available) — only unauthenticated public reads and ordinary `git push`, both used throughout this project. The `deploy-production` job was deliberately designed, by explicit agreement with the project owner, so that only a human with repository access can trigger it. That trigger has not yet been pulled.

## Handoff Notes

**Phase 016 is in-progress, not complete.** Milestones 1-6 are implemented and verified to the fullest extent possible without live production-dispatch access: the CI pipeline is restored and confirmed live-green for the first time in this repository's history; the production promotion mechanism, deploy mechanics, and post-deploy verification are built into `.github/workflows/ci.yml` and locally verified; the monitoring/alerting policy gap is closed; the rollback procedure has been genuinely exercised and confirmed functional. **None of Phase 016's three Exit Criteria can be honestly checked yet** — all three require an actual live production release, which has not happened. To finish Phase 016: a human with repository access must trigger the `deploy-production` job via the GitHub Actions "Run workflow" button (or their own authenticated `gh`/API access), selecting the `main` branch. Once that run completes, whoever picks this up next should pull the live evidence (the run's "Production Release Evidence" job summary and run URL), confirm the job succeeded, check all three Exit Criteria, add the release's `changelog.md` entry, fill in this document's `Completed` date, and only then mark Phase 016 complete. **Do not begin Phase 017** until that has happened — Phase 017's own entry criteria require Phase 016 completion, which has not occurred.