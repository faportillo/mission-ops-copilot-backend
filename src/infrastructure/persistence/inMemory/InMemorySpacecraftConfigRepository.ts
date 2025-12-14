import type { SpacecraftConfig } from '../../../../prisma/generated/client/index.js';
import type { SpacecraftConfigRepository } from '../SpacecraftConfigRepository.js';

export class InMemorySpacecraftConfigRepository implements SpacecraftConfigRepository {
  private bySpacecraft = new Map<string, SpacecraftConfig>();

  async getBySpacecraftId(spacecraftId: string): Promise<SpacecraftConfig | null> {
    return this.bySpacecraft.get(spacecraftId) ?? null;
  }

  async upsert(
    spacecraftId: string,
    config: unknown,
    options?: { status?: string; source?: string },
  ): Promise<SpacecraftConfig> {
    const existing = this.bySpacecraft.get(spacecraftId);
    const now = new Date();
    const row: SpacecraftConfig = existing
      ? {
          ...existing,
          config: config as any,
          status: options?.status ?? existing.status,
          source: (options?.source ?? existing.source) as any,
          updatedAt: now,
        }
      : {
          id: `cfg_${spacecraftId}`,
          spacecraftId,
          config: config as any,
          status: options?.status ?? 'approved',
          source: (options?.source ?? null) as any,
          createdAt: now,
          updatedAt: now,
        };
    this.bySpacecraft.set(spacecraftId, row);
    return row;
  }
  async listConfigsPaged(options: { limit: number; offset: number }): Promise<SpacecraftConfig[]> {
    return Array.from(this.bySpacecraft.values()).slice(
      options.offset,
      options.offset + options.limit,
    );
  }
  async countConfigs(): Promise<number> {
    return this.bySpacecraft.size;
  }
}
