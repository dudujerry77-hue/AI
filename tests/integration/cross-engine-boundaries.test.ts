import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BaseEngine } from '../../runtime/engine/base';
import { OrchestratorEngine, type Plan, type WorkflowDispatchResult, type WorkflowResult } from '../../engines/orchestrator/src';
import { PlannerEngine, type Goal } from '../../engines/planner/src';
import { ExecutionEngine } from '../../engines/execution/src';
import { ValidationEngine } from '../../engines/validation/src';
import { LearningEngine } from '../../engines/learning/src';

/**
 * Phase 013 Milestone 4 — Cross-Engine Boundary & Failure-Mode
 * Validation.
 *
 * This file codifies, as executable tests, the boundary guarantees
 * already established by repository evidence and by the Phase 013
 * planning audit:
 *
 * - `architecture.md` §6.3.1: "Every engine-to-engine interaction is
 *   an explicit, inspectable call — never implicit shared state."
 * - `architecture.md` §6.3.2: "No engine bypasses the Orchestrator to
 *   invoke another engine directly, except reads from the Context
 *   Engine and Knowledge Engine, which any engine may query directly."
 * - `architecture.md` §6.4: "Engines must never communicate directly
 *   unless explicitly allowed by an approved interface or ADR."
 * - `architecture.md` §9 anti-pattern: "Any engine performing another
 *   engine's responsibility."
 *
 * No engine source was found to violate these rules while writing
 * this file (see the Phase 013 Milestone 4 report); every check below
 * passes against the repository as it already exists.
 */

const ENGINE_NAMES = ['context', 'knowledge', 'planner', 'orchestrator', 'execution', 'validation', 'learning'] as const;
type EngineName = (typeof ENGINE_NAMES)[number];

/**
 * architecture.md §6.3.2's explicit exception: any engine may query
 * the Context Engine and Knowledge Engine directly, unlike every other
 * engine pair. No such runtime import currently exists anywhere in the
 * repository (only type-only cross-engine imports exist at all), so
 * this exception is currently dormant — it is encoded here so the
 * check remains correct if such an import is ever legitimately added.
 */
const DIRECT_READ_EXCEPTION_ENGINES: ReadonlySet<EngineName> = new Set(['context', 'knowledge']);

const ENGINES_ROOT = path.join(process.cwd(), 'engines');

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

interface ParsedImport {
  readonly specifier: string;
  readonly isFullyTypeOnly: boolean;
  readonly runtimeBindings: readonly string[];
}

/**
 * Regex-based import parser (deliberately simple — no AST dependency,
 * matching this repository's existing preference for minimal tooling):
 * matches `import [type] { ... } from '...'` and
 * `import Default from '...'` declarations at the start of a line.
 * Group 1: the `type` keyword, if the whole declaration is type-only.
 * Group 2: the named-import clause, if braces were used.
 * Group 3: a default import binding name, if no braces were used.
 * Group 4: the module specifier.
 */
const IMPORT_DECLARATION_REGEX = /^import\s+(type\s+)?(?:\{([^}]*)\}|([\w$]+))\s+from\s+['"]([^'"]+)['"]/gm;

function parseImports(source: string): ParsedImport[] {
  const results: ParsedImport[] = [];
  let match: RegExpExecArray | null;

  while ((match = IMPORT_DECLARATION_REGEX.exec(source)) !== null) {
    const isTypeKeyword = Boolean(match[1]);
    const namedClause = match[2] as string | undefined;
    const defaultBinding = match[3] as string | undefined;
    const specifier = match[4];

    if (isTypeKeyword) {
      results.push({ specifier, isFullyTypeOnly: true, runtimeBindings: [] });
      continue;
    }

    if (namedClause !== undefined) {
      const items = namedClause
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      const runtimeBindings = items.filter((item) => !item.startsWith('type '));
      results.push({ specifier, isFullyTypeOnly: runtimeBindings.length === 0, runtimeBindings });
      continue;
    }

    results.push({ specifier, isFullyTypeOnly: false, runtimeBindings: [defaultBinding ?? '*'] });
  }

  return results;
}

function extractReferencedEngine(specifier: string): EngineName | undefined {
  const aliasMatch = /^@titan\/([\w-]+)/.exec(specifier);
  if (aliasMatch && (ENGINE_NAMES as readonly string[]).includes(aliasMatch[1])) {
    return aliasMatch[1] as EngineName;
  }

  const relativeMatch = /(?:^|\/)([\w-]+)\/src(?:\/|$)/.exec(specifier);
  if (relativeMatch && (ENGINE_NAMES as readonly string[]).includes(relativeMatch[1])) {
    return relativeMatch[1] as EngineName;
  }

  return undefined;
}

function extractOwningEngine(filePath: string): EngineName | undefined {
  const relative = path.relative(ENGINES_ROOT, filePath).split(path.sep);
  const candidate = relative[0];
  return (ENGINE_NAMES as readonly string[]).includes(candidate) ? (candidate as EngineName) : undefined;
}

/**
 * Deep-walks a value and returns `true` if any nested value is an
 * instance of `BaseEngine` — the same structural check used by the
 * Milestone 3 end-to-end suite, applied here across every implemented
 * business method's return value.
 */
function containsEngineInstance(value: unknown, seen: Set<unknown> = new Set()): boolean {
  if (value instanceof BaseEngine) {
    return true;
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return false;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((item) => containsEngineInstance(item, seen));
  }
  return Object.values(value as Record<string, unknown>).some((item) => containsEngineInstance(item, seen));
}

function buildGoal(): Goal {
  return {
    goalId: 'goal-boundary-1',
    title: 'Boundary validation goal',
    description: 'Used only to exercise every implemented business method for boundary checks.',
    type: 'feature',
    priority: 'medium',
    status: 'ready',
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
  };
}

describe('Cross-engine boundary & failure-mode validation (Phase 013 Milestone 4)', () => {
  describe('No runtime cross-engine imports', () => {
    it('every engine package imports other engine packages by type only, except the Context/Knowledge direct-read exception', () => {
      const violations: string[] = [];
      let filesScanned = 0;
      let crossEngineImportsFound = 0;

      for (const engineName of ENGINE_NAMES) {
        const engineSrcDir = path.join(ENGINES_ROOT, engineName, 'src');
        const files = walkTsFiles(engineSrcDir);
        filesScanned += files.length;

        for (const file of files) {
          const source = readFileSync(file, 'utf8');
          const imports = parseImports(source);

          for (const importInfo of imports) {
            const referencedEngine = extractReferencedEngine(importInfo.specifier);
            const owningEngine = extractOwningEngine(file);

            if (referencedEngine === undefined || referencedEngine === owningEngine) {
              continue;
            }

            crossEngineImportsFound += 1;

            if (importInfo.isFullyTypeOnly) {
              continue;
            }

            if (DIRECT_READ_EXCEPTION_ENGINES.has(referencedEngine)) {
              continue;
            }

            violations.push(
              `${path.relative(process.cwd(), file)}: runtime (non-type-only) import of "${referencedEngine}" ` +
                `(bindings: ${importInfo.runtimeBindings.join(', ')})`,
            );
          }
        }
      }

      // Sanity check on the scanner itself: if these were ever zero,
      // the check above would vacuously pass without having verified
      // anything real.
      expect(filesScanned).toBeGreaterThan(20);
      expect(crossEngineImportsFound).toBeGreaterThan(0);

      expect(violations).toEqual([]);
    });
  });

  describe('Cross-engine payloads never contain an engine instance', () => {
    it('sweeps every implemented business method across the five wired engines for embedded engine instances', async () => {
      const planner = new PlannerEngine();
      const orchestrator = new OrchestratorEngine();
      const execution = new ExecutionEngine();
      const validation = new ValidationEngine();
      const learning = new LearningEngine();

      const goal = buildGoal();

      const plan = await planner.createPlan({ goal });
      const planValidation = await planner.validatePlan({ plan });
      const optimizedPlan = await planner.optimizePlan({ plan });
      const estimate = await planner.estimatePlan({ plan });
      const explanation = await planner.explainPlan({ plan });

      const workflow = await orchestrator.orchestrate({ plan });
      const workflowValidation = await orchestrator.executeWorkflow({ workflow });
      const workflowStatus = await orchestrator.getWorkflowStatus({ workflow });
      const paused = await orchestrator.pauseWorkflow({ workflow });
      const resumed = await orchestrator.resumeWorkflow({ workflow });
      const cancelled = await orchestrator.cancelWorkflow({ workflow });
      const dispatchResult = await orchestrator.dispatchWorkflow({ workflow });

      const executionRecord = await execution.execute({ dispatchResult, itemId: 'task-analysis' });
      const executionStatus = await execution.getExecutionStatus({ record: executionRecord });
      const executionSummary = await execution.reportResult({ record: executionRecord });

      const validationResult = await validation.validate({
        subject: { record: executionRecord, summary: executionSummary },
      });
      const validationStatus = await validation.getValidationStatus({ verdict: validationResult.verdict });

      const outcome: WorkflowResult = {
        workflowId: workflow.workflowId,
        status: 'completed',
        completedStepIds: [],
        failedStepIds: [],
      };
      const observation = await learning.observeCycle({ subject: { outcome, verdict: validationResult.verdict } });
      const proposal = await learning.generateProposal({ observations: [observation] });
      const handoff = await learning.prepareKnowledgeHandoff({ proposal });
      const pipelineResult = await learning.analyzeCycle({ observations: [observation] });

      const allPayloads: readonly unknown[] = [
        plan,
        planValidation,
        optimizedPlan,
        estimate,
        explanation,
        workflow,
        workflowValidation,
        workflowStatus,
        paused,
        resumed,
        cancelled,
        dispatchResult,
        executionRecord,
        executionStatus,
        executionSummary,
        validationResult,
        validationStatus,
        outcome,
        observation,
        proposal,
        handoff,
        pipelineResult,
      ];

      expect(allPayloads.length).toBeGreaterThan(0);
      for (const payload of allPayloads) {
        expect(containsEngineInstance(payload)).toBe(false);
      }
    });
  });

  describe('Failure paths propagate errors across engine boundaries instead of silently swallowing them', () => {
    it('OrchestratorEngine.orchestrate() throws for a malformed Plan crossing the Planner boundary', async () => {
      const orchestrator = new OrchestratorEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(orchestrator.orchestrate({ plan: {} })).rejects.toThrow();
    });

    it('OrchestratorEngine.dispatchWorkflow() throws for a malformed Workflow', async () => {
      const orchestrator = new OrchestratorEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(orchestrator.dispatchWorkflow({ workflow: null })).rejects.toThrow();
    });

    it('ExecutionEngine.execute() throws for a malformed WorkflowDispatchResult crossing the Orchestrator boundary', async () => {
      const execution = new ExecutionEngine();

      await expect(
        execution.execute({ dispatchResult: {} as WorkflowDispatchResult, itemId: 'task-analysis' }),
      ).rejects.toThrow();
    });

    it('ExecutionEngine.execute() throws when itemId matches no dispatch decision', async () => {
      const planner = new PlannerEngine();
      const orchestrator = new OrchestratorEngine();
      const execution = new ExecutionEngine();

      const plan: Plan = await planner.createPlan({ goal: buildGoal() });
      const workflow = await orchestrator.orchestrate({ plan });
      const dispatchResult = await orchestrator.dispatchWorkflow({ workflow });

      await expect(execution.execute({ dispatchResult, itemId: 'item-that-does-not-exist' })).rejects.toThrow();
    });

    it('ValidationEngine.validate() throws for a malformed ValidationSubject crossing the Execution boundary', async () => {
      const validation = new ValidationEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(validation.validate({ subject: {} })).rejects.toThrow();
    });

    it('LearningEngine.observeCycle() throws for a malformed LearningSubject crossing the Orchestrator/Validation boundary', async () => {
      const learning = new LearningEngine();

      // @ts-expect-error — intentionally malformed for the test
      await expect(learning.observeCycle({ subject: {} })).rejects.toThrow();
    });

    it('LearningEngine.analyzeCycle() throws instead of silently returning empty output for zero observations', async () => {
      const learning = new LearningEngine();

      await expect(learning.analyzeCycle({ observations: [] })).rejects.toThrow();
    });
  });
});
