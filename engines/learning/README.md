# Learning Engine

Milestone 4 package for the Titan Core Learning Engine: a
deterministic structural observation builder (Milestone 3) and a
deterministic structural proposal builder (Milestone 4).

## Scope (Milestones 3–4)

- Retains the Milestone 1 runtime foundation unchanged (lifecycle,
  health, metadata, version, and state methods, inherited from
  `BaseEngine`) and the Milestone 2 domain model unchanged
  (`src/models/types.ts`).
- **Milestone 3** introduces `LearningObservationBuilder`
  (`src/builders/learning-observation-builder.ts`): a pure,
  synchronous, deterministic translator that consumes a
  `LearningSubject` (an Orchestrator Engine `WorkflowResult` and a
  Validation Engine `ValidationVerdict`, both imported by type only)
  and produces a `LearningObservation`. `LearningEngine.observeCycle()`
  validates only the shape of its request and delegates entirely to
  `LearningObservationBuilder.build`, returning its output unchanged.
- **Milestone 4** introduces `LearningProposalBuilder`
  (`src/builders/learning-proposal-builder.ts`): a pure, synchronous,
  deterministic composer that consumes one or more already-built
  `LearningObservation` records and produces a single
  `LearningKnowledgeUpdateProposal`.
  `LearningEngine.generateProposal()` validates only the shape of its
  request and delegates entirely to `LearningProposalBuilder.build`,
  returning its output unchanged.

**Neither `LearningObservationBuilder` nor `LearningProposalBuilder`
performs any lesson distillation, knowledge write, approval,
rejection, scoring, ranking, AI reasoning, execution, orchestration,
validation, persistence, networking, or heuristic behavior.** No
scheduling, no retries, and no call to any other Titan engine's
runtime exist anywhere in this package — the Orchestrator Engine's
`WorkflowResult` and the Validation Engine's `ValidationVerdict` are
used only as read-only, type-only input shapes.

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
- `capabilities`: `learning.observe-cycle`, `learning.generate-proposal`

## Public API (Milestone 4)

| Method | Behavior (Milestone 4) |
|---|---|
| `observeCycle(request)` | Validates that `request` is a non-null object, then delegates entirely to `LearningObservationBuilder.build(request.subject)`. Returns a `LearningObservation`. Throws `LearningRequestError` for a malformed request or subject. |
| `generateProposal(request)` | Validates that `request` is a non-null object, then delegates entirely to `LearningProposalBuilder.build(request.observations)`. Returns a `LearningKnowledgeUpdateProposal`. Throws `LearningRequestError` for a malformed request or observation list. |

No other public method exists. Capabilities beyond these two —
lesson distillation, proposed-ADR drafting, risk flagging, and
feeding approved artifacts into the Knowledge Engine — are named in
`architecture.md`'s Learning Engine entry but are not implemented
here; they remain out of scope until a future milestone.

## `LearningObservationBuilder` (Milestone 3)

`LearningObservationBuilder.build(subject, timestamp?)` performs pure
structural translation only:

- `LearningObservation.subject` is a freshly constructed wrapper
  around the same `outcome`/`verdict` values supplied on `subject`,
  copied verbatim.
- `LearningObservation.observationId` is deterministically derived as
  `observation-<workflowId>-<validationId>`.
- `LearningObservation.stage` is always `'outcome'` — not a
  placeholder, but a structural fact: a `WorkflowResult` is, by the
  Orchestrator Engine's own definition, "Outcome payload for a
  completed or terminated workflow," so every subject this builder
  can receive represents the `'outcome'` stage.
- `LearningObservation.observedAt` is the caller-supplied (or freshly
  read) ISO-8601 timestamp.

Throws `LearningRequestError` only when `subject`, `subject.outcome`,
or `subject.verdict` is missing or malformed.

## `LearningProposalBuilder` (Milestone 4)

`LearningProposalBuilder.build(observations, timestamp?)` performs
pure structural composition only:

- `.proposalId` is deterministically derived as
  `proposal-<observationId>`, from the first entry of `observations`.
- `.lessonIds` is always `[]`. No `LearningLesson` is distilled by
  this class — `LearningLessonCategory` has no field on
  `LearningObservation`, `WorkflowResult`, or `ValidationVerdict` it
  could be deterministically derived from without inventing a
  classification rule no repository document states. Lesson
  distillation is left for a future milestone.
- `.updateType` is always `'new-precedent'` — distinguishing a new
  precedent from a refinement of an existing one would require
  comparing against the Knowledge Engine's stored history, which
  requires a cross-engine runtime call this class must not make.
- `.status` is always `'proposed'` — the only status architecture.md
  permits the Learning Engine to assign to its own output.
- `.description` is a structural composition listing the number of
  source observations and their ids — no summarization or judgment.
- `.proposedAt` is the caller-supplied (or freshly read) ISO-8601
  timestamp.

Throws `LearningRequestError` only when `observations` is not a
non-empty array of well-formed `LearningObservation`-shaped values.

## Explicit Non-Goals (Milestones 3–4)

- No lesson distillation of any kind (`LearningLesson` is never
  produced).
- No proposed-ADR drafting (`LearningProposedAdr` is never produced).
- No risk flagging (`LearningFlaggedRisk` is never produced).
- No knowledge writes or feedback to the Knowledge Engine.
- No approval or rejection of proposals — every proposal this package
  produces is `status: 'proposed'` and stays that way.
- No scoring, no rule engines, no AI reasoning, no heuristics, no
  ranking.
- No persistence, no networking, no filesystem access.
- No scheduling, no retries.
- No orchestration, no execution, no validation logic.
- No cross-engine runtime calls — this package never imports,
  instantiates, or calls the runtime of the Planner, Orchestrator,
  Context, Knowledge, Execution, or Validation engines. `WorkflowResult`
  and `ValidationVerdict` are referenced by type only.

## Explicit Statement of Current Behavior

This package currently provides only:

1. A working Titan runtime lifecycle (`initialize` → `start` →
   `stop`) via `BaseEngine`, unmodified since Milestone 1.
2. Working health, metadata, version, and contract-version reporting,
   inherited unchanged from `BaseEngine`.
3. The Learning Engine's domain model (`src/models/types.ts`),
   unchanged since Milestone 2.
4. A deterministic structural `LearningObservationBuilder`
   (Milestone 3), wired into `observeCycle()`.
5. A deterministic structural `LearningProposalBuilder` (Milestone 4),
   wired into `generateProposal()`.

No lesson distillation, no proposed-ADR drafting, no risk flagging,
no knowledge write, no approval/rejection, and no cross-engine
runtime behavior of any kind exists anywhere in this package. Those
remain out of scope pending a future milestone grounded in explicit
repository requirements.
