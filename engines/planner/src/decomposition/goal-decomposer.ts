import type { Dependency, Goal, Plan, PlanStep, Task } from '../models/types';

/**
 * `GoalDecomposer` deterministically converts a single `Goal` into a
 * single `Plan`.
 *
 * Milestone 3 scope: produces a fixed, static sequence of `PlanStep`s
 * and their corresponding `Task`s, connected by sequential
 * `Dependency` edges. There is no scheduling, no execution, no
 * optimization, no graph algorithms, and no learning involved -
 * the output shape is always the same fixed pipeline for any valid
 * goal.
 */
export class GoalDecomposer {
  /**
   * Deterministically decompose `goal` into a `Plan`.
   *
   * The same `goal` input always produces the same `Plan` output
   * (aside from carrying forward the goal's own identifiers/fields).
   * No randomness and no timestamps are generated beyond what the
   * `Plan`'s existing metadata contract already requires, which is
   * derived directly from the goal's own `createdAt`/`updatedAt`.
   */
  decompose(goal: Goal): Plan {
    const steps = this.buildSteps();
    const tasks = this.buildTasks(steps);
    const dependencies = this.buildDependencies(steps, tasks);

    return {
      planId: `plan-${goal.goalId}`,
      goalId: goal.goalId,
      status: 'draft',
      metadata: {
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
        createdBy: 'planner-engine:goal-decomposer',
        revision: 1,
        labels: ['milestone-3', 'static-decomposition'],
      },
      steps,
      tasks,
      dependencies,
      constraints: [],
    };
  }

  /**
   * Fixed static sequence of plan steps produced for every goal.
   */
  private buildSteps(): readonly PlanStep[] {
    return [
      {
        stepId: 'step-analysis',
        title: 'Analysis',
        description: 'Analyze the goal and gather requirements.',
        type: 'analysis',
        status: 'pending',
        taskIds: ['task-analysis'],
      },
      {
        stepId: 'step-design',
        title: 'Design',
        description: 'Design the approach to satisfy the goal.',
        type: 'design',
        status: 'pending',
        taskIds: ['task-design'],
        dependsOnStepIds: ['step-analysis'],
      },
      {
        stepId: 'step-implementation',
        title: 'Implementation',
        description: 'Implement the designed approach.',
        type: 'implementation',
        status: 'pending',
        taskIds: ['task-implementation'],
        dependsOnStepIds: ['step-design'],
      },
      {
        stepId: 'step-validation',
        title: 'Validation',
        description: 'Validate that the implementation satisfies the goal.',
        type: 'validation',
        status: 'pending',
        taskIds: ['task-validation'],
        dependsOnStepIds: ['step-implementation'],
      },
      {
        stepId: 'step-documentation',
        title: 'Documentation',
        description: 'Document the outcome of the goal.',
        type: 'documentation',
        status: 'pending',
        taskIds: ['task-documentation'],
        dependsOnStepIds: ['step-validation'],
      },
    ];
  }

  /**
   * Build exactly one task per plan step, in the same fixed order.
   */
  private buildTasks(steps: readonly PlanStep[]): readonly Task[] {
    const taskTitleByStepId: Record<string, string> = {
      'step-analysis': 'Analyze goal',
      'step-design': 'Design approach',
      'step-implementation': 'Implement approach',
      'step-validation': 'Validate outcome',
      'step-documentation': 'Document outcome',
    };

    const taskDescriptionByStepId: Record<string, string> = {
      'step-analysis': 'Perform structural analysis of the goal requirements.',
      'step-design': 'Produce a design that fulfills the analyzed requirements.',
      'step-implementation': 'Carry out the implementation defined by the design.',
      'step-validation': 'Verify the implementation meets the goal.',
      'step-documentation': 'Record the outcome and decisions made.',
    };

    return steps.map((step) => {
      const taskId = step.taskIds[0];
      return {
        taskId,
        stepId: step.stepId,
        title: taskTitleByStepId[step.stepId] ?? `Task for ${step.stepId}`,
        description: taskDescriptionByStepId[step.stepId] ?? `Task supporting ${step.stepId}.`,
        status: 'pending',
      };
    });
  }

  /**
   * Build strictly sequential dependencies between consecutive steps.
   * No graph algorithms - just a fixed linear chain matching the
   * static step sequence above.
   */
  private buildDependencies(
    steps: readonly PlanStep[],
    tasks: readonly Task[],
  ): readonly Dependency[] {
    const dependencies: Dependency[] = [];

    for (let index = 1; index < steps.length; index += 1) {
      const previousStep = steps[index - 1];
      const currentStep = steps[index];

      dependencies.push({
        dependencyId: `dep-${previousStep.stepId}-to-${currentStep.stepId}`,
        type: 'sequential',
        sourceId: previousStep.stepId,
        targetId: currentStep.stepId,
        reason: `${currentStep.title} must follow ${previousStep.title}.`,
      });
    }

    for (const task of tasks) {
      dependencies.push({
        dependencyId: `dep-${task.taskId}-requires-${task.stepId}`,
        type: 'requires',
        sourceId: task.taskId,
        targetId: task.stepId,
        reason: `${task.title} fulfills ${task.stepId}.`,
      });
    }

    return dependencies;
  }
}
