import { BaseEngine } from '../../../runtime/engine/base';
import { ENGINE_API_CONTRACT_VERSION, type BaseEngineOptions } from '../../../runtime/engine/types';

export interface PlannerCreatePlanRequest {
  readonly goal: string;
  readonly context?: Record<string, unknown>;
}

export interface PlannerValidatePlanRequest {
  readonly planId: string;
}

export interface PlannerOptimizePlanRequest {
  readonly planId: string;
}

export interface PlannerEstimatePlanRequest {
  readonly planId: string;
}

export interface PlannerExplainPlanRequest {
  readonly planId: string;
}

export interface PlannerCancelPlanRequest {
  readonly planId: string;
  readonly reason?: string;
}

export interface PlannerPlaceholderResult {
  readonly status: 'not-implemented';
  readonly message: string;
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

  async estimatePlan(_request: PlannerEstimatePlanRequest): Promise<PlannerPlaceholderResult> {
    throw new NotImplementedError('PlannerEngine.estimatePlan is not implemented in Milestone 1');
  }

  async explainPlan(_request: PlannerExplainPlanRequest): Promise<PlannerPlaceholderResult> {
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
