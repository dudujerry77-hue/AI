import type { TitanEngine } from '../engine/types';

export class EngineRegistry {
  private readonly engines = new Map<string, TitanEngine>();

  register(engine: TitanEngine): void {
    this.engines.set(engine.metadata.id, engine);
  }

  get(id: string): TitanEngine | undefined {
    return this.engines.get(id);
  }

  list(): TitanEngine[] {
    return Array.from(this.engines.values());
  }

  findByCapability(capability: string): TitanEngine[] {
    return this.list().filter((engine) => engine.metadata.capabilities.includes(capability));
  }
}
