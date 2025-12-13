import type { SpacecraftConfigRepository } from '../../SpacecraftConfigRepository.js';
import type { SpacecraftConfig } from '../../../../domain/spacecraft/SpacecraftConfig.js';
import { PrismaClient } from '../../../../../prisma/generated/client/index.js';

export class PrismaSpacecraftConfigRepository implements SpacecraftConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getBySpacecraftId(spacecraftId: string): Promise<SpacecraftConfig | null> {
    return this.prisma.spacecraftConfig.findUnique({
      where: { spacecraftId },
    });
  }

  async upsert(
    spacecraftId: string,
    config: unknown,
    options?: { status?: string; source?: string },
  ): Promise<SpacecraftConfig> {
    return this.prisma.spacecraftConfig.upsert({
      where: { spacecraftId },
      create: {
        spacecraftId,
        config: config as any,
        status: options?.status ?? 'approved',
        source: options?.source ?? null,
      },
      update: {
        config: config as any,
        status: options?.status ?? 'approved',
        source: options?.source ?? null,
      },
    });
  }
  async listConfigsPaged(options: { limit: number; offset: number }): Promise<SpacecraftConfig[]> {
    return this.prisma.spacecraftConfig.findMany({
      skip: options.offset,
      take: options.limit,
    });
  }
  async countConfigs(): Promise<number> {
    return this.prisma.spacecraftConfig.count();
  }
}
