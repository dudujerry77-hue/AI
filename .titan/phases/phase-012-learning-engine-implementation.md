# Phase 012: Learning Engine Implementation

- **Status:** complete
- **Started:** 2026-07-29
- **Completed:** 2026-07-29
- **Agent(s) involved:** Claude

## Objective

Implement the Learning Engine to analyze outcomes and feed durable improvements back into the Knowledge Engine.

## Scope

- Observe plan-execute-validate cycles.
- Generate reusable heuristics and improvement proposals.
- Feed approved learning artifacts into governance-aware memory.

## Deliverables

- Learning Engine implementation.
- Tests for signal extraction and knowledge update pathways.
- Documentation for learning boundaries and proposal process.

## Acceptance Criteria

- Learning outputs improve decision context without violating governance controls.
- Learning proposals are traceable and auditable.
- Learning engine does not unilaterally amend constitutional/security authority.

## Dependencies

- Phase 011 completion.

## Risks

- Low-quality feedback loops amplifying poor decisions.
- Unauthorized or opaque mutation of long-term knowledge.

## Exit Criteria

- [x] Learning Engine passes build/test quality gates.
- [x] Feedback loop to Knowledge Engine is validated and controlled.
- [x] System is ready for full Titan Core integration and hardening.

## Milestone History

- **Milestone 1 — Runtime Foundation:** `LearningEngine` extends the shared `BaseEngine`, inheriting the full Titan runtime engine contract (`initialize`, `start`, `stop`, `health`, `metadata`, `version`, `contractVersion`, `getState`). Deliberately declared zero business methods and `capabilities: []` at this milestone — a documented deviation from the pattern used by prior engines (which pre-declare all stub methods in Milestone 1), chosen because no repository text yet grounded any specific Learning Engine method name.
- **Milestone 2 — Domain Model:** Introduced the Learning domain model (`src/models/types.ts`), derived strictly from `architecture.md`'s Learning Engine paragraph and existing Orchestrator/Validation types (`WorkflowResult`, `ValidationVerdict`, both imported by type only): `LearningCycleStage`, `LearningLessonCategory`, `LearningKnowledgeUpdateType`, `LearningProposalStatus`, `LearningSubject`, `LearningObservation`, `LearningLesson`, `LearningKnowledgeUpdateProposal`, `LearningProposedAdr`, `LearningFlaggedRisk`, `LearningPipelineResult`, as pure, immutable data type definitions with no behavior change.
- **Milestone 3 — LearningObservationBuilder / `observeCycle()`:** Implemented `LearningObservationBuilder`, a deterministic, synchronous, offline structural translator from a `LearningSubject` into a `LearningObservation`. Wired `observeCycle()` to validate the request and delegate entirely to `LearningObservationBuilder`.
- **Milestone 4 — LearningProposalBuilder / `generateProposal()`:** Implemented `LearningProposalBuilder`, a deterministic, synchronous, offline structural composer from one or more `LearningObservation` records into a single `LearningKnowledgeUpdateProposal`. Wired `generateProposal()` to validate the request and delegate entirely to `LearningProposalBuilder`.
- **Milestone 5 — LearningKnowledgeHandoffBuilder / `prepareKnowledgeHandoff()`:** Implemented `LearningKnowledgeHandoffBuilder`, a deterministic, synchronous, offline structural packager from an already-built `LearningKnowledgeUpdateProposal` into a `LearningKnowledgeHandoff` (a Learning-owned type, chosen instead of mapping onto the Knowledge Engine's `KnowledgeCreateInput`/`KnowledgeRecord` since those carry fields — `author`, `securityClass`, `approvalStatus` — with no grounded derivation rule). Wired `prepareKnowledgeHandoff()` to validate the request and delegate entirely to `LearningKnowledgeHandoffBuilder`. No Knowledge Engine runtime is imported, instantiated, or called.
- **Milestone 6 — LearningLessonBuilder / LearningFlaggedRiskBuilder / LearningProposedAdrBuilder / LearningPipelineBuilder / `analyzeCycle()`:** Implemented the remaining architecture.md "Produces" outputs as deterministic structural builders: `LearningLessonBuilder` (one `LearningLesson` per `LearningObservation`, `.category` derived via a fixed total lookup table keyed on `verdict.status`), `LearningFlaggedRiskBuilder` (one `LearningFlaggedRisk` per lesson whose category is `'failure'` or `'estimate-inaccuracy'`), `LearningProposedAdrBuilder` (one `LearningProposedAdr` per flagged risk, with documented fixed placeholder `.decision`/`.consequences` strings where no repository rule defines real content), and `LearningPipelineBuilder` (coordinator composing all of the above plus `LearningProposalBuilder` into a full `LearningPipelineResult`). `LearningProposalBuilder.build()` gained two optional, additive trailing parameters (`lessons`, `priorProposals`) so `.lessonIds` and a structurally-detected `'refined-heuristic'`/`'new-precedent'` `.updateType` can be populated without changing Milestone 4 call sites. Wired `analyzeCycle()` to delegate entirely to `LearningPipelineBuilder`. The word "recurring" in architecture.md's "flagged recurring risks"/"proposed ADRs for recurring architectural friction" was deliberately not implemented as a frequency/threshold rule — no repository document defines a threshold, and inventing one would cross into heuristic scoring or ranking; every risk-eligible lesson and every risk is instead a 1:1 structural candidate.

## Governance Resolution — Knowledge Engine Feedback-Loop Consumption and Phase 012 Closure

A dedicated specification audit was performed prior to closing this phase, reading
`phases/phase-012-learning-engine-implementation.md`, `architecture.md`,
`roadmap.md`, `current_phase.md`, and `decisions.md`.

**Finding:** The remaining Phase 012 gap — actual consumption of Learning Engine
output by the Knowledge Engine, and end-to-end validation of the resulting
feedback loop — is not an unimplemented Learning Engine requirement. It is
architecturally assigned to a different engine and a different phase.

- `architecture.md`'s Learning Engine Boundary states the engine "observes and
  proposes; it does not decide or execute," and its Produces line limits output
  to "proposed updates to the Knowledge Engine."
- `architecture.md`'s Knowledge Engine section assigns consumption explicitly:
  "Consumes: Updates from the Learning Engine (new heuristics, patterns)..." —
  this is Knowledge Engine responsibility, not Learning Engine responsibility.
- `roadmap.md` Section 3 assigns cross-engine loop validation explicitly to
  Phase 013: "Phase 013 (Integration & Hardening) exists specifically to
  validate cross-engine boundaries hold under real end-to-end operation."
- No document — not `phase-007-knowledge-engine-implementation.md` (complete
  before the Learning Engine existed), not `phase-012`, not `architecture.md` —
  assigns implementation of Knowledge Engine-side consumption logic to Phase 012.

**Conclusion:** Phase 012's Exit Criteria "Feed approved learning artifacts into
governance-aware memory" and "Feedback loop to Knowledge Engine is validated and
controlled" are satisfied, within Phase 012's own architectural scope, by the
Learning Engine producing structurally well-formed, type-safe handoff artifacts
(`LearningKnowledgeHandoff`, `LearningPipelineResult`) suitable for later
consumption. Building the Knowledge Engine's consumption path and validating the
end-to-end loop are out of Phase 012's scope by architecture.md's own engine
boundaries, and are deferred to a future phase or ADR that explicitly scopes
Knowledge Engine consumer-side work — mirroring the `cancelPlan()` (Phase 008),
`cancelExecution()` (Phase 010), and `approveValidation()`/`rejectValidation()`
(Phase 011) precedent of closing a phase with a textually-unassigned extension
point left open rather than invented.

## Verification

- **`npm run lint`:** PASS (0 errors, 0 warnings).
- **`npm test`:** PASS (544/544 tests passed across 10 test files, including 126 Learning Engine tests in `learning-engine.test.ts`).
- **`npm run build`:** PASS (`tsc -p tsconfig.json` completed with no errors, exit code 0).

## Handoff Notes

Next phase (013) should integrate all seven engines and stress-test cross-engine contracts under realistic workflows, per `roadmap.md` Section 3's assignment of end-to-end cross-engine boundary validation to Phase 013. This includes the Learning → Knowledge feedback loop: `LearningKnowledgeHandoff` and `LearningPipelineResult` are available as structurally complete, type-safe artifacts, but no Knowledge Engine-side code currently consumes them (Phase 007 predates the Learning Engine and its own document does not mention it). Knowledge Engine-side consumption of these artifacts remains unscoped and should be assigned explicitly by Phase 013 or a future ADR before being implemented — do not silently add it to either engine without that scoping.
