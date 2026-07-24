import { describe, expect, it } from 'vitest';

import {
  NotImplementedError,
  ValidationEngine,
  type ValidationCheckResult,
  type ValidationEvidence,
  type ValidationSubject,
  type ValidationTarget,
  type ValidationVerdict,
} from '../../engines/validation/src';
import type { ExecutionRecord } from '../../engines/execution/src/models/types';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

const EXPECTED_CAPABILITIES = [
  'validation.validate',
  'validation.get-validation-status',
  'validation.approve-validation',
  'validation.reject-validation',
];

function buildExecutionRecord(overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
  return {
    executionId: 'execution-workflow-1-step-1',
    target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
    status: 'completed',
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

describe('ValidationEngine — Milestone 1 (Runtime Foundation)', () => {
  describe('runtime lifecycle', () => {
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

  describe('health', () => {
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

  describe('metadata', () => {
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
      const engine = new ValidationEngine({ id: 'custom-id', name: 'Custom Name', version: '2.0.0' });
      const metadata = engine.metadata();

      expect(metadata.id).toBe('custom-id');
      expect(metadata.name).toBe('Custom Name');
      expect(metadata.version).toBe('2.0.0');
    });
  });

  describe('version, contractVersion, getState', () => {
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

  describe('NotImplementedError behavior for every public API method', () => {
    it('validate() always throws NotImplementedError', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = { record: buildExecutionRecord() };

      await expect(engine.validate({ subject })).rejects.toBeInstanceOf(NotImplementedError);
    });

    it('validate() throws even with a well-formed subject and never reads its fields', async () => {
      const engine = new ValidationEngine();
      const subject: ValidationSubject = {
        record: buildExecutionRecord(),
        summary: {
          executionId: 'execution-workflow-1-step-1',
          status: 'completed',
          target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
          createdAt: '2026-07-24T00:00:00.000Z',
          updatedAt: '2026-07-24T00:00:00.000Z',
          isTerminal: true,
          isCancelled: false,
        },
      };

      await expect(engine.validate({ subject })).rejects.toThrow(NotImplementedError);
    });

    it('getValidationStatus() always throws NotImplementedError', async () => {
      const engine = new ValidationEngine();

      await expect(engine.getValidationStatus({ validationId: 'validation-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );
    });

    it('approveValidation() always throws NotImplementedError', async () => {
      const engine = new ValidationEngine();

      await expect(
        engine.approveValidation({ validationId: 'validation-1', reason: 'looks good' }),
      ).rejects.toBeInstanceOf(NotImplementedError);
    });

    it('rejectValidation() always throws NotImplementedError', async () => {
      const engine = new ValidationEngine();

      await expect(
        engine.rejectValidation({ validationId: 'validation-1', reason: 'missing evidence' }),
      ).rejects.toBeInstanceOf(NotImplementedError);
    });

    it('every stub throws NotImplementedError regardless of engine lifecycle state', async () => {
      const engine = new ValidationEngine();
      await engine.initialize();
      await engine.start();

      const subject: ValidationSubject = { record: buildExecutionRecord() };

      await expect(engine.validate({ subject })).rejects.toBeInstanceOf(NotImplementedError);
      await expect(engine.getValidationStatus({ validationId: 'validation-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );
      await expect(engine.approveValidation({ validationId: 'validation-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );
      await expect(engine.rejectValidation({ validationId: 'validation-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );
    });

    it('NotImplementedError carries a descriptive message per method', async () => {
      const engine = new ValidationEngine();

      await expect(engine.getValidationStatus({ validationId: 'validation-1' })).rejects.toThrow(
        /getValidationStatus/,
      );
      await expect(engine.approveValidation({ validationId: 'validation-1' })).rejects.toThrow(/approveValidation/);
      await expect(engine.rejectValidation({ validationId: 'validation-1' })).rejects.toThrow(/rejectValidation/);
    });
  });

  describe('compile-time domain model typing', () => {
    it('accepts a well-formed ValidationTarget shape', () => {
      const target: ValidationTarget = {
        executionId: 'execution-1',
        workflowId: 'workflow-1',
        itemId: 'step-1',
        itemType: 'step',
      };

      expect(target.itemType).toBe('step');
    });

    it('accepts a well-formed ValidationCheckResult shape', () => {
      const check: ValidationCheckResult = {
        checkId: 'check-1',
        checkType: 'testing',
        status: 'pass',
        message: 'All tests passed.',
      };

      expect(check.status).toBe('pass');
    });

    it('accepts a well-formed ValidationVerdict shape', () => {
      const verdict: ValidationVerdict = {
        validationId: 'validation-1',
        target: {
          executionId: 'execution-1',
          workflowId: 'workflow-1',
          itemId: 'step-1',
          itemType: 'step',
        },
        status: 'pass',
        checks: [],
        createdAt: '2026-07-24T00:00:00.000Z',
        updatedAt: '2026-07-24T00:00:00.000Z',
      };

      expect(verdict.checks).toEqual([]);
    });

    it('accepts a well-formed ValidationEvidence shape', () => {
      const evidence: ValidationEvidence = {
        validationId: 'validation-1',
        source: 'test-suite',
        description: 'Unit test run output.',
        capturedAt: '2026-07-24T00:00:00.000Z',
      };

      expect(evidence.source).toBe('test-suite');
    });
  });
});
