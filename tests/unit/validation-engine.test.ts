import { describe, expect, it } from 'vitest';

import {
  NotImplementedError,
  ValidationBuilder,
  ValidationEngine,
  ValidationEvidenceCollector,
  ValidationPipelineRunner,
  ValidationRequestError,
  ValidationValidator,
  type ValidationSubject,
  type ValidationVerdict,
} from '../../engines/validation/src';
import type {
  ExecutionRecord,
  ExecutionSummary,
} from '../../engines/execution/src/models/types';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

const EXPECTED_CAPABILITIES = [
  'validation.validate',
  'validation.get-validation-status',
  'validation.approve-validation',
  'validation.reject-validation',
];

function buildExecutionRecord(
  overrides: Partial<ExecutionRecord> = {},
): ExecutionRecord {
  return {
    executionId: 'execution-workflow-1-step-1',
    target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
    status: 'completed',
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

function buildExecutionSummary(
  overrides: Partial<ExecutionSummary> = {},
): ExecutionSummary {
  return {
    executionId: 'execution-workflow-1-step-1',
    status: 'completed',
    target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    isTerminal: true,
    isCancelled: false,
    ...overrides,
  };
}

function buildValidVerdict(
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
    status: 'partial',
    checks: [],
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

describe('ValidationEngine — Milestone 5 (Structural Evidence Collection)', () => {
  describe('runtime lifecycle (unchanged from Milestone 1)', () => {
    it('starts in the created state and transitions through the full lifecycle', async () => {
      const engine = new ValidationEngine();

      expect(engine.getState()).toBe('created');

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');

      await engine.start();
      expect(engine.getState()).toBe('running');

      await engine.stop();
      expect(engine.getState()).toBe('stopped');
    });

    it('allows re-initialization after stop', async () => {
      const engine = new ValidationEngine();

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
      const engine = new ValidationEngine();

      await engine.initialize();
      await engine.start();
      await engine.stop();

      await expect(engine.stop()).resolves.not.toThrow();
      expect(engine.getState()).toBe('stopped');
    });
  });

  describe('health (unchanged from Milestone 1)', () => {
    it('reports healthy status through every lifecycle stage', async () => {
      const engine = new ValidationEngine();

      await engine.initialize();
      expect((await engine.health()).status).toBe('healthy');

      await engine.start();
      expect((await engine.health()).status).toBe('healthy');

      await engine.stop();
      expect((await engine.health()).status).toBe('healthy');
    });
  });

  describe('metadata (unchanged from Milestone 1)', () => {
    it('reports the expected identity fields', () => {
      const engine = new ValidationEngine();
      const metadata = engine.metadata();

      expect(metadata.id).toBe('validation-engine');
      expect(metadata.name).toBe('Validation Engine');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.contractVersion).toBe(ENGINE_API_CONTRACT_VERSION);
    });

    it('advertises the complete planned capability list', () => {
      const engine = new ValidationEngine();
      expect(engine.metadata().capabilities).toEqual(EXPECTED_CAPABILITIES);
    });

    it('allows overriding id, name, and version via options', () => {
      const engine = new ValidationEngine({
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

  describe('version, contractVersion, getState (unchanged from Milestone 1)', () => {
    it('version() matches metadata().version', () => {
      const engine = new ValidationEngine();
      expect(engine.version()).toBe(engine.metadata().version);
    });

    it('contractVersion() matches the shared contract constant', () => {
      const engine = new ValidationEngine();
      expect(engine.contractVersion()).toBe(ENGINE_API_CONTRACT_VERSION);
    });

    it('getState() reflects the current lifecycle state', async () => {
      const engine = new ValidationEngine();
      expect(engine.getState()).toBe('created');

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');
    });
  });

  describe('public API stub existence', () => {
    it('exposes validate, getValidationStatus, approveValidation, and rejectValidation as functions', () => {
      const engine = new ValidationEngine();

      expect(typeof engine.validate).toBe('function');
      expect(typeof engine.getValidationStatus).toBe('function');
      expect(typeof engine.approveValidation).toBe('function');
      expect(typeof engine.rejectValidation).toBe('function');
    });
  });

  describe('ValidationEngine.validate() — delegation to ValidationPipelineRunner (ValidationBuilder unchanged since Milestone 3; evidence new in Milestone 5)', () => {
    it('returns a ValidationPipelineResult for a well-formed subject with only a record', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = await engine.validate({ subject });

      expect(result).toEqual({
        verdict: {
          validationId: 'validation-workflow-1-step-1',
          target: {
            executionId: 'execution-workflow-1-step-1',
            workflowId: 'workflow-1',
            itemId: 'step-1',
            itemType: 'step',
          },
          status: 'partial',
          checks: [],
          createdAt: result.verdict.createdAt,
          updatedAt: result.verdict.createdAt,
        },
        evidence: [
          {
            validationId: 'validation-workflow-1-step-1',
            source: 'execution-record',
            description:
              'Validation verdict validation-workflow-1-step-1 was structurally derived from Execution Engine ExecutionRecord execution-workflow-1-step-1.',
            capturedAt: result.verdict.createdAt,
          },
        ],
        escalations: [],
      });
    });

    it('returns a ValidationPipelineResult for a well-formed subject with a record and summary', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = {
        record: buildExecutionRecord(),
        summary: buildExecutionSummary(),
      };

      const result = await engine.validate({ subject });

      expect(result.verdict.target).toEqual({
        executionId: 'execution-workflow-1-step-1',
        workflowId: 'workflow-1',
        itemId: 'step-1',
        itemType: 'step',
      });
    });

    it('never reads policyRules or governanceRules', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const withRules = await engine.validate({
        subject,
        policyRules: [
          {
            ruleId: 'p1',
            description: 'd',
            checkType: 'policy',
            severity: 'blocking',
          },
        ],
        governanceRules: [
          { ruleId: 'g1', description: 'd', severity: 'blocking' },
        ],
      });
      const withoutRules = await engine.validate({ subject });

      expect(withRules).toEqual(withoutRules);
    });

    it('rejects with ValidationRequestError for a null/undefined request', async () => {
      const engine = new ValidationEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.validate(null)).rejects.toBeInstanceOf(
        ValidationRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.validate(undefined)).rejects.toBeInstanceOf(
        ValidationRequestError,
      );
    });

    it('rejects with ValidationRequestError for a non-object request', async () => {
      const engine = new ValidationEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.validate('not-an-object')).rejects.toBeInstanceOf(
        ValidationRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.validate(['array'])).rejects.toBeInstanceOf(
        ValidationRequestError,
      );
    });

    it('propagates ValidationRequestError from ValidationBuilder when subject itself is malformed', async () => {
      const engine = new ValidationEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.validate({ subject: null })).rejects.toBeInstanceOf(
        ValidationRequestError,
      );
      await expect(
        // @ts-expect-error — intentionally malformed for the test
        engine.validate({ subject: { record: { executionId: 'x' } } }),
      ).rejects.toBeInstanceOf(ValidationRequestError);
    });

    it('does not mutate the subject passed to validate()', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const snapshot = JSON.parse(JSON.stringify(subject));

      await engine.validate({ subject });

      expect(subject).toEqual(snapshot);
    });
  });

  describe('ValidationEngine.validate() — structural evidence collection (new in Milestone 5)', () => {
    it('populates evidence with source "execution-record" when subject has no summary', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = await engine.validate({ subject });

      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0].source).toBe('execution-record');
    });

    it('populates evidence with source "execution-summary" when subject has a summary', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = {
        record: buildExecutionRecord(),
        summary: buildExecutionSummary(),
      };

      const result = await engine.validate({ subject });

      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0].source).toBe('execution-summary');
    });

    it("evidence's capturedAt matches the verdict's createdAt/updatedAt on a freshly built result", async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = await engine.validate({ subject });

      expect(result.evidence[0].capturedAt).toBe(result.verdict.createdAt);
      expect(result.evidence[0].capturedAt).toBe(result.verdict.updatedAt);
    });

    it("evidence's validationId matches the verdict's validationId", async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = await engine.validate({ subject });

      expect(result.evidence[0].validationId).toBe(result.verdict.validationId);
    });

    it('escalations remain always empty', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = await engine.validate({ subject });

      expect(result.escalations).toEqual([]);
    });
  });

  describe('ValidationEngine.getValidationStatus() — delegation to ValidationValidator (new in Milestone 4)', () => {
    it('returns a valid ValidationStructuralResult for a well-formed verdict', async () => {
      const engine = new ValidationEngine();
      const verdict = buildValidVerdict();

      const result = await engine.getValidationStatus({ verdict });

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.validationId).toBe(verdict.validationId);
    });

    it('rejects with ValidationRequestError for a null/undefined request', async () => {
      const engine = new ValidationEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.getValidationStatus(null)).rejects.toBeInstanceOf(
        ValidationRequestError,
      );
    });

    it('propagates ValidationRequestError from ValidationValidator when verdict itself is malformed', async () => {
      const engine = new ValidationEngine();

      await expect(
        // @ts-expect-error — intentionally malformed for the test
        engine.getValidationStatus({ verdict: null }),
      ).rejects.toBeInstanceOf(ValidationRequestError);
    });

    it('delegates to ValidationValidator such that engine and direct-validator output are identical', async () => {
      const engine = new ValidationEngine();
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict();

      const direct = validator.validate(verdict, '2026-07-24T00:00:00.000Z');
      const viaEngine = await engine.getValidationStatus({ verdict });

      expect(viaEngine.valid).toBe(direct.valid);
      expect(viaEngine.issues).toEqual(direct.issues);
      expect(viaEngine.validationId).toBe(direct.validationId);
    });
  });

  describe('NotImplementedError behavior — approveValidation and rejectValidation remain unimplemented stubs', () => {
    it('approveValidation() always throws NotImplementedError', async () => {
      const engine = new ValidationEngine();

      await expect(
        engine.approveValidation({
          validationId: 'validation-1',
          reason: 'looks good',
        }),
      ).rejects.toBeInstanceOf(NotImplementedError);
    });

    it('rejectValidation() always throws NotImplementedError', async () => {
      const engine = new ValidationEngine();

      await expect(
        engine.rejectValidation({
          validationId: 'validation-1',
          reason: 'missing evidence',
        }),
      ).rejects.toBeInstanceOf(NotImplementedError);
    });

    it('NotImplementedError carries a descriptive message per method', async () => {
      const engine = new ValidationEngine();

      await expect(
        engine.approveValidation({ validationId: 'validation-1' }),
      ).rejects.toThrow(/approveValidation/);
      await expect(
        engine.rejectValidation({ validationId: 'validation-1' }),
      ).rejects.toThrow(/rejectValidation/);
    });

    it('approveValidation() and rejectValidation() throw regardless of engine lifecycle state', async () => {
      const engine = new ValidationEngine();
      await engine.initialize();
      await engine.start();

      await expect(
        engine.approveValidation({ validationId: 'validation-1' }),
      ).rejects.toBeInstanceOf(NotImplementedError);
      await expect(
        engine.rejectValidation({ validationId: 'validation-1' }),
      ).rejects.toBeInstanceOf(NotImplementedError);

      await engine.stop();
      await expect(
        engine.approveValidation({ validationId: 'validation-1' }),
      ).rejects.toBeInstanceOf(NotImplementedError);
    });

    it('approveValidation() and rejectValidation() perform no state transition of any kind', async () => {
      const engine = new ValidationEngine();
      await engine.initialize();
      await engine.start();

      await expect(
        engine.approveValidation({ validationId: 'validation-1' }),
      ).rejects.toBeInstanceOf(NotImplementedError);
      expect(engine.getState()).toBe('running');
    });
  });
});

describe('ValidationBuilder — Milestone 3 (unchanged in Milestone 5)', () => {
  describe('successful translation', () => {
    it('translates a subject with only a record into a ValidationPipelineResult', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = builder.build(subject, '2026-07-24T00:00:00.000Z');

      expect(result).toEqual({
        verdict: {
          validationId: 'validation-workflow-1-step-1',
          target: {
            executionId: 'execution-workflow-1-step-1',
            workflowId: 'workflow-1',
            itemId: 'step-1',
            itemType: 'step',
          },
          status: 'partial',
          checks: [],
          createdAt: '2026-07-24T00:00:00.000Z',
          updatedAt: '2026-07-24T00:00:00.000Z',
        },
        evidence: [],
        escalations: [],
      });
    });

    it('prefers subject.summary.target and subject.summary.executionId when summary is present', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = {
        record: buildExecutionRecord({ executionId: 'execution-record-id' }),
        summary: buildExecutionSummary({
          executionId: 'execution-summary-id',
          target: {
            workflowId: 'workflow-summary',
            itemId: 'item-summary',
            itemType: 'task',
          },
        }),
      };

      const result = builder.build(subject, '2026-07-24T00:00:00.000Z');

      expect(result.verdict.target).toEqual({
        executionId: 'execution-summary-id',
        workflowId: 'workflow-summary',
        itemId: 'item-summary',
        itemType: 'task',
      });
    });

    it('derives validationId deterministically from workflowId and itemId', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = {
        record: buildExecutionRecord({
          target: { workflowId: 'wf-42', itemId: 'item-7', itemType: 'task' },
        }),
      };

      const result = builder.build(subject);

      expect(result.verdict.validationId).toBe('validation-wf-42-item-7');
    });

    it('sets createdAt and updatedAt to the same value on a freshly built verdict', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = builder.build(subject);

      expect(result.verdict.createdAt).toBe(result.verdict.updatedAt);
    });

    it('always returns empty checks, evidence, and escalations', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = builder.build(subject);

      expect(result.verdict.checks).toEqual([]);
      expect(result.evidence).toEqual([]);
      expect(result.escalations).toEqual([]);
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const first = builder.build(subject, '2026-07-24T00:00:00.000Z');
      const second = builder.build(subject, '2026-07-24T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('produces identical output across separate ValidationBuilder instances', () => {
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const first = new ValidationBuilder().build(
        subject,
        '2026-07-24T00:00:00.000Z',
      );
      const second = new ValidationBuilder().build(
        subject,
        '2026-07-24T00:00:00.000Z',
      );

      expect(first).toEqual(second);
    });

    it('build() is synchronous (does not return a Promise)', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = builder.build(subject);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined subject', () => {
      const builder = new ValidationBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(ValidationRequestError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(undefined)).toThrow(ValidationRequestError);
    });

    it('rejects a non-object subject', () => {
      const builder = new ValidationBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build('not-an-object')).toThrow(
        ValidationRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(['array'])).toThrow(ValidationRequestError);
    });

    it('rejects a subject missing record entirely', () => {
      const builder = new ValidationBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build({})).toThrow(ValidationRequestError);
    });

    it('rejects a subject whose record has no target', () => {
      const builder = new ValidationBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build({ record: { executionId: 'x' } })).toThrow(
        ValidationRequestError,
      );
    });

    it('rejects a subject whose record.target is missing workflowId', () => {
      const builder = new ValidationBuilder();

      expect(() =>
        builder.build({
          record: {
            executionId: 'x',
            // @ts-expect-error — intentionally malformed for the test
            target: { itemId: 'step-1', itemType: 'step' },
          },
        }),
      ).toThrow(ValidationRequestError);
    });

    it('validation errors carry structured issues', () => {
      const builder = new ValidationBuilder();

      try {
        // @ts-expect-error — intentionally malformed for the test
        builder.build(null);
        expect.unreachable('build() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationRequestError);
        const requestError = error as ValidationRequestError;
        expect(requestError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input subject', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const snapshot = JSON.parse(JSON.stringify(subject));

      builder.build(subject);

      expect(subject).toEqual(snapshot);
    });

    it('returns a target object that is a freshly constructed value, not the same reference', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = builder.build(subject);

      expect(result.verdict.target).not.toBe(subject.record.target);
      expect(result.verdict.target).toEqual({
        executionId: subject.record.executionId,
        ...subject.record.target,
      });
    });

    it('mutating the returned verdict target does not affect the original subject', () => {
      const builder = new ValidationBuilder();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = builder.build(subject);
      (result.verdict.target as { itemId: string }).itemId = 'mutated';

      expect(subject.record.target.itemId).toBe('step-1');
    });
  });
});

describe('ValidationValidator — Milestone 4 (unchanged in Milestone 5)', () => {
  describe('valid verdicts', () => {
    it('reports valid: true with no issues for a well-formed verdict', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict();

      const result = validator.validate(verdict, '2026-07-24T00:00:00.000Z');

      expect(result).toEqual({
        validationId: 'validation-workflow-1-step-1',
        valid: true,
        issues: [],
        validatedAt: '2026-07-24T00:00:00.000Z',
      });
    });

    it('reports valid: true for a verdict with well-formed checks', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict({
        checks: [
          {
            checkId: 'check-1',
            checkType: 'testing',
            status: 'pass',
            message: 'ok',
          },
        ],
      });

      const result = validator.validate(verdict);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  describe('structural issues (returned, not thrown)', () => {
    it('reports an issue for an unrecognized status', () => {
      const validator = new ValidationValidator();
      // @ts-expect-error — intentionally malformed for the test
      const verdict = buildValidVerdict({ status: 'bogus-status' });

      const result = validator.validate(verdict);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((issue) => issue.code === 'INVALID_STATUS'),
      ).toBe(true);
    });

    it('reports an issue for a missing validationId', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict({ validationId: '' });

      const result = validator.validate(verdict);

      expect(
        result.issues.some((issue) => issue.code === 'MISSING_VALIDATION_ID'),
      ).toBe(true);
    });

    it('reports an issue for a malformed createdAt', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict({ createdAt: 'not-a-date' });

      const result = validator.validate(verdict);

      expect(
        result.issues.some((issue) => issue.code === 'MISSING_CREATED_AT'),
      ).toBe(true);
    });

    it('reports an issue when updatedAt is earlier than createdAt', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict({
        createdAt: '2026-07-24T02:00:00.000Z',
        updatedAt: '2026-07-24T01:00:00.000Z',
      });

      const result = validator.validate(verdict);

      expect(result.valid).toBe(false);
    });

    it('reports an issue for an unrecognized itemType', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict({
        target: {
          executionId: 'execution-1',
          workflowId: 'workflow-1',
          itemId: 'step-1',
          // @ts-expect-error — intentionally malformed for the test
          itemType: 'bogus',
        },
      });

      const result = validator.validate(verdict);

      expect(result.valid).toBe(false);
    });

    it('reports an issue for a check with an unrecognized checkType', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict({
        checks: [
          {
            checkId: 'check-1',
            // @ts-expect-error — intentionally malformed for the test
            checkType: 'bogus',
            status: 'pass',
            message: 'ok',
          },
        ],
      });

      const result = validator.validate(verdict);

      expect(result.valid).toBe(false);
    });

    it('reports an issue when checks is not an array', () => {
      const validator = new ValidationValidator();
      // @ts-expect-error — intentionally malformed for the test
      const verdict = buildValidVerdict({ checks: 'not-an-array' });

      const result = validator.validate(verdict);

      expect(result.valid).toBe(false);
    });
  });

  describe('malformed shape (thrown, not returned as issues)', () => {
    it('throws ValidationRequestError for a null/undefined verdict', () => {
      const validator = new ValidationValidator();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => validator.validate(null)).toThrow(ValidationRequestError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => validator.validate(undefined)).toThrow(
        ValidationRequestError,
      );
    });

    it('throws ValidationRequestError for a non-object verdict', () => {
      const validator = new ValidationValidator();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => validator.validate('not-an-object')).toThrow(
        ValidationRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      expect(() => validator.validate(['array'])).toThrow(
        ValidationRequestError,
      );
    });

    it('throws ValidationRequestError when target is missing entirely', () => {
      const validator = new ValidationValidator();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        validator.validate({
          validationId: 'x',
          status: 'pass',
          checks: [],
          createdAt: 'a',
          updatedAt: 'a',
        }),
      ).toThrow(ValidationRequestError);
    });

    it('throws ValidationRequestError when target is null', () => {
      const validator = new ValidationValidator();

      expect(() =>
        validator.validate({
          validationId: 'x',
          // @ts-expect-error — intentionally malformed for the test
          target: null,
          status: 'pass',
          checks: [],
          createdAt: 'a',
          updatedAt: 'a',
        }),
      ).toThrow(ValidationRequestError);
    });

    it('validation errors carry structured issues', () => {
      const validator = new ValidationValidator();

      try {
        // @ts-expect-error — intentionally malformed for the test
        validator.validate(null);
        expect.unreachable('validate() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationRequestError);
        const requestError = error as ValidationRequestError;
        expect(requestError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('determinism and purity', () => {
    it('produces identical output for identical input and timestamp', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict();

      const first = validator.validate(verdict, '2026-07-24T00:00:00.000Z');
      const second = validator.validate(verdict, '2026-07-24T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('produces identical output across separate ValidationValidator instances', () => {
      const verdict = buildValidVerdict();

      const first = new ValidationValidator().validate(
        verdict,
        '2026-07-24T00:00:00.000Z',
      );
      const second = new ValidationValidator().validate(
        verdict,
        '2026-07-24T00:00:00.000Z',
      );

      expect(first).toEqual(second);
    });

    it('validate() is synchronous (does not return a Promise)', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict();

      const result = validator.validate(verdict);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('immutability', () => {
    it('never mutates the input verdict', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict();
      const snapshot = JSON.parse(JSON.stringify(verdict));

      validator.validate(verdict);

      expect(verdict).toEqual(snapshot);
    });
  });

  describe('no business-decision behavior', () => {
    it('does not add any fields beyond the documented ValidationStructuralResult shape', () => {
      const validator = new ValidationValidator();
      const verdict = buildValidVerdict();

      const result = validator.validate(verdict);

      expect(Object.keys(result).sort()).toEqual(
        ['issues', 'valid', 'validatedAt', 'validationId'].sort(),
      );
    });
  });
});

describe('ValidationEvidenceCollector — Milestone 5', () => {
  describe('successful collection', () => {
    it('returns exactly one evidence entry', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const builder = new ValidationBuilder();
      const built = builder.build(subject, '2026-07-24T00:00:00.000Z');

      const evidence = collector.collect(
        subject,
        built.verdict,
        '2026-07-24T00:00:00.000Z',
      );

      expect(evidence).toHaveLength(1);
    });

    it('reports source "execution-record" when subject has no summary', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(subject).verdict;

      const evidence = collector.collect(subject, verdict);

      expect(evidence[0].source).toBe('execution-record');
    });

    it('reports source "execution-summary" when subject has a summary', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = {
        record: buildExecutionRecord(),
        summary: buildExecutionSummary(),
      };
      const verdict = new ValidationBuilder().build(subject).verdict;

      const evidence = collector.collect(subject, verdict);

      expect(evidence[0].source).toBe('execution-summary');
    });

    it('carries the verdict.validationId verbatim', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(subject).verdict;

      const evidence = collector.collect(subject, verdict);

      expect(evidence[0].validationId).toBe(verdict.validationId);
    });

    it('description references the target executionId', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = {
        record: buildExecutionRecord({ executionId: 'execution-42' }),
      };
      const verdict = new ValidationBuilder().build(subject).verdict;

      const evidence = collector.collect(subject, verdict);

      expect(evidence[0].description).toContain('execution-42');
    });

    it('uses the supplied timestamp verbatim for capturedAt when provided', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(
        subject,
        '2026-07-24T00:00:00.000Z',
      ).verdict;

      const evidence = collector.collect(
        subject,
        verdict,
        '2026-07-25T00:00:00.000Z',
      );

      expect(evidence[0].capturedAt).toBe('2026-07-25T00:00:00.000Z');
    });

    it('does not populate attachments', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(subject).verdict;

      const evidence = collector.collect(subject, verdict);

      expect(evidence[0].attachments).toBeUndefined();
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(
        subject,
        '2026-07-24T00:00:00.000Z',
      ).verdict;

      const first = collector.collect(
        subject,
        verdict,
        '2026-07-24T00:00:00.000Z',
      );
      const second = collector.collect(
        subject,
        verdict,
        '2026-07-24T00:00:00.000Z',
      );

      expect(first).toEqual(second);
    });

    it('produces identical output across separate ValidationEvidenceCollector instances', () => {
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(
        subject,
        '2026-07-24T00:00:00.000Z',
      ).verdict;

      const first = new ValidationEvidenceCollector().collect(
        subject,
        verdict,
        '2026-07-24T00:00:00.000Z',
      );
      const second = new ValidationEvidenceCollector().collect(
        subject,
        verdict,
        '2026-07-24T00:00:00.000Z',
      );

      expect(first).toEqual(second);
    });

    it('collect() is synchronous (does not return a Promise)', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(subject).verdict;

      const result = collector.collect(subject, verdict);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined subject', () => {
      const collector = new ValidationEvidenceCollector();
      const verdict = buildValidVerdict();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => collector.collect(null, verdict)).toThrow(
        ValidationRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      expect(() => collector.collect(undefined, verdict)).toThrow(
        ValidationRequestError,
      );
    });

    it('rejects a non-object subject', () => {
      const collector = new ValidationEvidenceCollector();
      const verdict = buildValidVerdict();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => collector.collect('not-an-object', verdict)).toThrow(
        ValidationRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      expect(() => collector.collect(['array'], verdict)).toThrow(
        ValidationRequestError,
      );
    });

    it('rejects a null/undefined verdict', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      // @ts-expect-error — intentionally malformed for the test
      expect(() => collector.collect(subject, null)).toThrow(
        ValidationRequestError,
      );
      // @ts-expect-error — intentionally malformed for the test
      expect(() => collector.collect(subject, undefined)).toThrow(
        ValidationRequestError,
      );
    });

    it('rejects a verdict missing target entirely', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        collector.collect(subject, {
          validationId: 'x',
          status: 'partial',
          checks: [],
        }),
      ).toThrow(ValidationRequestError);
    });

    it('validation errors carry structured issues', () => {
      const collector = new ValidationEvidenceCollector();
      const verdict = buildValidVerdict();

      try {
        // @ts-expect-error — intentionally malformed for the test
        collector.collect(null, verdict);
        expect.unreachable('collect() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationRequestError);
        const requestError = error as ValidationRequestError;
        expect(requestError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('immutability', () => {
    it('never mutates the input subject', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(subject).verdict;
      const subjectSnapshot = JSON.parse(JSON.stringify(subject));

      collector.collect(subject, verdict);

      expect(subject).toEqual(subjectSnapshot);
    });

    it('never mutates the input verdict', () => {
      const collector = new ValidationEvidenceCollector();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const verdict = new ValidationBuilder().build(subject).verdict;
      const verdictSnapshot = JSON.parse(JSON.stringify(verdict));

      collector.collect(subject, verdict);

      expect(verdict).toEqual(verdictSnapshot);
    });
  });
});

describe('ValidationPipelineRunner — Milestone 5', () => {
  describe('successful composition', () => {
    it('composes ValidationBuilder and ValidationEvidenceCollector output into one ValidationPipelineResult', () => {
      const runner = new ValidationPipelineRunner();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = runner.run(subject, '2026-07-24T00:00:00.000Z');

      const expectedVerdict = new ValidationBuilder().build(
        subject,
        '2026-07-24T00:00:00.000Z',
      ).verdict;
      const expectedEvidence = new ValidationEvidenceCollector().collect(
        subject,
        expectedVerdict,
        '2026-07-24T00:00:00.000Z',
      );

      expect(result.verdict).toEqual(expectedVerdict);
      expect(result.evidence).toEqual(expectedEvidence);
      expect(result.escalations).toEqual([]);
    });

    it('resolves a single timestamp shared by the verdict and its evidence when omitted', () => {
      const runner = new ValidationPipelineRunner();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = runner.run(subject);

      expect(result.evidence[0].capturedAt).toBe(result.verdict.createdAt);
      expect(result.evidence[0].capturedAt).toBe(result.verdict.updatedAt);
    });

    it('accepts injected ValidationBuilder and ValidationEvidenceCollector instances', () => {
      const builder = new ValidationBuilder();
      const collector = new ValidationEvidenceCollector();
      const runner = new ValidationPipelineRunner(builder, collector);
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = runner.run(subject, '2026-07-24T00:00:00.000Z');

      expect(result.verdict.validationId).toBe('validation-workflow-1-step-1');
      expect(result.evidence).toHaveLength(1);
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const runner = new ValidationPipelineRunner();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const first = runner.run(subject, '2026-07-24T00:00:00.000Z');
      const second = runner.run(subject, '2026-07-24T00:00:00.000Z');

      expect(first).toEqual(second);
    });

    it('produces identical output across separate ValidationPipelineRunner instances', () => {
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const first = new ValidationPipelineRunner().run(
        subject,
        '2026-07-24T00:00:00.000Z',
      );
      const second = new ValidationPipelineRunner().run(
        subject,
        '2026-07-24T00:00:00.000Z',
      );

      expect(first).toEqual(second);
    });

    it('run() is synchronous (does not return a Promise)', () => {
      const runner = new ValidationPipelineRunner();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = runner.run(subject);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('malformed input propagation', () => {
    it('propagates ValidationRequestError from ValidationBuilder for a malformed subject', () => {
      const runner = new ValidationPipelineRunner();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => runner.run(null)).toThrow(ValidationRequestError);
    });

    it('propagates ValidationRequestError for a subject missing record entirely', () => {
      const runner = new ValidationPipelineRunner();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => runner.run({})).toThrow(ValidationRequestError);
    });
  });

  describe('immutability', () => {
    it('never mutates the input subject', () => {
      const runner = new ValidationPipelineRunner();
      const subject: ValidationSubject = { record: buildExecutionRecord() };
      const snapshot = JSON.parse(JSON.stringify(subject));

      runner.run(subject);

      expect(subject).toEqual(snapshot);
    });
  });

  describe('boundary conditions', () => {
    it('escalations is always an empty array, matching ValidationBuilder Milestone 3 behavior', () => {
      const runner = new ValidationPipelineRunner();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = runner.run(subject, '2026-07-24T00:00:00.000Z');

      expect(result.escalations).toEqual([]);
    });

    it('evidence array is always exactly length 1 for a well-formed subject', () => {
      const runner = new ValidationPipelineRunner();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      const result = runner.run(subject, '2026-07-24T00:00:00.000Z');

      expect(result.evidence).toHaveLength(1);
    });
  });
});
