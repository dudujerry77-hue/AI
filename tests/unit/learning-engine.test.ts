import { describe, expect, it } from 'vitest';

import {
  LearningEngine,
  LearningObservationBuilder,
  LearningProposalBuilder,
  LearningRequestError,
  type LearningObservation,
  type LearningSubject,
} from '../../engines/learning/src';
import type { WorkflowResult } from '../../engines/orchestrator/src/models/types';
import type { ValidationVerdict } from '../../engines/validation/src/models/types';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

const EXPECTED_CAPABILITIES = ['learning.observe-cycle', 'learning.generate-proposal'];

function buildWorkflowResult(overrides: Partial<WorkflowResult> = {}): WorkflowResult {
  return {
    workflowId: 'workflow-1',
    status: 'completed',
    completedStepIds: ['step-1'],
    failedStepIds: [],
    ...overrides,
  };
}

function buildValidationVerdict(overrides: Partial<ValidationVerdict> = {}): ValidationVerdict {
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

function buildSubject(overrides: Partial<LearningSubject> = {}): LearningSubject {
  return {
    outcome: buildWorkflowResult(),
    verdict: buildValidationVerdict(),
    ...overrides,
  };
}

function buildObservation(overrides: Partial<LearningObservation> = {}): LearningObservation {
  return {
    observationId: 'observation-workflow-1-validation-workflow-1-step-1',
    subject: buildSubject(),
    stage: 'outcome',
    observedAt: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('LearningEngine — Milestone 4 (Structural Signal Extraction and Proposal Composition)', () => {
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

    it('advertises the observeCycle and generateProposal capabilities', () => {
      const engine = new LearningEngine();
      expect(engine.metadata().capabilities).toEqual(EXPECTED_CAPABILITIES);
    });

    it('allows overriding id, name, and version via options', () => {
      const engine = new LearningEngine({ id: 'custom-id', name: 'Custom Name', version: '2.0.0' });
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

  describe('public API surface (Milestone 4 boundary)', () => {
    it('exposes observeCycle and generateProposal as functions', () => {
      const engine = new LearningEngine();

      expect(typeof engine.observeCycle).toBe('function');
      expect(typeof engine.generateProposal).toBe('function');
    });

    it('exposes no other business methods', () => {
      const engine = new LearningEngine();

      // Any of these existing would indicate a business method was
      // added without explicit grounding in architecture.md or the
      // Phase 012 specification.
      expect((engine as unknown as Record<string, unknown>).distillLesson).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).proposeAdr).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).flagRisk).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).getLearningStatus).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).applyLearning).toBeUndefined();
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
      await expect(engine.observeCycle(null)).rejects.toBeInstanceOf(LearningRequestError);
      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.observeCycle(undefined)).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('rejects with LearningRequestError for a non-object request', async () => {
      const engine = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.observeCycle('not-an-object')).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('propagates LearningRequestError from LearningObservationBuilder when subject itself is malformed', async () => {
      const engine = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.observeCycle({ subject: null })).rejects.toBeInstanceOf(LearningRequestError);
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
        proposalId: 'proposal-observation-workflow-1-validation-workflow-1-step-1',
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
      await expect(engine.generateProposal(null)).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('propagates LearningRequestError from LearningProposalBuilder when observations is empty', async () => {
      const engine = new LearningEngine();

      await expect(engine.generateProposal({ observations: [] })).rejects.toBeInstanceOf(LearningRequestError);
    });

    it('does not mutate the observations passed to generateProposal()', async () => {
      const engine = new LearningEngine();
      const observations = [buildObservation()];
      const snapshot = JSON.parse(JSON.stringify(observations));

      await engine.generateProposal({ observations });

      expect(observations).toEqual(snapshot);
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

      const first = new LearningObservationBuilder().build(subject, '2026-07-29T00:00:00.000Z');
      const second = new LearningObservationBuilder().build(subject, '2026-07-29T00:00:00.000Z');

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

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build({ verdict: buildValidationVerdict() })).toThrow(LearningRequestError);
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
      expect(() => builder.build({ outcome: buildWorkflowResult() })).toThrow(LearningRequestError);
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
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(0);
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
        proposalId: 'proposal-observation-workflow-1-validation-workflow-1-step-1',
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
      expect(() => builder.build([{ notAnObservation: true }])).toThrow(LearningRequestError);
    });

    it('rejects an observation missing observationId', () => {
      const builder = new LearningProposalBuilder();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        builder.build([{ subject: buildSubject(), stage: 'outcome', observedAt: 'x' }]),
      ).toThrow(LearningRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new LearningProposalBuilder();

      try {
        builder.build([]);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningRequestError);
        expect((error as LearningRequestError).issues.length).toBeGreaterThan(0);
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
});
