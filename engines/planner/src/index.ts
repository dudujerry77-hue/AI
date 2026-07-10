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

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export class PlannerEngine extends BaseEngine {
  constructor(options: PlannerEngineOptions = {}) {
    super({
      id: options.id ?? 'planner-engine',
      name: options.name ?? 'Planner Engine',
      version: options.version ?? '1.0.0',
      contractVersion: options.contractVersion ?? ENGINE_API_CONTRACT_VERSION,
      description:
        options.description ??
        'Goal-to-plan engine skeleton for Titan AI. Milestone 1 provides runtime contract and API stubs only.',
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
  }

  async createPlan(_request: PlannerCreatePlanRequest): Promise<PlannerPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.createPlan is not implemented in Milestone 1');
  }

  async validatePlan(_request: PlannerValidatePlanRequest): Promise<PlannerPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.validatePlan is not implemented in Milestone 1');
  }

  async optimizePlan(_request: PlannerOptimizePlanRequest): Promise<PlannerPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.optimizePlan is not implemented in Milestone 1');
  }

  async estimatePlan(_request: PlannerEstimatePlanRequest): Promise<PlannerEstimatePlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.estimatePlan is not implemented in Milestone 1');
  }

  async explainPlan(_request: PlannerExplainPlanRequest): Promise<PlannerExplainPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.explainPlan is not implemented in Milestone 1');
  }

  async cancelPlan(_request: PlannerCancelPlanRequest): Promise<PlannerPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.cancelPlan is not implemented in Milestone 1');
  }
}

export const plannerEngine = {
  name: 'planner' as const,
  description: 'Planner Engine runtime-contract skeleton with stub planner APIs.',
};
