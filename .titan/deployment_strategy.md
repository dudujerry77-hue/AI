# DEPLOYMENT STRATEGY

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md` and `testing_strategy.md`. Enforces both as hard gates before any deployment.
**Purpose:** Defines environments, release process, and rollback strategy so that shipping is safe, repeatable, and never dependent on a specific agent "remembering how we usually do it."

---

## 1. Environments

| Environment | Purpose | Data | Access |
|---|---|---|---|
| Local/Development | Individual agent/developer iteration | Synthetic/fake data only | Full access, least stability guarantee |
| CI (ephemeral) | Automated verification per commit/PR | Ephemeral test data | No human access needed; fully automated |
| Staging | Pre-production validation, mirrors production config | Anonymized or synthetic data resembling production shape | Restricted; used for final validation |
| Production | Live system used by real users | Real data | Most restricted; changes only via the release process below |

Until a concrete product exists, these are the required environment tiers to establish once Phase 004 (Environment & Tooling Setup) begins — this document does not invent infrastructure prematurely.

## 2. Release Pipeline (CI/CD)

Every change destined for `staging` or `production` must pass through this pipeline, in order:

1. **Commit/PR opened** → CI triggers automatically.
2. **Static checks:** lint, format check, type check (if applicable).
3. **Unit tests:** must pass at 100% (no skipped/ignored tests without explicit, reviewed justification).
4. **Integration tests:** must pass.
5. **Security scan:** dependency vulnerability scan per `security_policy.md`; secrets-scanning of the diff.
6. **Build:** produce the deployable artifact (container image, bundle, package) exactly once, and promote that same artifact through later stages rather than rebuilding per environment.
7. **Deploy to staging:** automatic on merge to the main integration branch.
8. **Staging validation:** smoke tests / critical-path E2E tests run against staging.
9. **Manual promotion to production:** requires explicit human (or designated release-authority agent) approval — production deploys are never fully automatic without a human gate, at minimum in early project phases.
10. **Production deploy:** using the same artifact validated in staging.
11. **Post-deploy verification:** health checks, error-rate monitoring for a defined bake-in period.

## 3. Branching & Release Model

- `main` (or `trunk`) is always deployable to staging.
- Feature work happens on short-lived branches named per `naming_conventions.md`, merged via PR after CI passes and review criteria in `reviews/` are met.
- Production releases are tagged using semantic versioning (`vMAJOR.MINOR.PATCH`) once the project has a public/versioned interface; until then, `changelog.md` entries suffice for tracking.

## 4. Rollback Strategy

- Every deployable artifact must be traceable to an exact commit and changelog entry.
- Rollback = redeploying the last known-good artifact, not "reverting forward" under pressure with untested code.
- Database migrations must be written to be reversible where feasible; irreversible migrations require an explicit ADR and a tested rollback/mitigation plan before being applied to production.
- A rollback event must always be logged in `sessions/` and, if it reveals a process gap, discussed in a new ADR.

## 5. Configuration & Secrets Across Environments

- Configuration values differ by environment but are managed through the same Config Manager pattern (see `architecture.md`), never hardcoded per environment in application code.
- Secrets per environment are stored in that environment's secrets manager; production secrets are never copied into lower environments, and lower-environment secrets are never real production credentials.

## 6. Monitoring & Alerting (Established Once Live)

Once a system reaches staging/production, this section must be extended to define:
- Key health/error metrics and their alert thresholds.
- On-call/response expectations for production incidents.
- Log retention and access policy (consistent with `security_policy.md`).

## 7. Deployment Gate Summary (Hard Blockers)

A deployment to production must be blocked if any of the following are true:
- Any test in the required suite is failing.
- A known critical/high security vulnerability is unresolved without an accepted risk ADR.
- The change has no corresponding `changelog.md` entry.
- The change was not validated in staging first (except for a documented, human-approved emergency hotfix process, which must still pass automated tests).
