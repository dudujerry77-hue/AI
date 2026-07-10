import { resolveEngineMetadata, type EngineContract } from '../engine/types';

export class EngineRegistry {
  private readonly engines = new Map<string, EngineContract>();

  register(engine: EngineContract): void {
    const metadata = resolveEngineMetadata(engine);
    this.engines.set(metadata.id, engine);
  }

  get(id: string): EngineContract | undefined {
    return this.engines.get(id);
  }

  list(): EngineContract[] {
    return Array.from(this.engines.values());
  }

  findByCapability(capability: string): EngineContract[] {
    return this.list().filter((engine) => resolveEngineMetadata(engine).capabilities.includes(capability));
  }
}
