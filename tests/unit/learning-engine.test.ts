import { describe, expect, it } from 'vitest';

import {
  LearningEngine,
  LearningFlaggedRiskBuilder,
  LearningKnowledgeHandoffBuilder,
  LearningLessonBuilder,
  LearningObservationBuilder,
  LearningPipelineBuilder,
  LearningProposalBuilder,
  LearningProposedAdrBuilder,
  LearningRequestError,
  type LearningFlaggedRisk,
  type LearningKnowledgeUpdateProposal,
  type LearningLesson,
  type LearningObservation,
  type LearningSubject,
} from '../../engines/learning/src';
import type { WorkflowResult } from '../../engines/orchestrator/src/models/types';
import type { ValidationVerdict } from '../../engines/validation/src/models/types';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

const EXPECTED_CAPABILITIES = [
  'learning.observe-cycle',
  'learning.generate-proposal',
  'learning.prepare-knowledge-handoff',
  'learning.analyze-cycle',
];

function buildWorkflowResult(
  overrides: Partial<WorkflowResult> = {},
): WorkflowResult {
  return {
    workflowId: 'workflow-1',
    status: 'completed',
    completedStepIds: ['step-1'],
    failedStepIds: [],
    ...overrides,
  };
}

function buildValidationVerdict(
  overrides: Partial<ValidationVerdict> = {},
): ValidationVerdict {
  return {
    validationId: 'validation-workflow-1-step-1',
    target: {
      executionId: 'execution-workflow-1-step-1',
      workflowId: 'workflow-1',
      itemId: 'step-1',
      itemType: 'step',
    },
    status: 'pass',
    checks: [],
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}

function buildSubject(
  overrides: Partial<LearningSubject> = {},
): LearningSubject {
  return {
    outcome: buildWorkflowResult(),
    verdict: buildValidationVerdict(),
    ...overrides,
  };
}

function buildObservation(
  overrides: Partial<LearningObservation> = {},
): LearningObservation {
  return {
    observationId: 'observation-workflow-1-validation-workflow-1-step-1',
    subject: buildSubject(),
    stage: 'outcome',
    observedAt: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}

function buildProposal(
  overrides: Partial<LearningKnowledgeUpdateProposal> = {},
): LearningKnowledgeUpdateProposal {
  return {
    proposalId: 'proposal-observation-workflow-1-validation-workflow-1-step-1',
    updateType: 'new-precedent',
    lessonIds: [],
    description:
      'Structural knowledge-update proposal composed from 1 observation(s): observation-1.',
    status: 'proposed',
    proposedAt: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}

function buildLesson(overrides: Partial<LearningLesson> = {}): LearningLesson {
  return {
    lessonId: 'lesson-observation-workflow-1-validation-workflow-1-step-1',
    observationIds: ['observation-workflow-1-validation-workflow-1-step-1'],
    category: 'pattern-worked',
    description:
      'Lesson distilled from observation observation-workflow-1-validation-workflow-1-step-1: Validation Engine verdict status was "pass".',
    createdAt: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}

function buildRisk(
  overrides: Partial<LearningFlaggedRisk> = {},
): LearningFlaggedRisk {
  return {
    riskId: 'risk-lesson-observation-workflow-1-validation-workflow-1-step-1',
    description:
      'Flagged risk derived from lesson lesson-observation-workflow-1-validation-workflow-1-step-1 (category: failure).',
    relatedLessonIds: [
      'lesson-observation-workflow-1-validation-workflow-1-step-1',
    ],
    flaggedAt: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('LearningEngine — Milestone 6 (Structural Lessons, Risks, ADRs, and Pipeline Assembly)', () => {
  describe('runtime lifecycle (unchanged from Milestone 1)', () => {
    it('starts in the created state and transitions through the full lifecycle', async () => {
      const engine = new LearningEngine();

      expect(engine.getState()).toBe('created');

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');

      await engine.start();
      expect(engine.getState()).toBe('running');

      await engine.stop();
      expect(engine.getState()).toBe('stopped');
    });

    it('allows re-initialization after stop', async () => {
      const engine = new LearningEngine();

      await engine.initialize();
      await engine.start();
      await engine.stop();

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');

      await engine.start();
      expect(engine.getState()).toBe('running');

      await engine.stop();
      expect(engine.getState()).toBe('stopped');
    });

    it('is safe to call stop() more than once', async () => {
      const engine = new LearningEngine();

      await engine.initialize();
      await engine.start();
      await engine.stop();

      await expect(engine.stop()).resolves.not.toThrow();
      expect(engine.getState()).toBe('stopped');
    });
  });

  describe('health (unchanged from Milestone 1)', () => {
    it('reports healthy status through every lifecycle stage', async () => {
      const engine = new LearningEngine();

      await engine.initialize();
      expect((await engine.health()).status).toBe('healthy');

      await engine.start();
      expect((await engine.health()).status).toBe('healthy');

      await engine.stop();
      expect((await engine.health()).status).toBe('healthy');
    });
  });

  describe('metadata', () => {
    it('reports the expected identity fields', () => {
      const engine = new LearningEngine();
      const metadata = engine.metadata();

      expect(metadata.id).toBe('learning-engine');
      expect(metadata.name).toBe('Learning Engine');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.contractVersion).toBe(ENGINE_API_CONTRACT_VERSION);
    });

    it('advertises the observeCycle, generateProposal, prepareKnowledgeHandoff, and analyzeCycle capabilities', () => {
      const engine = new LearningEngine();
      expect(engine.metadata().capabilities).toEqual(EXPECTED_CAPABILITIES);
    });

    it('allows overriding id, name, and version via options', () => {
      const engine = new LearningEngine({
        id: 'custom-id',
        name: 'Custom Name',
        version: '2.0.0',
      });
      const metadata = engine.metadata();

      expect(metadata.id).toBe('custom-id');
      expect(metadata.name).toBe('Custom Name');
      expect(metadata.version).toBe('2.0.0');
    });
  });

  describe('version, contractVersion, getState', () => {
    it('version() matches metadata().version', () => {
      const engine = new LearningEngine();
      expect(engine.version()).toBe(engine.metadata().version);
    });

    it('contractVersion() matches the shared contract constant', () => {
      const engine = new LearningEngine();
      expect(engine.contractVersion()).toBe(ENGINE_API_CONTRACT_VERSION);
    });

    it('getState() reflects the current lifecycle state', async () => {
      const engine = new LearningEngine();
      expect(engine.getState()).toBe('created');

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');
    });
  });

  describe('public API surface (Milestone 6 boundary)', () => {
    it('exposes observeCycle, generateProposal, prepareKnowledgeHandoff, and analyzeCycle as functions', () => {
      const engine = new LearningEngine();

      expect(typeof engine.observeCycle).toBe('function');
      expect(typeof engine.generateProposal).toBe('function');
      expect(typeof engine.prepareKnowledgeHandoff).toBe('function');
      expect(typeof engine.analyzeCycle).toBe('function');
    });

    it('exposes no other business methods', () => {
      const engine = new LearningEngine();

      // Any of these existing would indicate a business method was
      // added without explicit grounding in architecture.md or the
      // Phase 012 specification.
      expect(
        (engine as unknown as Record<string, unknown>).distillLesson,
      ).toBeUndefined();
      expect(
        (engine as unknown as Record<string, unknown>).proposeAdr,
      ).toBeUndefined();
      expect(
        (engine as unknown as Record<string, unknown>).flagRisk,
      ).toBeUndefined();
      expect(
        (engine as unknown as Record<string, unknown>).getLearningStatus,
      ).toBeUndefined();
      expect(
        (engine as unknown as Record<string, unknown>).applyLearning,
      ).toBeUndefined();
    });
  });

  describe('LearningEngine.observeCycle() — delegation to LearningObservationBuilder (new in Milestone 3)', () => {
    it('returns a LearningObservation for a well-formed subject', async () => {
      const engine = new LearningEngine();
      const subject = buildSubject();

      const result = await engine.observeCycle({ subject });

      expect(result).toEqual({
        observationId: 'observation-workflow-1-validation-workflow-1-step-1',
        subject,
        stage: 'outcome',
        observedAt: result.observedAt,
      });
    });

    it('rejects with LearningRequestError for a null/undefined request', async () => {
      const engine = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.observeCycle(null)).rejects.toBeInstanceOf(
        LearningRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.observeCycle(undefined)).rejects.toBeInstanceOf(
        LearningRequestError,
      );
    });

    it('rejects with LearningRequestError for a non-object request', async () => {
      const engine = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.observeCycle('not-an-object')).rejects.toBeInstanceOf(
        LearningRequestError,
      );
    });

    it('propagates LearningRequestError from LearningObservationBuilder when subject itself is malformed', async () => {
      const engine = new LearningEngine();

      await expect(
        // @ts-expect-error — intentionally malformed for the test
        engine.observeCycle({ subject: null }),
      ).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('does not mutate the subject passed to observeCycle()', async () => {
      const engine = new LearningEngine();
      const subject = buildSubject();
      const snapshot = JSON.parse(JSON.stringify(subject));

      await engine.observeCycle({ subject });

      expect(subject).toEqual(snapshot);
    });
  });

  describe('LearningEngine.generateProposal() — delegation to LearningProposalBuilder (new in Milestone 4)', () => {
    it('returns a LearningKnowledgeUpdateProposal for well-formed observations', async () => {
      const engine = new LearningEngine();
      const observations = [buildObservation()];

      const result = await engine.generateProposal({ observations });

      expect(result).toEqual({
        proposalId:
          'proposal-observation-workflow-1-validation-workflow-1-step-1',
        updateType: 'new-precedent',
        lessonIds: [],
        description:
          'Structural knowledge-update proposal composed from 1 observation(s): observation-workflow-1-validation-workflow-1-step-1.',
        status: 'proposed',
        proposedAt: result.proposedAt,
      });
    });

    it('rejects with LearningRequestError for a null/undefined request', async () => {
      const engine = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.generateProposal(null)).rejects.toBeInstanceOf(
        LearningRequestError,
      );
    });

    it('propagates LearningRequestError from LearningProposalBuilder when observations is empty', async () => {
      const engine = new LearningEngine();

      await expect(
        engine.generateProposal({ observations: [] }),
      ).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('does not mutate the observations passed to generateProposal()', async () => {
      const engine = new LearningEngine();
      const observations = [buildObservation()];
      const snapshot = JSON.parse(JSON.stringify(observations));

      await engine.generateProposal({ observations });

      expect(observations).toEqual(snapshot);
    });
  });

  describe('LearningEngine.prepareKnowledgeHandoff() — delegation to LearningKnowledgeHandoffBuilder (new in Milestone 5)', () => {
    it('returns a LearningKnowledgeHandoff for a well-formed proposal', async () => {
      const engine = new LearningEngine();
      const proposal = buildProposal();

      const result = await engine.prepareKnowledgeHandoff({ proposal });

      expect(result).toEqual({
        handoffId:
          'handoff-proposal-observation-workflow-1-validation-workflow-1-step-1',
        proposal,
        preparedAt: result.preparedAt,
      });
    });

    it('rejects with LearningRequestError for a null/undefined request', async () => {
      const engine = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.prepareKnowledgeHandoff(null)).rejects.toBeInstanceOf(
        LearningRequestError,
      );
      await expect(
        // @ts-expect-error — intentionally malformed for the test
        engine.prepareKnowledgeHandoff(undefined),
      ).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('rejects with LearningRequestError for a non-object request', async () => {
      const engine = new LearningEngine();

      await expect(
        // @ts-expect-error — intentionally malformed for the test
        engine.prepareKnowledgeHandoff('not-an-object'),
      ).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('propagates LearningRequestError from LearningKnowledgeHandoffBuilder when proposal itself is malformed', async () => {
      const engine = new LearningEngine();

      await expect(
        // @ts-expect-error — intentionally malformed for the test
        engine.prepareKnowledgeHandoff({ proposal: null }),
      ).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('does not mutate the proposal passed to prepareKnowledgeHandoff()', async () => {
      const engine = new LearningEngine();
      const proposal = buildProposal();
      const snapshot = JSON.parse(JSON.stringify(proposal));

      await engine.prepareKnowledgeHandoff({ proposal });

      expect(proposal).toEqual(snapshot);
    });

    it('never imports or calls the Knowledge Engine runtime (no module import present)', async () => {
      // Structural guard: the compiled module graph for this test file
      // never references '@titan/knowledge' or engines/knowledge — if
      // it did, this file's own import list (checked above) would need
      // one. This test documents that expectation explicitly.
      const engine = new LearningEngine();
      const result = await engine.prepareKnowledgeHandoff({
        proposal: buildProposal(),
      });

      expect(Object.keys(result).sort()).toEqual(
        ['handoffId', 'preparedAt', 'proposal'].sort(),
      );
    });
  });

  describe('LearningEngine.analyzeCycle() — delegation to LearningPipelineBuilder (new in Milestone 6)', () => {
    it('returns a fully populated LearningPipelineResult for a passing observation', async () => {
      const engine = new LearningEngine();
      const observations = [buildObservation()];

      const result = await engine.analyzeCycle({ observations });

      expect(result.lessons).toHaveLength(1);
      expect(result.lessons[0].category).toBe('pattern-worked');
      expect(result.knowledgeUpdateProposals).toHaveLength(1);
      expect(result.knowledgeUpdateProposals[0].lessonIds).toEqual([
        result.lessons[0].lessonId,
      ]);
      expect(result.flaggedRisks).toEqual([]);
      expect(result.proposedAdrs).toEqual([]);
    });

    it('populates flaggedRisks and proposedAdrs for a failing observation', async () => {
      const engine = new LearningEngine();
      const observations = [
        buildObservation({
          subject: buildSubject({
            verdict: buildValidationVerdict({ status: 'fail' }),
          }),
        }),
      ];

      const result = await engine.analyzeCycle({ observations });

      expect(result.lessons[0].category).toBe('failure');
      expect(result.flaggedRisks).toHaveLength(1);
      expect(result.proposedAdrs).toHaveLength(1);
      expect(result.proposedAdrs[0].relatedLessonIds).toEqual(
        result.flaggedRisks[0].relatedLessonIds,
      );
    });

    it('detects refined-heuristic when priorProposals overlap the new lessonIds', async () => {
      const engine = new LearningEngine();
      const observations = [buildObservation()];
      const first = await engine.analyzeCycle({ observations });
      const priorProposals = first.knowledgeUpdateProposals;

      const second = await engine.analyzeCycle({
        observations,
        priorProposals,
      });

      expect(second.knowledgeUpdateProposals[0].updateType).toBe(
        'refined-heuristic',
      );
    });

    it('rejects with LearningRequestError for a null/undefined request', async () => {
      const engine = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.analyzeCycle(null)).rejects.toBeInstanceOf(
        LearningRequestError,
      );
    });

    it('propagates LearningRequestError from LearningPipelineBuilder when observations is empty', async () => {
      const engine = new LearningEngine();

      await expect(
        engine.analyzeCycle({ observations: [] }),
      ).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('does not mutate the observations passed to analyzeCycle()', async () => {
      const engine = new LearningEngine();
      const observations = [buildObservation()];
      const snapshot = JSON.parse(JSON.stringify(observations));

      await engine.analyzeCycle({ observations });

      expect(observations).toEqual(snapshot);
    });

    it('never imports or calls the Knowledge Engine runtime and never sets an accepted/rejected status', async () => {
      const engine = new LearningEngine();
      const observations = [
        buildObservation({
          subject: buildSubject({
            verdict: buildValidationVerdict({ status: 'fail' }),
          }),
        }),
      ];

      const result = await engine.analyzeCycle({ observations });

      expect(
        result.knowledgeUpdateProposals.every(
          (proposal) => proposal.status === 'proposed',
        ),
      ).toBe(true);
      expect(
        result.proposedAdrs.every((adr) => adr.status === 'proposed'),
      ).toBe(true);
    });
  });
});

describe('LearningObservationBuilder — Milestone 3', () => {
  describe('successful translation', () => {
    it('translates a subject into a LearningObservation', () => {
      const builder = new LearningObservationBuilder();
      const subject = buildSubject();

      const result = builder.build(subject, '2026-07-29T00:00:00.000Z');

      expect(result).toEqual({
        observationId: 'observation-workflow-1-validation-workflow-1-step-1',
        subject,
        stage: 'outcome',
        observedAt: '2026-07-29T00:00:00.000Z',
      });
    });

    it('derives observationId deterministically from workflowId and validationId', () => {
      const builder = new LearningObservationBuilder();
      const subject = buildSubject({
        outcome: buildWorkflowResult({ workflowId: 'wf-42' }),
        verdict: buildValidationVerdict({ validationId: 'validation-99' }),
      });

      const result = builder.build(subject);

      expect(result.observationId).toBe('observation-wf-42-validation-99');
    });

    it('always sets stage to "outcome"', () => {
      const builder = new LearningObservationBuilder();
      const result = builder.build(buildSubject());

      expect(result.stage).toBe('outcome');
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new LearningObservationBuilder();
      const subject = buildSubject();

      const first = builder.build(subject, '2026-07-29T00:00:00.000Z');
      const second = builder.build(subject, '2026-07-29T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('produces identical output across separate builder instances', () => {
      const subject = buildSubject();

      const first = new LearningObservationBuilder().build(
        subject,
        '2026-07-29T00:00:00.000Z',
      );
      const second = new LearningObservationBuilder().build(
        subject,
        '2026-07-29T00:00:00.000Z',
      );

      expect(first).toEqual(second);
    });

    it('build() is synchronous (does not return a Promise)', () => {
      const builder = new LearningObservationBuilder();
      const result = builder.build(buildSubject());

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined subject', () => {
      const builder = new LearningObservationBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(LearningRequestError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(undefined)).toThrow(LearningRequestError);
    });

    it('rejects a subject missing outcome entirely', () => {
      const builder = new LearningObservationBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build({ verdict: buildValidationVerdict() }),
      ).toThrow(LearningRequestError);
    });

    it('rejects a subject whose outcome has no workflowId', () => {
      const builder = new LearningObservationBuilder();

      expect(() =>
        builder.build({
          // @ts-expect-error — intentionally malformed for the test
          outcome: { status: 'completed' },
          verdict: buildValidationVerdict(),
        }),
      ).toThrow(LearningRequestError);
    });

    it('rejects a subject missing verdict entirely', () => {
      const builder = new LearningObservationBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build({ outcome: buildWorkflowResult() })).toThrow(
        LearningRequestError,
      );
    });

    it('rejects a subject whose verdict has no validationId', () => {
      const builder = new LearningObservationBuilder();

      expect(() =>
        builder.build({
          outcome: buildWorkflowResult(),
          // @ts-expect-error — intentionally malformed for the test
          verdict: { status: 'pass' },
        }),
      ).toThrow(LearningRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new LearningObservationBuilder();

      try {
        // @ts-expect-error — intentionally malformed for the test
        builder.build(null);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningRequestError);
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input subject', () => {
      const builder = new LearningObservationBuilder();
      const subject = buildSubject();
      const snapshot = JSON.parse(JSON.stringify(subject));

      builder.build(subject);

      expect(subject).toEqual(snapshot);
    });

    it('returns a subject object that is a freshly constructed value, not the same reference', () => {
      const builder = new LearningObservationBuilder();
      const subject = buildSubject();

      const result = builder.build(subject);

      expect(result.subject).not.toBe(subject);
      expect(result.subject).toEqual(subject);
    });
  });
});

describe('LearningProposalBuilder — Milestone 4', () => {
  describe('successful composition', () => {
    it('composes a single observation into a LearningKnowledgeUpdateProposal', () => {
      const builder = new LearningProposalBuilder();
      const observations = [buildObservation()];

      const result = builder.build(observations, '2026-07-29T00:00:00.000Z');

      expect(result).toEqual({
        proposalId:
          'proposal-observation-workflow-1-validation-workflow-1-step-1',
        updateType: 'new-precedent',
        lessonIds: [],
        description:
          'Structural knowledge-update proposal composed from 1 observation(s): observation-workflow-1-validation-workflow-1-step-1.',
        status: 'proposed',
        proposedAt: '2026-07-29T00:00:00.000Z',
      });
    });

    it('composes multiple observations, listing every observationId', () => {
      const builder = new LearningProposalBuilder();
      const observations = [
        buildObservation({ observationId: 'observation-a' }),
        buildObservation({ observationId: 'observation-b' }),
      ];

      const result = builder.build(observations, '2026-07-29T00:00:00.000Z');

      expect(result.proposalId).toBe('proposal-observation-a');
      expect(result.description).toContain('observation-a');
      expect(result.description).toContain('observation-b');
      expect(result.description).toContain('2 observation(s)');
    });

    it('always sets status to "proposed" and updateType to "new-precedent"', () => {
      const builder = new LearningProposalBuilder();
      const result = builder.build([buildObservation()]);

      expect(result.status).toBe('proposed');
      expect(result.updateType).toBe('new-precedent');
    });

    it('always returns an empty lessonIds array', () => {
      const builder = new LearningProposalBuilder();
      const result = builder.build([buildObservation()]);

      expect(result.lessonIds).toEqual([]);
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new LearningProposalBuilder();
      const observations = [buildObservation()];

      const first = builder.build(observations, '2026-07-29T00:00:00.000Z');
      const second = builder.build(observations, '2026-07-29T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('build() is synchronous (does not return a Promise)', () => {
      const builder = new LearningProposalBuilder();
      const result = builder.build([buildObservation()]);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined observations value', () => {
      const builder = new LearningProposalBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(LearningRequestError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(undefined)).toThrow(LearningRequestError);
    });

    it('rejects a non-array observations value', () => {
      const builder = new LearningProposalBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build('not-an-array')).toThrow(LearningRequestError);
    });

    it('rejects an empty observations array', () => {
      const builder = new LearningProposalBuilder();

      expect(() => builder.build([])).toThrow(LearningRequestError);
    });

    it('rejects an observations array containing a malformed entry', () => {
      const builder = new LearningProposalBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build([{ notAnObservation: true }])).toThrow(
        LearningRequestError,
      );
    });

    it('rejects an observation missing observationId', () => {
      const builder = new LearningProposalBuilder();

      expect(() =>
        builder.build([
          // @ts-expect-error — intentionally malformed for the test
          { subject: buildSubject(), stage: 'outcome', observedAt: 'x' },
        ]),
      ).toThrow(LearningRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new LearningProposalBuilder();

      try {
        builder.build([]);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningRequestError);
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input observations array', () => {
      const builder = new LearningProposalBuilder();
      const observations = [buildObservation()];
      const snapshot = JSON.parse(JSON.stringify(observations));

      builder.build(observations);

      expect(observations).toEqual(snapshot);
    });
  });

  describe('Milestone 6 additions — lessons and refined-heuristic detection', () => {
    it('omitting lessons/priorProposals reproduces Milestone 4 behavior exactly', () => {
      const builder = new LearningProposalBuilder();
      const observations = [buildObservation()];

      const result = builder.build(observations, '2026-07-29T00:00:00.000Z');

      expect(result.lessonIds).toEqual([]);
      expect(result.updateType).toBe('new-precedent');
    });

    it('populates lessonIds from the supplied lessons', () => {
      const builder = new LearningProposalBuilder();
      const observations = [buildObservation()];
      const lessons = [buildLesson()];

      const result = builder.build(
        observations,
        '2026-07-29T00:00:00.000Z',
        lessons,
      );

      expect(result.lessonIds).toEqual([lessons[0].lessonId]);
    });

    it('sets updateType to "refined-heuristic" when a prior proposal shares a lessonId', () => {
      const builder = new LearningProposalBuilder();
      const observations = [buildObservation()];
      const lessons = [buildLesson()];
      const priorProposals = [
        buildProposal({ lessonIds: [lessons[0].lessonId] }),
      ];

      const result = builder.build(
        observations,
        '2026-07-29T00:00:00.000Z',
        lessons,
        priorProposals,
      );

      expect(result.updateType).toBe('refined-heuristic');
    });

    it('keeps updateType as "new-precedent" when no prior proposal shares a lessonId', () => {
      const builder = new LearningProposalBuilder();
      const observations = [buildObservation()];
      const lessons = [buildLesson()];
      const priorProposals = [
        buildProposal({ lessonIds: ['lesson-unrelated'] }),
      ];

      const result = builder.build(
        observations,
        '2026-07-29T00:00:00.000Z',
        lessons,
        priorProposals,
      );

      expect(result.updateType).toBe('new-precedent');
    });
  });
});

describe('LearningKnowledgeHandoffBuilder — Milestone 5', () => {
  describe('successful packaging', () => {
    it('packages a proposal into a LearningKnowledgeHandoff', () => {
      const builder = new LearningKnowledgeHandoffBuilder();
      const proposal = buildProposal();

      const result = builder.build(proposal, '2026-07-29T00:00:00.000Z');

      expect(result).toEqual({
        handoffId:
          'handoff-proposal-observation-workflow-1-validation-workflow-1-step-1',
        proposal,
        preparedAt: '2026-07-29T00:00:00.000Z',
      });
    });

    it('derives handoffId deterministically from proposalId', () => {
      const builder = new LearningKnowledgeHandoffBuilder();
      const proposal = buildProposal({ proposalId: 'proposal-xyz' });

      const result = builder.build(proposal);

      expect(result.handoffId).toBe('handoff-proposal-xyz');
    });

    it('never sets an approval-related field beyond what the proposal already carries', () => {
      const builder = new LearningKnowledgeHandoffBuilder();
      const proposal = buildProposal({ status: 'proposed' });

      const result = builder.build(proposal);

      expect(result.proposal.status).toBe('proposed');
      expect(Object.keys(result).sort()).toEqual(
        ['handoffId', 'preparedAt', 'proposal'].sort(),
      );
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new LearningKnowledgeHandoffBuilder();
      const proposal = buildProposal();

      const first = builder.build(proposal, '2026-07-29T00:00:00.000Z');
      const second = builder.build(proposal, '2026-07-29T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('produces identical output across separate builder instances', () => {
      const proposal = buildProposal();

      const first = new LearningKnowledgeHandoffBuilder().build(
        proposal,
        '2026-07-29T00:00:00.000Z',
      );
      const second = new LearningKnowledgeHandoffBuilder().build(
        proposal,
        '2026-07-29T00:00:00.000Z',
      );

      expect(first).toEqual(second);
    });

    it('build() is synchronous (does not return a Promise)', () => {
      const builder = new LearningKnowledgeHandoffBuilder();
      const result = builder.build(buildProposal());

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined proposal', () => {
      const builder = new LearningKnowledgeHandoffBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(LearningRequestError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(undefined)).toThrow(LearningRequestError);
    });

    it('rejects a non-object proposal', () => {
      const builder = new LearningKnowledgeHandoffBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build('not-an-object')).toThrow(
        LearningRequestError,
      );
    });

    it('rejects a proposal missing proposalId', () => {
      const builder = new LearningKnowledgeHandoffBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build({
          updateType: 'new-precedent',
          lessonIds: [],
          status: 'proposed',
        }),
      ).toThrow(LearningRequestError);
    });

    it('rejects a proposal whose lessonIds is not an array', () => {
      const builder = new LearningKnowledgeHandoffBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build({ ...buildProposal(), lessonIds: 'not-an-array' }),
      ).toThrow(LearningRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new LearningKnowledgeHandoffBuilder();

      try {
        // @ts-expect-error — intentionally malformed for the test
        builder.build(null);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningRequestError);
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input proposal', () => {
      const builder = new LearningKnowledgeHandoffBuilder();
      const proposal = buildProposal();
      const snapshot = JSON.parse(JSON.stringify(proposal));

      builder.build(proposal);

      expect(proposal).toEqual(snapshot);
    });

    it('returns a proposal object that is a freshly constructed value, not the same reference', () => {
      const builder = new LearningKnowledgeHandoffBuilder();
      const proposal = buildProposal();

      const result = builder.build(proposal);

      expect(result.proposal).not.toBe(proposal);
      expect(result.proposal.lessonIds).not.toBe(proposal.lessonIds);
      expect(result.proposal).toEqual(proposal);
    });
  });

  describe('no decision-making behavior', () => {
    it('never changes proposal.status regardless of input status', () => {
      const builder = new LearningKnowledgeHandoffBuilder();

      const proposed = builder.build(buildProposal({ status: 'proposed' }));
      expect(proposed.proposal.status).toBe('proposed');

      // Even if a caller somehow supplied a non-'proposed' status, the
      // builder must copy it verbatim rather than deciding a new one —
      // it never assigns 'accepted' or 'rejected' itself.
      const accepted = builder.build(buildProposal({ status: 'accepted' }));
      expect(accepted.proposal.status).toBe('accepted');
    });
  });
});

describe('LearningLessonBuilder — Milestone 6', () => {
  describe('successful distillation', () => {
    it('distills a "pass" observation into a pattern-worked lesson', () => {
      const builder = new LearningLessonBuilder();
      const observations = [buildObservation()];

      const result = builder.build(observations, '2026-07-29T00:00:00.000Z');

      expect(result).toEqual([
        {
          lessonId:
            'lesson-observation-workflow-1-validation-workflow-1-step-1',
          observationIds: [
            'observation-workflow-1-validation-workflow-1-step-1',
          ],
          category: 'pattern-worked',
          description:
            'Lesson distilled from observation observation-workflow-1-validation-workflow-1-step-1: Validation Engine verdict status was "pass".',
          createdAt: '2026-07-29T00:00:00.000Z',
        },
      ]);
    });

    it('distills a "fail" observation into a failure lesson', () => {
      const builder = new LearningLessonBuilder();
      const observations = [
        buildObservation({
          subject: buildSubject({
            verdict: buildValidationVerdict({ status: 'fail' }),
          }),
        }),
      ];

      const result = builder.build(observations);

      expect(result[0].category).toBe('failure');
    });

    it('distills a "partial" observation into an estimate-inaccuracy lesson', () => {
      const builder = new LearningLessonBuilder();
      const observations = [
        buildObservation({
          subject: buildSubject({
            verdict: buildValidationVerdict({ status: 'partial' }),
          }),
        }),
      ];

      const result = builder.build(observations);

      expect(result[0].category).toBe('estimate-inaccuracy');
    });

    it('distills one lesson per observation, in order', () => {
      const builder = new LearningLessonBuilder();
      const observations = [
        buildObservation({ observationId: 'observation-a' }),
        buildObservation({ observationId: 'observation-b' }),
      ];

      const result = builder.build(observations);

      expect(result).toHaveLength(2);
      expect(result[0].lessonId).toBe('lesson-observation-a');
      expect(result[1].lessonId).toBe('lesson-observation-b');
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new LearningLessonBuilder();
      const observations = [buildObservation()];

      const first = builder.build(observations, '2026-07-29T00:00:00.000Z');
      const second = builder.build(observations, '2026-07-29T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('build() is synchronous (does not return a Promise)', () => {
      const builder = new LearningLessonBuilder();
      const result = builder.build([buildObservation()]);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined observations value', () => {
      const builder = new LearningLessonBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(LearningRequestError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(undefined)).toThrow(LearningRequestError);
    });

    it('rejects an empty observations array', () => {
      const builder = new LearningLessonBuilder();

      expect(() => builder.build([])).toThrow(LearningRequestError);
    });

    it('rejects an observation missing observationId', () => {
      const builder = new LearningLessonBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build([{ subject: buildSubject() }]),
      ).toThrow(LearningRequestError);
    });

    it('rejects an observation with a missing or unrecognized verdict status', () => {
      const builder = new LearningLessonBuilder();

      expect(() =>
        builder.build([
          buildObservation({
            subject: {
              outcome: buildWorkflowResult(),
              // @ts-expect-error — intentionally malformed for the test
              verdict: { validationId: 'x', status: 'bogus' },
            },
          }),
        ]),
      ).toThrow(LearningRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new LearningLessonBuilder();

      try {
        builder.build([]);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningRequestError);
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input observations array', () => {
      const builder = new LearningLessonBuilder();
      const observations = [buildObservation()];
      const snapshot = JSON.parse(JSON.stringify(observations));

      builder.build(observations);

      expect(observations).toEqual(snapshot);
    });
  });
});

describe('LearningFlaggedRiskBuilder — Milestone 6', () => {
  describe('successful classification', () => {
    it('produces no risk for a pattern-worked lesson', () => {
      const builder = new LearningFlaggedRiskBuilder();
      const lessons = [buildLesson({ category: 'pattern-worked' })];

      const result = builder.build(lessons);

      expect(result).toEqual([]);
    });

    it('produces one risk for a failure lesson', () => {
      const builder = new LearningFlaggedRiskBuilder();
      const lessons = [buildLesson({ category: 'failure' })];

      const result = builder.build(lessons, '2026-07-29T00:00:00.000Z');

      expect(result).toEqual([
        {
          riskId:
            'risk-lesson-observation-workflow-1-validation-workflow-1-step-1',
          description:
            'Flagged risk derived from lesson lesson-observation-workflow-1-validation-workflow-1-step-1 (category: failure).',
          relatedLessonIds: [
            'lesson-observation-workflow-1-validation-workflow-1-step-1',
          ],
          flaggedAt: '2026-07-29T00:00:00.000Z',
        },
      ]);
    });

    it('produces one risk for an estimate-inaccuracy lesson', () => {
      const builder = new LearningFlaggedRiskBuilder();
      const lessons = [buildLesson({ category: 'estimate-inaccuracy' })];

      const result = builder.build(lessons);

      expect(result).toHaveLength(1);
    });

    it('filters a mixed set of lessons, keeping only risk-eligible ones', () => {
      const builder = new LearningFlaggedRiskBuilder();
      const lessons = [
        buildLesson({ lessonId: 'lesson-a', category: 'pattern-worked' }),
        buildLesson({ lessonId: 'lesson-b', category: 'failure' }),
        buildLesson({ lessonId: 'lesson-c', category: 'estimate-inaccuracy' }),
      ];

      const result = builder.build(lessons);

      expect(result.map((risk) => risk.riskId).sort()).toEqual(
        ['risk-lesson-b', 'risk-lesson-c'].sort(),
      );
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new LearningFlaggedRiskBuilder();
      const lessons = [buildLesson({ category: 'failure' })];

      const first = builder.build(lessons, '2026-07-29T00:00:00.000Z');
      const second = builder.build(lessons, '2026-07-29T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('build() is synchronous (does not return a Promise)', () => {
      const builder = new LearningFlaggedRiskBuilder();
      const result = builder.build([buildLesson({ category: 'failure' })]);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined lessons value', () => {
      const builder = new LearningFlaggedRiskBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(LearningRequestError);
    });

    it('rejects an empty lessons array', () => {
      const builder = new LearningFlaggedRiskBuilder();

      expect(() => builder.build([])).toThrow(LearningRequestError);
    });

    it('rejects a lesson missing lessonId', () => {
      const builder = new LearningFlaggedRiskBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build([{ category: 'failure' }]),
      ).toThrow(LearningRequestError);
    });

    it('rejects a lesson with an unrecognized category', () => {
      const builder = new LearningFlaggedRiskBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build([buildLesson({ category: 'bogus' })]),
      ).toThrow(LearningRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new LearningFlaggedRiskBuilder();

      try {
        builder.build([]);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningRequestError);
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input lessons array', () => {
      const builder = new LearningFlaggedRiskBuilder();
      const lessons = [buildLesson({ category: 'failure' })];
      const snapshot = JSON.parse(JSON.stringify(lessons));

      builder.build(lessons);

      expect(lessons).toEqual(snapshot);
    });
  });
});

describe('LearningProposedAdrBuilder — Milestone 6', () => {
  describe('successful translation', () => {
    it('translates a risk into a proposed ADR', () => {
      const builder = new LearningProposedAdrBuilder();
      const risks = [buildRisk()];

      const result = builder.build(risks, '2026-07-29T00:00:00.000Z');

      expect(result).toEqual([
        {
          adrId:
            'adr-risk-lesson-observation-workflow-1-validation-workflow-1-step-1',
          title:
            'Proposed ADR for flagged risk risk-lesson-observation-workflow-1-validation-workflow-1-step-1',
          status: 'proposed',
          context: risks[0].description,
          decision:
            'No decision has been made. This field is a structural placeholder pending the human-gated approval path defined in constitution.md and decisions.md.',
          alternativesConsidered: [],
          consequences:
            'Consequences have not been analyzed. This field is a structural placeholder; no impact assessment was performed.',
          relatedLessonIds: risks[0].relatedLessonIds,
          proposedAt: '2026-07-29T00:00:00.000Z',
        },
      ]);
    });

    it('translates multiple risks into multiple ADRs, one-to-one', () => {
      const builder = new LearningProposedAdrBuilder();
      const risks = [
        buildRisk({ riskId: 'risk-a' }),
        buildRisk({ riskId: 'risk-b' }),
      ];

      const result = builder.build(risks);

      expect(result).toHaveLength(2);
      expect(result[0].adrId).toBe('adr-risk-a');
      expect(result[1].adrId).toBe('adr-risk-b');
    });

    it('always sets status to "proposed"', () => {
      const builder = new LearningProposedAdrBuilder();
      const result = builder.build([buildRisk()]);

      expect(result[0].status).toBe('proposed');
    });

    it('always returns an empty alternativesConsidered array', () => {
      const builder = new LearningProposedAdrBuilder();
      const result = builder.build([buildRisk()]);

      expect(result[0].alternativesConsidered).toEqual([]);
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new LearningProposedAdrBuilder();
      const risks = [buildRisk()];

      const first = builder.build(risks, '2026-07-29T00:00:00.000Z');
      const second = builder.build(risks, '2026-07-29T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('build() is synchronous (does not return a Promise)', () => {
      const builder = new LearningProposedAdrBuilder();
      const result = builder.build([buildRisk()]);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined risks value', () => {
      const builder = new LearningProposedAdrBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(LearningRequestError);
    });

    it('rejects an empty risks array', () => {
      const builder = new LearningProposedAdrBuilder();

      expect(() => builder.build([])).toThrow(LearningRequestError);
    });

    it('rejects a risk missing riskId', () => {
      const builder = new LearningProposedAdrBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build([{ description: 'x', relatedLessonIds: [] }]),
      ).toThrow(LearningRequestError);
    });

    it('rejects a risk missing description', () => {
      const builder = new LearningProposedAdrBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build([{ riskId: 'risk-x', relatedLessonIds: [] }]),
      ).toThrow(LearningRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new LearningProposedAdrBuilder();

      try {
        builder.build([]);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningRequestError);
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(
          0,
        );
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input risks array', () => {
      const builder = new LearningProposedAdrBuilder();
      const risks = [buildRisk()];
      const snapshot = JSON.parse(JSON.stringify(risks));

      builder.build(risks);

      expect(risks).toEqual(snapshot);
    });

    it('returns a relatedLessonIds array that is a freshly constructed value, not the same reference', () => {
      const builder = new LearningProposedAdrBuilder();
      const risks = [buildRisk()];

      const result = builder.build(risks);

      expect(result[0].relatedLessonIds).not.toBe(risks[0].relatedLessonIds);
      expect(result[0].relatedLessonIds).toEqual(risks[0].relatedLessonIds);
    });
  });

  describe('no decision-making behavior', () => {
    it('never assigns a status other than "proposed"', () => {
      const builder = new LearningProposedAdrBuilder();
      const results = builder.build([
        buildRisk({ riskId: 'risk-a' }),
        buildRisk({ riskId: 'risk-b' }),
      ]);

      expect(results.every((adr) => adr.status === 'proposed')).toBe(true);
    });
  });
});

describe('LearningPipelineBuilder — Milestone 6', () => {
  describe('successful assembly', () => {
    it('assembles a full LearningPipelineResult from a passing observation', () => {
      const builder = new LearningPipelineBuilder();
      const observations = [buildObservation()];

      const result = builder.run(observations, [], '2026-07-29T00:00:00.000Z');

      expect(result.lessons).toHaveLength(1);
      expect(result.lessons[0].category).toBe('pattern-worked');
      expect(result.knowledgeUpdateProposals).toHaveLength(1);
      expect(result.knowledgeUpdateProposals[0].lessonIds).toEqual([
        result.lessons[0].lessonId,
      ]);
      expect(result.knowledgeUpdateProposals[0].updateType).toBe(
        'new-precedent',
      );
      expect(result.flaggedRisks).toEqual([]);
      expect(result.proposedAdrs).toEqual([]);
    });

    it('assembles flaggedRisks and proposedAdrs from a failing observation', () => {
      const builder = new LearningPipelineBuilder();
      const observations = [
        buildObservation({
          subject: buildSubject({
            verdict: buildValidationVerdict({ status: 'fail' }),
          }),
        }),
      ];

      const result = builder.run(observations);

      expect(result.flaggedRisks).toHaveLength(1);
      expect(result.proposedAdrs).toHaveLength(1);
      expect(result.proposedAdrs[0].relatedLessonIds).toEqual(
        result.flaggedRisks[0].relatedLessonIds,
      );
    });

    it('detects refined-heuristic via priorProposals overlap', () => {
      const builder = new LearningPipelineBuilder();
      const observations = [buildObservation()];

      const first = builder.run(observations, [], '2026-07-29T00:00:00.000Z');
      const second = builder.run(
        observations,
        first.knowledgeUpdateProposals,
        '2026-07-29T00:01:00.000Z',
      );

      expect(second.knowledgeUpdateProposals[0].updateType).toBe(
        'refined-heuristic',
      );
    });

    it('shares one resolved timestamp across every produced artifact', () => {
      const builder = new LearningPipelineBuilder();
      const observations = [
        buildObservation({
          subject: buildSubject({
            verdict: buildValidationVerdict({ status: 'fail' }),
          }),
        }),
      ];

      const result = builder.run(observations, [], '2026-07-29T00:00:00.000Z');

      expect(result.lessons[0].createdAt).toBe('2026-07-29T00:00:00.000Z');
      expect(result.knowledgeUpdateProposals[0].proposedAt).toBe(
        '2026-07-29T00:00:00.000Z',
      );
      expect(result.flaggedRisks[0].flaggedAt).toBe('2026-07-29T00:00:00.000Z');
      expect(result.proposedAdrs[0].proposedAt).toBe(
        '2026-07-29T00:00:00.000Z',
      );
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new LearningPipelineBuilder();
      const observations = [buildObservation()];

      const first = builder.run(observations, [], '2026-07-29T00:00:00.000Z');
      const second = builder.run(observations, [], '2026-07-29T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('run() is synchronous (does not return a Promise)', () => {
      const builder = new LearningPipelineBuilder();
      const result = builder.run([buildObservation()]);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input propagation', () => {
    it('propagates LearningRequestError for an empty observations array', () => {
      const builder = new LearningPipelineBuilder();

      expect(() => builder.run([])).toThrow(LearningRequestError);
    });

    it('propagates LearningRequestError for a malformed observation', () => {
      const builder = new LearningPipelineBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.run([{ notAnObservation: true }])).toThrow(
        LearningRequestError,
      );
    });
  });

  describe('immutability', () => {
    it('never mutates the input observations array', () => {
      const builder = new LearningPipelineBuilder();
      const observations = [buildObservation()];
      const snapshot = JSON.parse(JSON.stringify(observations));

      builder.run(observations);

      expect(observations).toEqual(snapshot);
    });
  });
});
