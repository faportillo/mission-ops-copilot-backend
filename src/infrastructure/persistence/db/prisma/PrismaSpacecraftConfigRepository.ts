import type { SpacecraftConfigRepository } from '../../SpacecraftConfigRepository.js';
import type { SpacecraftConfig } from '../../../../domain/spacecraft/SpacecraftConfig.js';
import { getPrisma } from '../../../db/prisma.js';

export class PrismaSpacecraftConfigRepository implements SpacecraftConfigRepository {
  async getBySpacecraftId(spacecraftId: string): Promise<SpacecraftConfig | null> {
    const prisma = getPrisma();
    return prisma.spacecraftConfig.findUnique({
      where: { spacecraftId },
    });
  }

  async upsert(
    spacecraftId: string,
    config: unknown,
    options?: { status?: string; source?: string },
  ): Promise<SpacecraftConfig> {
    const prisma = getPrisma();
    return prisma.spacecraftConfig.upsert({
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
    const prisma = getPrisma();
    return prisma.spacecraftConfig.findMany({
      skip: options.offset,
      take: options.limit,
    });
  }
  async countConfigs(): Promise<number> {
    const prisma = getPrisma();
    return prisma.spacecraftConfig.count();
  }
}
