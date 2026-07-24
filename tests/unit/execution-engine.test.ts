import { describe, expect, it } from 'vitest';

import {
  ExecutionBuilder,
  ExecutionEngine,
  ExecutionStatusTracker,
  ExecutionValidationError,
  ExecutionValidator,
  NotImplementedError,
  type ExecutionBuildRequest,
  type ExecutionRecord,
} from '../../engines/execution/src';
import type { WorkflowDispatchResult } from '../../engines/orchestrator/src/models/types';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

const EXPECTED_CAPABILITIES = [
  'execution.execute',
  'execution.get-execution-status',
  'execution.cancel-execution',
  'execution.report-result',
];

function buildDispatchResult(overrides: Partial<WorkflowDispatchResult> = {}): WorkflowDispatchResult {
  return {
    workflowId: 'workflow-1',
    dispatchable: ['step-1'],
    decisions: [
      {
        itemId: 'step-1',
        itemType: 'step',
        ready: true,
        reasons: ['status-ready', 'dependencies-satisfied'],
      },
      {
        itemId: 'task-1',
        itemType: 'task',
        ready: false,
        reasons: ['status-not-ready', 'dependencies-unsatisfied'],
      },
    ],
    escalations: [],
    ...overrides,
  };
}

function buildValidRecord(overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
  return {
    executionId: 'execution-workflow-1-step-1',
    target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
    status: 'pending',
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

describe('ExecutionEngine — Milestone 5 (Structural Execution Status Reporting)', () => {
  describe('runtime lifecycle (unchanged from Milestone 1)', () => {
    it('starts in the created state and transitions through the full lifecycle', async () => {
      const engine = new ExecutionEngine();

      expect(engine.getState()).toBe('created');

      await engine.initialize();
      expect(engine.getState()).toBe('initialized');

      await engine.start();
      expect(engine.getState()).toBe('running');

      await engine.stop();
      expect(engine.getState()).toBe('stopped');
    });

    it('allows re-initialization after stop', async () => {
      const engine = new ExecutionEngine();

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
      const engine = new ExecutionEngine();

      await engine.initialize();
      await engine.start();
      await engine.stop();

      await expect(engine.stop()).resolves.not.toThrow();
      expect(engine.getState()).toBe('stopped');
    });
  });

  describe('health (unchanged from Milestone 1)', () => {
    it('reports healthy status through every lifecycle stage', async () => {
      const engine = new ExecutionEngine();

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
      const engine = new ExecutionEngine();
      const metadata = engine.metadata();

      expect(metadata.id).toBe('execution-engine');
      expect(metadata.name).toBe('Execution Engine');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.contractVersion).toBe(ENGINE_API_CONTRACT_VERSION);
    });

    it('advertises the complete planned capability list', () => {
      const engine = new ExecutionEngine();
      expect(engine.metadata().capabilities).toEqual(EXPECTED_CAPABILITIES);
    });
  });

  describe('version, contractVersion, getState (unchanged from Milestone 1)', () => {
    it('version() matches metadata().version', () => {
      const engine = new ExecutionEngine();
      expect(engine.version()).toBe(engine.metadata().version);
    });

    it('contractVersion() matches the shared contract constant', () => {
      const engine = new ExecutionEngine();
      expect(engine.contractVersion()).toBe(ENGINE_API_CONTRACT_VERSION);
    });
  });

  describe('public API stub existence', () => {
    it('exposes execute, getExecutionStatus, cancelExecution, and reportResult as functions', () => {
      const engine = new ExecutionEngine();

      expect(typeof engine.execute).toBe('function');
      expect(typeof engine.getExecutionStatus).toBe('function');
      expect(typeof engine.cancelExecution).toBe('function');
      expect(typeof engine.reportResult).toBe('function');
    });
  });

  describe('ExecutionEngine.execute() — delegation to ExecutionBuilder (unchanged from Milestone 3)', () => {
    it('returns an ExecutionRecord for a valid request', async () => {
      const engine = new ExecutionEngine();
      const dispatchResult = buildDispatchResult();

      const record = await engine.execute({ dispatchResult, itemId: 'step-1' });

      expect(record).toEqual({
        executionId: 'execution-workflow-1-step-1',
        target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
        status: 'pending',
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      });
    });

    it('rejects with ExecutionValidationError for a null/undefined request', async () => {
      const engine = new ExecutionEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.execute(null)).rejects.toBeInstanceOf(ExecutionValidationError);
      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.execute(undefined)).rejects.toBeInstanceOf(ExecutionValidationError);
    });

    it('propagates ExecutionValidationError from ExecutionBuilder for an unknown itemId', async () => {
      const engine = new ExecutionEngine();
      const dispatchResult = buildDispatchResult();

      await expect(engine.execute({ dispatchResult, itemId: 'nonexistent' })).rejects.toBeInstanceOf(
        ExecutionValidationError,
      );
    });
  });

  describe('ExecutionEngine.getExecutionStatus() — delegation to ExecutionValidator (unchanged from Milestone 4)', () => {
    it('returns a valid ExecutionValidationResult for a well-formed record', async () => {
      const engine = new ExecutionEngine();
      const record = buildValidRecord();

      const result = await engine.getExecutionStatus({ record });

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.executionId).toBe(record.executionId);
    });

    it('rejects with ExecutionValidationError for a null/undefined request', async () => {
      const engine = new ExecutionEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.getExecutionStatus(null)).rejects.toBeInstanceOf(ExecutionValidationError);
    });

    it('propagates ExecutionValidationError from ExecutionValidator when record itself is malformed', async () => {
      const engine = new ExecutionEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.getExecutionStatus({ record: null })).rejects.toBeInstanceOf(ExecutionValidationError);
    });
  });

  describe('ExecutionEngine.reportResult() — delegation to ExecutionStatusTracker (new in Milestone 5)', () => {
    it('returns an ExecutionSummary for a well-formed record', async () => {
      const engine = new ExecutionEngine();
      const record = buildValidRecord();

      const summary = await engine.reportResult({ record });

      expect(summary).toEqual({
        executionId: 'execution-workflow-1-step-1',
        status: 'pending',
        target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
        createdAt: '2026-07-24T00:00:00.000Z',
        updatedAt: '2026-07-24T00:00:00.000Z',
        durationMs: 0,
        isTerminal: false,
        isCancelled: false,
      });
    });

    it('delegates to ExecutionStatusTracker such that engine and direct-tracker output are identical', async () => {
      const engine = new ExecutionEngine();
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({ status: 'completed' });

      const direct = tracker.summarize(record);
      const viaEngine = await engine.reportResult({ record });

      expect(viaEngine).toEqual(direct);
    });

    it('ignores the optional handoff field entirely (no reporting occurs)', async () => {
      const engine = new ExecutionEngine();
      const record = buildValidRecord();
      const target = { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' as const };

      const withHandoff = await engine.reportResult({
        record,
        handoff: {
          executionId: 'execution-1',
          target,
          result: { executionId: 'execution-1', status: 'completed' },
          requestedAt: '2026-07-24T00:00:00.000Z',
        },
      });
      const withoutHandoff = await engine.reportResult({ record });

      expect(withHandoff).toEqual(withoutHandoff);
    });

    it('rejects with ExecutionValidationError for a null/undefined request', async () => {
      const engine = new ExecutionEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.reportResult(null)).rejects.toBeInstanceOf(ExecutionValidationError);
      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.reportResult(undefined)).rejects.toBeInstanceOf(ExecutionValidationError);
    });

    it('rejects with ExecutionValidationError for a non-object request', async () => {
      const engine = new ExecutionEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.reportResult('not-an-object')).rejects.toBeInstanceOf(ExecutionValidationError);
      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.reportResult(['array'])).rejects.toBeInstanceOf(ExecutionValidationError);
    });

    it('propagates ExecutionValidationError from ExecutionStatusTracker when record itself is malformed', async () => {
      const engine = new ExecutionEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(engine.reportResult({ record: null })).rejects.toBeInstanceOf(ExecutionValidationError);
      await expect(
        // @ts-expect-error — intentionally malformed for the test
        engine.reportResult({ record: { executionId: 'x' } }),
      ).rejects.toBeInstanceOf(ExecutionValidationError);
    });

    it('does not mutate the record passed to reportResult()', async () => {
      const engine = new ExecutionEngine();
      const record = buildValidRecord();
      const snapshot = JSON.parse(JSON.stringify(record));

      await engine.reportResult({ record });

      expect(record).toEqual(snapshot);
    });
  });

  describe('NotImplementedError behavior — cancelExecution still throws', () => {
    it('cancelExecution() always throws NotImplementedError', async () => {
      const engine = new ExecutionEngine();
      await expect(engine.cancelExecution({ executionId: 'execution-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );
    });

    it('NotImplementedError instances carry a descriptive message', async () => {
      const engine = new ExecutionEngine();

      try {
        await engine.cancelExecution({ executionId: 'execution-1' });
        expect.unreachable('cancelExecution() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(NotImplementedError);
        expect((error as Error).message).toContain('ExecutionEngine.cancelExecution');
        expect((error as Error).name).toBe('NotImplementedError');
      }
    });

    it('cancelExecution() throws regardless of engine lifecycle state', async () => {
      const engine = new ExecutionEngine();
      await engine.initialize();
      await engine.start();

      await expect(engine.cancelExecution({ executionId: 'execution-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );

      await engine.stop();
      await expect(engine.cancelExecution({ executionId: 'execution-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );
    });

    it('cancelExecution() no longer performs any state transition of any kind', async () => {
      const engine = new ExecutionEngine();
      await engine.initialize();
      await engine.start();

      await expect(engine.cancelExecution({ executionId: 'execution-1' })).rejects.toBeInstanceOf(
        NotImplementedError,
      );

      expect(engine.getState()).toBe('running');
    });
  });
});

describe('ExecutionBuilder — Milestone 3 (unchanged in Milestone 5)', () => {
  describe('successful translation', () => {
    it('translates a ready step decision into an ExecutionRecord', () => {
      const builder = new ExecutionBuilder();
      const dispatchResult = buildDispatchResult();

      const record = builder.build({ dispatchResult, itemId: 'step-1' }, '2026-07-24T00:00:00.000Z');

      expect(record).toEqual({
        executionId: 'execution-workflow-1-step-1',
        target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
        status: 'pending',
        createdAt: '2026-07-24T00:00:00.000Z',
        updatedAt: '2026-07-24T00:00:00.000Z',
      });
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input and timestamp', () => {
      const builder = new ExecutionBuilder();
      const dispatchResult = buildDispatchResult();
      const request: ExecutionBuildRequest = { dispatchResult, itemId: 'step-1' };

      const first = builder.build(request, '2026-07-24T00:00:00.000Z');
      const second = builder.build(request, '2026-07-24T00:00:00.000Z');

      expect(first).toEqual(second);
    });
  });

  describe('malformed input rejection', () => {
    it('rejects a null/undefined request', () => {
      const builder = new ExecutionBuilder();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => builder.build(null)).toThrow(ExecutionValidationError);
    });

    it('rejects an itemId with no matching dispatch decision', () => {
      const builder = new ExecutionBuilder();
      const dispatchResult = buildDispatchResult();

      expect(() => builder.build({ dispatchResult, itemId: 'unknown-item' })).toThrow(ExecutionValidationError);
    });
  });

  describe('immutability', () => {
    it('never mutates the input dispatchResult', () => {
      const builder = new ExecutionBuilder();
      const dispatchResult = buildDispatchResult();
      const snapshot = JSON.parse(JSON.stringify(dispatchResult));

      builder.build({ dispatchResult, itemId: 'step-1' });

      expect(dispatchResult).toEqual(snapshot);
    });
  });
});

describe('ExecutionValidator — Milestone 4 (unchanged in Milestone 5)', () => {
  describe('valid records', () => {
    it('reports valid: true with no issues for a well-formed record', () => {
      const validator = new ExecutionValidator();
      const record = buildValidRecord();

      const result = validator.validate(record, '2026-07-24T00:00:00.000Z');

      expect(result).toEqual({
        executionId: 'execution-workflow-1-step-1',
        valid: true,
        issues: [],
        validatedAt: '2026-07-24T00:00:00.000Z',
      });
    });
  });

  describe('structural issues (returned, not thrown)', () => {
    it('reports INVALID_STATUS for an unrecognized status', () => {
      const validator = new ExecutionValidator();
      // @ts-expect-error — intentionally malformed for the test
      const record = buildValidRecord({ status: 'bogus-status' });

      const result = validator.validate(record);

      expect(result.issues.some((issue) => issue.code === 'INVALID_STATUS')).toBe(true);
    });
  });

  describe('malformed shape (thrown, not returned as issues)', () => {
    it('throws ExecutionValidationError for a null/undefined record', () => {
      const validator = new ExecutionValidator();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => validator.validate(null)).toThrow(ExecutionValidationError);
    });
  });

  describe('determinism and purity', () => {
    it('produces identical output for identical input and timestamp', () => {
      const validator = new ExecutionValidator();
      const record = buildValidRecord();

      const first = validator.validate(record, '2026-07-24T00:00:00.000Z');
      const second = validator.validate(record, '2026-07-24T00:00:00.000Z');

      expect(first).toEqual(second);
    });
  });
});

describe('ExecutionStatusTracker — Milestone 5', () => {
  describe('valid summaries', () => {
    it('summarizes a pending record with all structural fields', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord();

      const summary = tracker.summarize(record);

      expect(summary).toEqual({
        executionId: 'execution-workflow-1-step-1',
        status: 'pending',
        target: { workflowId: 'workflow-1', itemId: 'step-1', itemType: 'step' },
        createdAt: '2026-07-24T00:00:00.000Z',
        updatedAt: '2026-07-24T00:00:00.000Z',
        durationMs: 0,
        isTerminal: false,
        isCancelled: false,
      });
    });

    it('preserves executionId verbatim', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({ executionId: 'execution-custom-42' });

      const summary = tracker.summarize(record);

      expect(summary.executionId).toBe('execution-custom-42');
    });

    it('preserves the target object structurally (workflowId, itemId, itemType)', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({
        target: { workflowId: 'workflow-custom', itemId: 'task-custom', itemType: 'task' },
      });

      const summary = tracker.summarize(record);

      expect(summary.target).toEqual({ workflowId: 'workflow-custom', itemId: 'task-custom', itemType: 'task' });
    });

    it('preserves createdAt and updatedAt verbatim', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T02:00:00.000Z',
      });

      const summary = tracker.summarize(record);

      expect(summary.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(summary.updatedAt).toBe('2026-01-01T02:00:00.000Z');
    });

    it('derives durationMs correctly for a positive elapsed time', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:05:00.000Z',
      });

      const summary = tracker.summarize(record);

      expect(summary.durationMs).toBe(5 * 60 * 1000);
    });

    it('derives durationMs of 0 when createdAt equals updatedAt', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const summary = tracker.summarize(record);

      expect(summary.durationMs).toBe(0);
    });

    it('omits durationMs when createdAt is malformed', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({ createdAt: 'not-a-date' });

      const summary = tracker.summarize(record);

      expect(summary.durationMs).toBeUndefined();
      expect('durationMs' in summary).toBe(false);
    });

    it('omits durationMs when updatedAt is malformed', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({ updatedAt: 'not-a-date' });

      const summary = tracker.summarize(record);

      expect(summary.durationMs).toBeUndefined();
    });

    it('omits durationMs when createdAt is empty', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord({ createdAt: '' });

      const summary = tracker.summarize(record);

      expect(summary.durationMs).toBeUndefined();
    });
  });

  describe('every ExecutionStatus value', () => {
    it('classifies pending as non-terminal, non-cancelled', () => {
      const tracker = new ExecutionStatusTracker();
      const summary = tracker.summarize(buildValidRecord({ status: 'pending' }));

      expect(summary.status).toBe('pending');
      expect(summary.isTerminal).toBe(false);
      expect(summary.isCancelled).toBe(false);
    });

    it('classifies running as non-terminal, non-cancelled', () => {
      const tracker = new ExecutionStatusTracker();
      const summary = tracker.summarize(buildValidRecord({ status: 'running' }));

      expect(summary.status).toBe('running');
      expect(summary.isTerminal).toBe(false);
      expect(summary.isCancelled).toBe(false);
    });

    it('classifies completed as terminal, non-cancelled', () => {
      const tracker = new ExecutionStatusTracker();
      const summary = tracker.summarize(buildValidRecord({ status: 'completed' }));

      expect(summary.status).toBe('completed');
      expect(summary.isTerminal).toBe(true);
      expect(summary.isCancelled).toBe(false);
    });

    it('classifies failed as terminal, non-cancelled', () => {
      const tracker = new ExecutionStatusTracker();
      const summary = tracker.summarize(buildValidRecord({ status: 'failed' }));

      expect(summary.status).toBe('failed');
      expect(summary.isTerminal).toBe(true);
      expect(summary.isCancelled).toBe(false);
    });

    it('classifies cancelled as terminal and cancelled', () => {
      const tracker = new ExecutionStatusTracker();
      const summary = tracker.summarize(buildValidRecord({ status: 'cancelled' }));

      expect(summary.status).toBe('cancelled');
      expect(summary.isTerminal).toBe(true);
      expect(summary.isCancelled).toBe(true);
    });
  });

  describe('deterministic output', () => {
    it('produces identical output for identical input', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord();

      const first = tracker.summarize(record);
      const second = tracker.summarize(record);

      expect(first).toEqual(second);
    });

    it('produces identical output across separate ExecutionStatusTracker instances', () => {
      const record = buildValidRecord();

      const first = new ExecutionStatusTracker().summarize(record);
      const second = new ExecutionStatusTracker().summarize(record);

      expect(first).toEqual(second);
    });

    it('summarize() is synchronous (does not return a Promise)', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord();

      const result = tracker.summarize(record);

      expect(result).not.toBeInstanceOf(Promise);
    });
  });

  describe('immutability', () => {
    it('never mutates the input record', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord();
      const snapshot = JSON.parse(JSON.stringify(record));

      tracker.summarize(record);

      expect(record).toEqual(snapshot);
    });

    it('returns a target object that is a freshly constructed value, not the same reference', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord();

      const summary = tracker.summarize(record);

      expect(summary.target).not.toBe(record.target);
      expect(summary.target).toEqual(record.target);
    });

    it('mutating the returned summary target does not affect the original record', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord();

      const summary = tracker.summarize(record);
      (summary.target as { itemId: string }).itemId = 'mutated';

      expect(record.target.itemId).toBe('step-1');
    });
  });

  describe('malformed input rejection', () => {
    it('throws ExecutionValidationError for a null/undefined record', () => {
      const tracker = new ExecutionStatusTracker();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => tracker.summarize(null)).toThrow(ExecutionValidationError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => tracker.summarize(undefined)).toThrow(ExecutionValidationError);
    });

    it('throws ExecutionValidationError for a non-object record', () => {
      const tracker = new ExecutionStatusTracker();

      // @ts-expect-error — intentionally malformed for the test
      expect(() => tracker.summarize('not-an-object')).toThrow(ExecutionValidationError);
      // @ts-expect-error — intentionally malformed for the test
      expect(() => tracker.summarize(['array'])).toThrow(ExecutionValidationError);
    });

    it('throws ExecutionValidationError when target is missing entirely', () => {
      const tracker = new ExecutionStatusTracker();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        tracker.summarize({ executionId: 'x', status: 'pending', createdAt: 'a', updatedAt: 'a' }),
      ).toThrow(ExecutionValidationError);
    });

    it('throws ExecutionValidationError when target is null', () => {
      const tracker = new ExecutionStatusTracker();

      expect(() =>
        // @ts-expect-error — intentionally malformed for the test
        tracker.summarize({ executionId: 'x', target: null, status: 'pending', createdAt: 'a', updatedAt: 'a' }),
      ).toThrow(ExecutionValidationError);
    });

    it('validation errors carry structured issues', () => {
      const tracker = new ExecutionStatusTracker();

      try {
        // @ts-expect-error — intentionally malformed for the test
        tracker.summarize(null);
        expect.unreachable('summarize() must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionValidationError);
        const validationError = error as ExecutionValidationError;
        expect(validationError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('no execution/reporting behavior', () => {
    it('does not add any fields beyond the documented ExecutionSummary shape', () => {
      const tracker = new ExecutionStatusTracker();
      const record = buildValidRecord();

      const summary = tracker.summarize(record);

      expect(Object.keys(summary).sort()).toEqual(
        ['createdAt', 'durationMs', 'executionId', 'isCancelled', 'isTerminal', 'status', 'target', 'updatedAt'].sort(),
      );
    });
  });
});
