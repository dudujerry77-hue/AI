# Session Log: Phase 016 Kickoff — CI Restoration and Production Deploy Mechanism

- **Date:** 2026-08-07
- **Agent:** Claude
- **Phase:** 016 — Production Release

## What Was Done

**Milestone 1 (CI Restoration):** Root-caused the GitHub Actions pipeline never completing on any recent commit — `prettier --check .` (the `Format check` step) failed on 75 pre-existing `.titan/` files, and because it is a hard gate, every step after it (tests, build, coverage, dependency audit, secrets scan, and the entire staging job) was skipped on every run. Added `.prettierignore` scoping the check to exclude `.titan/`, preserving the standing governance decision that `.titan/` is not repository-formatted. Also fixed an unrelated, newly-disclosed high-severity advisory (CVE-2026-59870, `js-yaml`, transitive via `eslint`) with a non-breaking `npm audit fix`. Pushed and confirmed live on GitHub: the pipeline completed successfully end-to-end for the first time in this repository's history, including the staging job actually executing (not skipped).

**Milestones 2-4 (Production Environment, Deploy Mechanics, Post-Deploy Verification):** Added a `deploy-production` job to `.github/workflows/ci.yml`, triggered only by `workflow_dispatch` — a human must explicitly select a ref and run it; it can never fire automatically on a push or PR, satisfying `deployment_strategy.md` §2 step 9's "never fully automatic" requirement by construction. On dispatch, the full pipeline runs in one continuous execution (quality-gates → staging validation → production), and `deploy-production` reuses the *exact* artifact `validate-artifact` already built via `actions/upload-artifact`/`download-artifact`, rather than rebuilding it (§2 step 6). Steps 10 (production deploy) and 11 (post-deploy verification) are combined into one job: per ADR-0008, there is no running, network-facing service to separately monitor post-deploy, so "deploy" and "confirm it's healthy" collapse to the same act — reinstall and re-run the full test suite against the promoted artifact, then record a "Production Release Evidence" summary (commit SHA, actor, run link, test results) to the job summary. The `production` GitHub environment will auto-create on first dispatch (same pattern as `staging`); adding required-reviewer protection to it afterward is a recommended, optional hardening step, not required for the "never automatic" property.

**Milestone 5 (Monitoring & Alerting Policy):** Extended `deployment_strategy.md` §6, which was self-triggered but unactioned since Phase 015's Staging environment went live. Defined metrics/thresholds, on-call, and log-retention policy grounded in what actually exists for this deployment target (ADR-0008: no live service) — CI pipeline pass/fail as the health signal, the single repository owner as sole responder via GitHub's native failure notifications, and GitHub Actions' default log retention. No new tooling introduced.

**Milestone 6 (Rollback Exercise):** Actually exercised the rollback procedure `deployment_strategy.md` §4 documents (not just described it): packaged the last known-good commit prior to this session's work (`3b4d2df`, the Phase 015 closure commit) via `git archive`, extracted it into a clean directory, and ran `npm ci` / `npm run build` / `npm test` against it. Result: build clean, 612/612 tests pass — the rollback mechanism works. Also surfaced an honest, useful finding: `npm audit` against that commit shows the `js-yaml` advisory again, since it predates Milestone 1's fix — a real, worth-noting operational consequence of rolling back to that specific point, not a defect in the mechanism.

## Why

Phase 016's objective is to execute Titan AI's first production deployment safely, per `deployment_strategy.md` and the readiness gates Phase 015 established. Milestone 1 was a hard prerequisite discovered during Phase 016's own kickoff audit: the live pipeline had never actually completed, so nothing downstream could be verified with real (not just local) evidence. Milestones 2-6 build the promotion mechanism, its governance policy, and prove the rollback path — everything short of the live production trigger itself.

## What Remains

**The actual first production release has not occurred.** I have no authenticated GitHub write/dispatch access (no `gh` CLI, no API token — only unauthenticated public reads and ordinary `git push`, both used throughout this project). Per explicit agreement with the project owner, the `deploy-production` job is deliberately built so that only a human with repository access can trigger it (`workflow_dispatch`), and that trigger has not yet been pulled. Phase 016 Exit Criterion 1 ("First production release is completed and validated") cannot be honestly checked until that happens. Milestone 7 (Governance Closure) records this state precisely rather than overclaiming.

## Risks / Open Items

- The `production` GitHub environment does not yet exist and will auto-create, unprotected, on first dispatch — adding required-reviewer protection afterward is recommended defense-in-depth, not yet done (mirrors `staging`'s own history).
- `phases/README.md`'s index still shows Phase 015 as `in-progress` — a pre-existing, previously-flagged staleness, still not fixed (out of scope each time it's been noted).
- Rolling back to a commit predating Milestone 1 reintroduces the `js-yaml` advisory until re-remediated — now documented, not a live issue today.

## Next Agent Should

Confirm whether the project owner has triggered `deploy-production` via the GitHub Actions UI. If yes, pull the live run's evidence (job summary, run URL) and complete Milestone 7's final closure (check Exit Criteria, update `changelog.md` with the real release record). If not yet triggered, Phase 016 remains implementation-complete but not closed — do not mark it complete.
