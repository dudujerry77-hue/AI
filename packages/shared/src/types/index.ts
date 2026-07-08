export type TitanEngineName =
  | 'context'
  | 'knowledge'
  | 'planner'
  | 'orchestrator'
  | 'execution'
  | 'validation'
  | 'learning';

export interface TitanEngineDescriptor {
  readonly name: TitanEngineName;
  readonly description: string;
}
