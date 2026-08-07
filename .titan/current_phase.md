# CURRENT PHASE

**Document Class:** Live Status
**Authority:** Must always match the "in-progress" row in `roadmap.md` and the `current_phase` field in `project_state.json`. If any of the three disagree, treat this file as suspect and reconcile against `roadmap.md` (the canonical sequence) and `sessions/` (the actual history) before trusting any single source.

---

## Active Phase

- **Phase ID:** 016
- **Name:** Production Release
- **Status:** in-progress
- **Started:** 2026-08-07
- **Completed:** 

**Phase 016 began 2026-08-07, explicitly authorized.** Milestones 1-6 (CI restoration, production promotion mechanism, deploy mechanics, post-deploy verification, monitoring/alerting policy, rollback exercise) are implemented and verified — see `phases/phase-016-production-release.md`. **The actual first production release has not occurred.** No agent working this repository has authenticated GitHub write/dispatch access; the `deploy-production` job requires a human to trigger it via the GitHub Actions UI. Do not mark Phase 016 complete, and do not begin Phase 017, until that live run has happened and its evidence has been confirmed.

## Prior Phase Completed

- **Phase ID:** 015
- **Name:** Deployment Readiness
- **Status:** complete
- **Completed:** 2026-08-07

## Exit Criteria (current phase — 016)

- [ ] First production release is completed and validated.
- [ ] Post-release health checks meet defined operational thresholds.
- [ ] Transition to maintenance phase is documented.

**None checked.** All three require an actual live `deploy-production` run, which has not happened. See `phases/phase-016-production-release.md`'s Milestone History for everything that has been built and verified in preparation.

## Next Phase

- **Phase ID:** 017
- **Name:** Maintenance & Continuous Improvement
- **Status:** not-started
- **Entry Criteria:** Phase 016 completion — not met (Phase 016 is in-progress, not complete).
- **What the next agent should do first:** Not applicable yet — Phase 016 must complete first (see Notes).

## Notes

- **Phase 016 (Production Release) is in-progress**, started 2026-08-07. Milestones 1-6 are implemented and verified to the fullest extent possible: (1) CI Restoration — the GitHub Actions pipeline had never completed successfully for any commit in this repository's history (a hard `format:check` gate failed on 75 pre-existing `.titan/` files, cascading to skip everything downstream); fixed with a one-line `.prettierignore`, plus an unrelated newly-disclosed `js-yaml` advisory via non-breaking `npm audit fix`; confirmed live-green on GitHub for the first time. (2-4) Production Environment, Deploy Mechanics, Post-Deploy Verification — a `deploy-production` job added to `ci.yml`, triggered only by `workflow_dispatch` (never automatic, by construction), reusing the exact artifact staging already validated rather than rebuilding it, combining "deploy" and "verify" into one act since ADR-0008 means there's no live service to separately health-check. (5) Monitoring & Alerting Policy — `deployment_strategy.md` §6 extended with a policy grounded in what exists (CI pass/fail as the health signal, single-owner on-call, GitHub's default log retention), no new tooling. (6) Rollback Exercise — actually performed, not just described: packaged and fully verified (build + 612/612 tests) a prior known-good commit's artifact, confirming the rollback mechanism works; logged in `sessions/2026-08-07-1500-phase-016-production-release-kickoff.md`.
- **No production deployment has occurred.** No agent working this repository has authenticated GitHub write/dispatch access (no `gh` CLI, no API token — only unauthenticated public reads and ordinary `git push`). The `deploy-production` job was deliberately designed, by explicit agreement with the project owner, so only a human with repository access can trigger it via the GitHub Actions UI. **This is the sole remaining blocker to closing Phase 016.**
- **The Phase 015 / Phase 016 boundary** (established during Phase 015's closure, unaffected by this work): Phase 015 established deployment readiness; Phase 016 performs the actual first production deployment. Full reasoning in `phases/phase-015-deployment-readiness.md`'s Phase 015 / Phase 016 Boundary Correction section.
- Phase 015 (Deployment Readiness) is complete (2026-08-07) — see `changelog.md` and `phases/phase-015-deployment-readiness.md`.

## Instructions for Whoever Reads This Next

1. Phases 000–015 are complete. Phase 016 (Production Release) is **in-progress**: Milestones 1-6 done, the live production trigger is the only thing missing.
2. **Check whether the project owner has triggered `deploy-production`** via the GitHub Actions UI (Actions tab → CI workflow → "Run workflow" on `main`). If yes: pull that run's "Production Release Evidence" job summary and run URL, confirm success, check all three Exit Criteria in this file and in `phases/phase-016-production-release.md`, add the release's `changelog.md` entry, fill in both documents' `Completed` dates, update `project_state.json`/`roadmap.md`, and only then mark Phase 016 complete.
3. **Do not begin Phase 017** until Phase 016 is genuinely complete per the above.
4. If you are picking this project back up after a long gap, also skim the last 2–3 files in `sessions/` for tacit context not yet promoted into these governance docs.
