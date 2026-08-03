import { describe, expect, it } from 'vitest';
import { createTitanShell } from '../../apps/titan-shell/src/index';
import { ContextEngine } from '../../engines/context/src';
import { KnowledgeEngine } from '../../engines/knowledge/src';
import { PlannerEngine } from '../../engines/planner/src';
import { OrchestratorEngine } from '../../engines/orchestrator/src';
import { ExecutionEngine } from '../../engines/execution/src';
import { ValidationEngine } from '../../engines/validation/src';
import { LearningEngine } from '../../engines/learning/src';
import { resolveEngineMetadata } from '../../runtime/engine/types';

const EXPECTED_ENGINE_IDS = [
  'context-engine',
  'knowledge-engine',
  'planner-engine',
  'orchestrator-engine',
  'execution-engine',
  'validation-engine',
  'learning-engine',
];

describe('createTitanShell', () => {
  it('creates a shell with engine metadata', () => {
    const shell = createTitanShell();

    expect(shell.name).toBe('Titan AI shell');
    expect(shell.engineNames).toEqual([
      'context',
      'knowledge',
      'planner',
      'orchestrator',
      'execution',
      'validation',
      'learning',
    ]);
  });

  describe('EngineRegistry wiring (Phase 013 Milestone 2)', () => {
    it('instantiates and registers all seven engines', () => {
      const shell = createTitanShell();

      expect(shell.registry.list()).toHaveLength(7);
    });

    it('makes every engine discoverable in the registry by id', () => {
      const shell = createTitanShell();

      for (const id of EXPECTED_ENGINE_IDS) {
        expect(shell.registry.get(id)).toBeDefined();
      }
    });

    it('reports correct identity metadata for each registered engine', () => {
      const shell = createTitanShell();

      expect(
        resolveEngineMetadata(shell.registry.get('context-engine')!).name,
      ).toBe('Context Engine');
      expect(
        resolveEngineMetadata(shell.registry.get('knowledge-engine')!).name,
      ).toBe('Knowledge Engine');
      expect(
        resolveEngineMetadata(shell.registry.get('planner-engine')!).name,
      ).toBe('Planner Engine');
      expect(
        resolveEngineMetadata(shell.registry.get('orchestrator-engine')!).name,
      ).toBe('Orchestrator Engine');
      expect(
        resolveEngineMetadata(shell.registry.get('execution-engine')!).name,
      ).toBe('Execution Engine');
      expect(
        resolveEngineMetadata(shell.registry.get('validation-engine')!).name,
      ).toBe('Validation Engine');
      expect(
        resolveEngineMetadata(shell.registry.get('learning-engine')!).name,
      ).toBe('Learning Engine');
    });

    it("each registered engine's capabilities match a freshly constructed instance of the same engine class", () => {
      const shell = createTitanShell();

      expect(
        resolveEngineMetadata(shell.registry.get('context-engine')!)
          .capabilities,
      ).toEqual(new ContextEngine().metadata().capabilities);
      expect(
        resolveEngineMetadata(shell.registry.get('planner-engine')!)
          .capabilities,
      ).toEqual(new PlannerEngine().metadata().capabilities);
      expect(
        resolveEngineMetadata(shell.registry.get('orchestrator-engine')!)
          .capabilities,
      ).toEqual(new OrchestratorEngine().metadata().capabilities);
      expect(
        resolveEngineMetadata(shell.registry.get('execution-engine')!)
          .capabilities,
      ).toEqual(new ExecutionEngine().metadata().capabilities);
      expect(
        resolveEngineMetadata(shell.registry.get('validation-engine')!)
          .capabilities,
      ).toEqual(new ValidationEngine().metadata().capabilities);
      expect(
        resolveEngineMetadata(shell.registry.get('learning-engine')!)
          .capabilities,
      ).toEqual(new LearningEngine().metadata().capabilities);
      expect(
        resolveEngineMetadata(shell.registry.get('knowledge-engine')!)
          .capabilities,
      ).toEqual(
        new KnowledgeEngine({
          rootDir: process.cwd(),
          actorId: 'test',
          roles: ['ai-agent'],
        }).metadata().capabilities,
      );
    });

    it('supports capability-based discovery through the registry', () => {
      const shell = createTitanShell();

      const learningCapableEngines = shell.registry.findByCapability(
        'learning.analyze-cycle',
      );

      expect(learningCapableEngines).toHaveLength(1);
      expect(resolveEngineMetadata(learningCapableEngines[0]).id).toBe(
        'learning-engine',
      );
    });

    it('registers every engine in the created state, proving no lifecycle or business method was invoked during wiring', () => {
      const shell = createTitanShell();

      for (const id of EXPECTED_ENGINE_IDS) {
        expect(shell.registry.get(id)?.getState()).toBe('created');
      }
    });

    it('creates independent engine instances on each call (no shared cross-call state)', () => {
      const first = createTitanShell();
      const second = createTitanShell();

      expect(first.registry.get('learning-engine')).not.toBe(
        second.registry.get('learning-engine'),
      );
    });
  });
});
