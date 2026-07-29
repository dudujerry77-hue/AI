import { describe, expect, it } from 'vitest';

import { LearningEngine } from '../../engines/learning/src';
import { ENGINE_API_CONTRACT_VERSION } from '../../runtime/engine/types';

describe('LearningEngine — Milestone 1 (Runtime Foundation)', () => {
  describe('runtime lifecycle', () => {
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

  describe('health', () => {
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

    it('advertises no capabilities in Milestone 1', () => {
      const engine = new LearningEngine();
      expect(engine.metadata().capabilities).toEqual([]);
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

  describe('no business methods declared (Milestone 1 boundary)', () => {
    it('exposes no business methods beyond the shared runtime contract', () => {
      const engine = new LearningEngine();

      // Any of these existing would indicate a business method was
      // added without the required specification-grounding review.
      expect((engine as unknown as Record<string, unknown>).observeOutcome).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).generateProposal).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).getLearningStatus).toBeUndefined();
      expect((engine as unknown as Record<string, unknown>).applyLearning).toBeUndefined();
    });
  });
});
