import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';
import type {
  Goal,
  Plan,
  PlanEstimate,
  PlanExplanation,
  PlanningContext,
  Constraint,
} from './models/types';
import { GoalAnalyzer, type GoalAnalysisResult } from './analysis/goal-analyzer';
import { GoalDecomposer } from './decomposition/goal-decomposer';
import { PlanValidator, type PlanValidationResult } from './validation/plan-validator';
import { PlanOptimizer } from './optimization/plan-optimizer';
import { NotImplementedError, PlanningValidationError } from './errors/planner-errors';


export type {
  Goal,
  GoalType,
  GoalPriority,
  GoalStatus,
  Plan,
  PlanStatus,
  PlanMetadata,
  PlanStep,
  StepType,
  StepStatus,
  Task,
  TaskStatus,
  Dependency,
  DependencyType,
  Constraint,
  ConstraintType,
  PlanningContext,
  PlanEstimate,
  CostEstimate,
  TimeEstimate,
  ResourceEstimate,
  PlanExplanation,
} from './models/types';

export { GoalAnalyzer, type GoalAnalysisResult } from './analysis/goal-analyzer';
export { GoalDecomposer } from './decomposition/goal-decomposer';
export { PlanValidator, type PlanValidationResult } from './validation/plan-validator';
export { PlanOptimizer } from './optimization/plan-optimizer';
export {
  NotImplementedError,
  PlanningValidationError,
  type GoalValidationIssue,
} from './errors/planner-errors';


export interface PlannerCreatePlanRequest {
  readonly goal: Goal;
  readonly context?: PlanningContext;
}

export interface PlannerValidatePlanRequest {
  readonly plan: Plan;
  readonly context?: PlanningContext;
}

export interface PlannerOptimizePlanRequest {
  readonly plan: Plan;
  readonly constraints?: readonly Constraint[];
}

export interface PlannerEstimatePlanRequest {
  readonly plan: Plan;
  readonly context?: PlanningContext;
}

export interface PlannerExplainPlanRequest {
  readonly plan: Plan;
  readonly context?: PlanningContext;
}

export interface PlannerCancelPlanRequest {
  readonly planId: string;
  readonly reason?: string;
}

export interface PlannerPlaceholderResult {
  readonly status: 'not-implemented';
  readonly message: string;
}

export interface PlannerEstimatePlaceholderResult extends PlannerPlaceholderResult {
  readonly estimate?: PlanEstimate;
}

export interface PlannerExplainPlaceholderResult extends PlannerPlaceholderResult {
  readonly explanation?: PlanExplanation;
}

export interface PlannerEngineOptions extends Omit<BaseEngineOptions, 'id' | 'name' | 'version'> {
  readonly id?: string;
  readonly name?: string;
  readonly version?: string;
}

export class PlannerEngine extends BaseEngine {
  private readonly goalAnalyzer: GoalAnalyzer;
  private readonly goalDecomposer: GoalDecomposer;
  private readonly planValidator: PlanValidator;
  private readonly planOptimizer: PlanOptimizer;

  constructor(options: PlannerEngineOptions = {}) {
    super({
      id: options.id ?? 'planner-engine',
      name: options.name ?? 'Planner Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Goal-to-plan engine for Titan AI. Milestone 3 implements deterministic goal analysis and decomposition for createPlan; Milestone 4 implements structural plan validation for validatePlan; Milestone 5 implements deterministic structural optimization for optimizePlan. All other planner APIs remain NotImplementedError stubs.',

      capabilities: options.capabilities ?? [
        'planner.create-plan',
        'planner.validate-plan',
        'planner.optimize-plan',
        'planner.estimate-plan',
        'planner.explain-plan',
        'planner.cancel-plan',
      ],
      lifecycleManager: options.lifecycleManager,
      eventBus: options.eventBus,
      logger: options.logger,
      config: options.config,
      metrics: options.metrics,
      healthMonitor: options.healthMonitor,
      authenticationProvider: options.authenticationProvider,
      authorizationProvider: options.authorizationProvider,
      auditLogger: options.auditLogger,
      permissionChecker: options.permissionChecker,
      secretProvider: options.secretProvider,
    });

    this.goalAnalyzer = new GoalAnalyzer();
    this.goalDecomposer = new GoalDecomposer();
    this.planValidator = new PlanValidator();
    this.planOptimizer = new PlanOptimizer();
  }

  /**
   * Analyze the request's `Goal` using `GoalAnalyzer`. If the goal is
   * invalid, throw `PlanningValidationError`. Otherwise, deterministically
   * decompose the goal into a `Plan` using `GoalDecomposer` and return it.
   *
   * Milestone 3 scope only: no Context Engine, no Knowledge Engine, no
   * AI, no optimization, no scheduling.
   */
  async createPlan(request: PlannerCreatePlanRequest): Promise<Plan> {
    const analysis: GoalAnalysisResult = this.goalAnalyzer.analyze(request.goal);

    if (!analysis.valid) {
      throw new PlanningValidationError(
        `Goal ${analysis.goalId || '(unknown)'} failed validation.`,
        analysis.issues,
      );
    }

    return this.goalDecomposer.decompose(request.goal);
  }

  /**
   * Delegate entirely to PlanValidator and return its structured
   * PlanValidationResult.
   *
   * Milestone 4 scope only: structural validation only. No graph
   * traversal, no cycle detection, no optimization, no scheduling, no
   * execution, and no calls to any other engine.
   */
  async validatePlan(request: PlannerValidatePlanRequest): Promise<PlanValidationResult> {
    return this.planValidator.validate(request.plan);
  }

  /**
   * Validate the request's `Plan` using `PlanValidator`. If the plan is
   * invalid, throw `PlanningValidationError`. Otherwise, delegate to
   * `PlanOptimizer` and return the optimized `Plan`.
   *
   * Milestone 5 scope only: deterministic structural optimization only.
   * No AI, no heuristics, no cost/time/resource optimization, no
   * scheduling, no parallel execution, no critical-path analysis, no
   * cycle detection, no graph algorithms, no machine learning, and no
   * calls to any other engine.
   */
  async optimizePlan(request: PlannerOptimizePlanRequest): Promise<Plan> {
    const validation: PlanValidationResult = this.planValidator.validate(request.plan);

    if (!validation.valid) {
      throw new PlanningValidationError(
        `Plan ${validation.planId || '(unknown)'} failed validation.`,
        validation.issues,
      );
    }

    return this.planOptimizer.optimize(request.plan);
  }

  async estimatePlan(_request: PlannerEstimatePlanRequest): Promise<PlannerEstimatePlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.estimatePlan is not implemented in Milestone 3');
  }

  async explainPlan(_request: PlannerExplainPlanRequest): Promise<PlannerExplainPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.explainPlan is not implemented in Milestone 3');
  }

  async cancelPlan(_request: PlannerCancelPlanRequest): Promise<PlannerPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.cancelPlan is not implemented in Milestone 3');
  }
}

export const plannerEngine = {
  name: 'planner' as const,
  description: 'Planner Engine with deterministic createPlan (Milestone 3); remaining APIs are stubs.',
};
