# Learning Engine

Milestone 6 package for the Titan Core Learning Engine: deterministic
structural builders for observations (Milestone 3), proposals
(Milestone 4), Knowledge Engine handoffs (Milestone 5), and — new in
Milestone 6 — lessons, flagged risks, proposed ADRs, and full pipeline
assembly.

## Scope (Milestones 3–6)

- Retains the Milestone 1 runtime foundation and the Milestone 2
  domain model unchanged in their existing shapes.
- **Milestone 3** introduces `LearningObservationBuilder`: a pure,
  synchronous, deterministic translator from a `LearningSubject` (an
  Orchestrator Engine `WorkflowResult` and a Validation Engine
  `ValidationVerdict`, both imported by type only) into a
  `LearningObservation`. `LearningEngine.observeCycle()` delegates
  entirely to it.
- **Milestone 4** introduces `LearningProposalBuilder`: a pure,
  synchronous, deterministic composer from one or more
  `LearningObservation` records into a single
  `LearningKnowledgeUpdateProposal`. `LearningEngine.generateProposal()`
  delegates entirely to it.
- **Milestone 5** introduces `LearningKnowledgeHandoffBuilder`: a
  pure, synchronous, deterministic packager from an already-built
  `LearningKnowledgeUpdateProposal` into a `LearningKnowledgeHandoff`.
  `LearningEngine.prepareKnowledgeHandoff()` delegates entirely to it.
- **Milestone 6** introduces four more pieces, implementing
  architecture.md's Learning Engine "Produces" line in full ("new or
  revised heuristics, proposed ADRs for recurring architectural
  friction, flagged recurring risks"):
  - `LearningLessonBuilder` (`src/builders/learning-lesson-builder.ts`):
    distills `LearningObservation` records into `LearningLesson`
    records, per architecture.md's "distills durable lessons: what
    patterns worked, what failed and why, what estimates were wrong."
  - `LearningFlaggedRiskBuilder` (`src/risk/learning-flagged-risk-builder.ts`):
    filters/translates `LearningLesson` records into
    `LearningFlaggedRisk` records.
  - `LearningProposedAdrBuilder` (`src/adr/learning-proposed-adr-builder.ts`):
    translates `LearningFlaggedRisk` records into `LearningProposedAdr`
    records.
  - `LearningPipelineBuilder` (`src/pipeline/learning-pipeline-builder.ts`):
    composes all of the above (plus `LearningProposalBuilder`) into a
    full `LearningPipelineResult`. `LearningEngine.analyzeCycle()`
    delegates entirely to it.
  - `LearningProposalBuilder.build()` gained two **optional, additive**
    trailing parameters (`lessons`, `priorProposals`): omitting both
    reproduces Milestone 4 behavior exactly. When supplied, `.lessonIds`
    is populated from real lessons, and `.updateType` becomes
    `'refined-heuristic'` when a supplied prior proposal shares a
    lesson id with the new one (a deterministic set-membership check —
    never a scored or ranked judgment).

**None of the Milestone 6 builders perform any AI reasoning, heuristic
scoring, ranking, approval, rejection, execution, orchestration,
validation, persistence, networking, filesystem/database access, or
knowledge write.** No call to any other Titan engine's runtime exists
anywhere in this package — the Orchestrator Engine's `WorkflowResult`
and the Validation Engine's `ValidationVerdict` are used only as
read-only, type-only input shapes, and the Knowledge Engine's runtime
is never imported, instantiated, or called.

## Runtime Contract (inherited from `BaseEngine`, unchanged since Milestone 1)

`LearningEngine` extends the shared `BaseEngine` and inherits the full
Titan runtime engine contract without any override:

- `initialize()`
- `start()`
- `stop()`
- `health()`
- `metadata()`
- `version()`
- `contractVersion()`
- `getState()`

`metadata()` reports:

- `id`: `learning-engine`
- `name`: `Learning Engine`
- `version`: `1.0.0`
- `contractVersion`: the shared `ENGINE_API_CONTRACT_VERSION`
- `capabilities`: `learning.observe-cycle`, `learning.generate-proposal`,
  `learning.prepare-knowledge-handoff`, `learning.analyze-cycle`

## Public API (Milestone 6)

| Method | Behavior |
|---|---|
| `observeCycle(request)` | Delegates entirely to `LearningObservationBuilder.build(request.subject)`. Returns a `LearningObservation`. |
| `generateProposal(request)` | Delegates entirely to `LearningProposalBuilder.build(request.observations)`. Returns a `LearningKnowledgeUpdateProposal` (`lessonIds: []`, `updateType: 'new-precedent'` — this direct entry point does not supply lessons/prior proposals). |
| `prepareKnowledgeHandoff(request)` | Delegates entirely to `LearningKnowledgeHandoffBuilder.build(request.proposal)`. Returns a `LearningKnowledgeHandoff`. |
| `analyzeCycle(request)` | Delegates entirely to `LearningPipelineBuilder.run(request.observations, request.priorProposals ?? [])`. Returns a full `LearningPipelineResult`: `lessons`, one aggregate `knowledgeUpdateProposal` (with real `lessonIds` and structurally detected `updateType`), `flaggedRisks`, and `proposedAdrs`. |

All four methods throw `LearningRequestError` for a malformed request
or input. No other public method exists.

## `LearningLessonBuilder` (Milestone 6)

`LearningLessonBuilder.build(observations, timestamp?)` produces
exactly one `LearningLesson` per observation:

- `.category` is derived via a **fixed, total, deterministic lookup
  table** keyed on `observation.subject.verdict.status`:
  `pass → 'pattern-worked'`, `fail → 'failure'`,
  `partial → 'estimate-inaccuracy'`. This is a structural
  classification, not a heuristic judgment — `'pass'`/`'failure'` map
  to their near-synonymous category, and `'partial'` maps to the one
  remaining category by elimination. It mirrors
  `ExecutionStatusTracker`'s established pattern of deriving a
  classification from a fixed lookup on an existing status field.
- `.lessonId` is deterministically derived as `lesson-<observationId>`.
- `.description` is a structural composition referencing only the
  observation id and verdict status already present on the input.

Throws `LearningRequestError` only when `observations` is malformed.

## `LearningFlaggedRiskBuilder` (Milestone 6)

`LearningFlaggedRiskBuilder.build(lessons, timestamp?)` produces one
`LearningFlaggedRisk` per lesson whose `category` is `'failure'` or
`'estimate-inaccuracy'`; `'pattern-worked'` lessons produce no risk.

The word "recurring" in architecture.md's "flagged recurring risks"
is **deliberately not implemented** as a frequency or threshold rule:
no repository document defines what count or time window makes a risk
"recurring," and inventing one would cross into heuristic scoring or
ranking. Every risk-eligible lesson is instead a structural risk
candidate, one-to-one, with no counting or ranking.

Throws `LearningRequestError` only when `lessons` is malformed.

## `LearningProposedAdrBuilder` (Milestone 6)

`LearningProposedAdrBuilder.build(risks, timestamp?)` produces one
`LearningProposedAdr` per risk (same "no recurrence threshold"
reasoning as above):

- `.context` is the source risk's `description`, copied verbatim.
- `.decision` and `.consequences` are **fixed, documented structural
  placeholder strings** — no repository document defines a rule for
  deriving real decision/consequence content from a risk, so none is
  invented.
- `.alternativesConsidered` is always `[]` — no alternatives were
  actually evaluated.
- `.status` is always `'proposed'`, never `'accepted'`.

Throws `LearningRequestError` only when `risks` is malformed.

## `LearningPipelineBuilder` (Milestone 6)

`LearningPipelineBuilder.run(observations, priorProposals?, timestamp?)`
composes `LearningLessonBuilder`, `LearningProposalBuilder`,
`LearningFlaggedRiskBuilder`, and `LearningProposedAdrBuilder` (in that
order) into a `LearningPipelineResult`, resolving one timestamp shared
by every produced artifact. `flaggedRisks`/`proposedAdrs` may
legitimately be empty arrays when every lesson is `'pattern-worked'`.

## `LearningProposalBuilder` — Milestone 6 additions

See Milestone 4 for the base behavior. New in Milestone 6:
`build(observations, timestamp?, lessons = [], priorProposals = [])`
— both new parameters are optional and default to `[]`, so every
Milestone 4 call site and test continues to behave identically.
`.lessonIds = lessons.map(l => l.lessonId)`. `.updateType` is
`'refined-heuristic'` when any resulting lesson id also appears in any
`priorProposals` entry's own `lessonIds` (a pure set-membership check
against proposals the caller already has in hand — never a Knowledge
Engine lookup), otherwise `'new-precedent'`.

## Explicit Non-Goals (Milestones 3–6)

- No AI reasoning, no rule engines, no heuristics, no scoring, no
  ranking anywhere — including no "recurring" frequency/threshold
  logic for risks or ADRs.
- No knowledge writes — nothing in this package ever reaches,
  imports, instantiates, or calls the Knowledge Engine's runtime.
- No approval or rejection of proposals or ADRs — every proposal and
  ADR this package produces has `status: 'proposed'` and stays that
  way.
- No persistence, no networking, no filesystem/database access.
- No scheduling, no retries.
- No orchestration, no execution, no validation logic.
- No cross-engine runtime calls — `WorkflowResult` and
  `ValidationVerdict` are referenced by type only; no Knowledge Engine
  type is referenced at all.

## Explicit Statement of Current Behavior

This package currently provides only:

1. A working Titan runtime lifecycle via `BaseEngine`, unmodified
   since Milestone 1.
2. The Learning Engine's domain model, unchanged since Milestone 2
   except for the Milestone 5 addition of `LearningKnowledgeHandoff`
   (no Milestone 6 type additions — every Milestone 6 type already
   existed in the Milestone 2 model).
3. `LearningObservationBuilder` (Milestone 3), wired into
   `observeCycle()`.
4. `LearningProposalBuilder` (Milestone 4, extended in Milestone 6),
   wired into `generateProposal()` directly and into
   `LearningPipelineBuilder` for the full-pipeline case.
5. `LearningKnowledgeHandoffBuilder` (Milestone 5), wired into
   `prepareKnowledgeHandoff()`.
6. `LearningLessonBuilder`, `LearningFlaggedRiskBuilder`,
   `LearningProposedAdrBuilder`, and `LearningPipelineBuilder`
   (Milestone 6), wired into `analyzeCycle()`.

No actual knowledge write, no approval/rejection, and no cross-engine
runtime behavior of any kind exists anywhere in this package.
