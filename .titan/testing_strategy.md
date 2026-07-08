# TESTING STRATEGY

**Document Class:** Technical Governance
**Authority:** Subordinate to `architecture.md`. Enforced as a merge/release gate via `deployment_strategy.md`.
**Purpose:** Defines what "adequately tested" means in this project, so that no agent can claim a task is "Done" (per `constitution.md` Section 5) without meeting these bars.

---

## 1. The Testing Pyramid

```
        /\
       /  \    E2E (few, slow, high confidence on critical paths)
      /----\
     /      \  Integration (moderate count, real boundaries, mocked externals)
    /--------\
   /          \ Unit (many, fast, isolated, cover domain logic thoroughly)
  /------------\
```

- **Unit tests** dominate in number. They test pure logic in isolation (especially `/domain`), run in milliseconds, and require no network/filesystem/database.
- **Integration tests** verify that modules work together correctly across a real boundary (e.g., application layer + real database in a test container), with external third-party services mocked/stubbed.
- **End-to-end (E2E) tests** are few and cover only the critical user journeys, run against a fully assembled system (or close to it).

## 2. Coverage Expectations

- **Domain/business logic (`/domain`):** target ≥90% line coverage; this is the highest-value, lowest-cost-to-test code.
- **Application layer:** target ≥80% coverage, focused on use-case correctness including error paths.
- **Infrastructure/integration code:** covered primarily by integration tests rather than unit tests with heavy mocking; aim for coverage of realistic failure modes (timeouts, malformed responses), not just happy paths.
- **UI/interface layer:** covered by a mix of component tests and a small number of E2E tests on critical flows; 100% coverage here is not the goal — critical-path confidence is.
- **Coverage percentage is a signal, not the goal.** A high percentage from trivial assertions is worse than a lower percentage from meaningful ones. Reviewers should read test *quality*, not just the number.

## 3. What Must Always Be Tested

1. Every bug fix must include a regression test that fails without the fix and passes with it.
2. Every new public function/method in `/domain` and `/application` needs at least: one happy-path test, one edge-case test, one error-path test.
3. Security-sensitive code (auth, input validation, permission checks) requires explicit tests for the "attacker" path, not just the legitimate-user path.
4. Any place where `coding_standards.md` flags a fabricated/stubbed implementation must have a test (or explicit TODO test) marking it as not-yet-real, so it cannot silently pass as complete.

## 4. Test Independence & Reliability

- Tests must not depend on execution order or shared mutable global state.
- Tests must not depend on real network calls to third-party services; use fakes/mocks/test doubles or record/replay fixtures.
- Flaky tests are treated as bugs — a flaky test is quarantined (marked, tracked) and fixed promptly, never just re-run until it passes.
- Tests must be deterministic: no reliance on real wall-clock time, random values, or external state without seeding/mocking.

## 5. Test Data

- Never use real user data (especially PII) in test fixtures. Use realistic but synthetic data.
- Fixtures/factories should be reusable and centrally defined (avoid duplicating hand-built objects across many test files).

## 6. CI Gate

Per `deployment_strategy.md`, CI must run and pass before merge:

1. Linting/formatting checks.
2. Full unit test suite.
3. Integration test suite (may run less frequently than on every commit if slow, but at minimum before merge to the main branch).
4. Dependency vulnerability scan (see `security_policy.md`).
5. Coverage report generated and checked against the thresholds in Section 2 (warn, don't necessarily hard-block, on first pass — hard-block once the project matures past Phase 005).

## 7. What This Strategy Does Not Yet Cover

Performance/load testing and chaos/resilience testing are deferred until the system has a concrete architecture and expected load profile (Phase 003+). When that phase begins, this document should be extended with specific performance budgets and load-test scenarios rather than left generic.
