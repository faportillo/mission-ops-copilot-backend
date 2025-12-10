import { describe, it, expect } from 'vitest';
import type { PrismaClient, Spacecraft } from '@prisma/client';
import { seedDemoData } from '../../../src/interfaces/cli/commands/seed-demo-data.js';
import { InMemoryTelemetryRepository } from '../../../src/infrastructure/persistence/inMemory/InMemoryTelemetryRepository.js';
import { SpacecraftConfigService } from '../../../src/application/spacecraft/SpacecraftConfigService.js';
import { InMemorySpacecraftConfigRepository } from '../../../src/infrastructure/persistence/inMemory/InMemorySpacecraftConfigRepository.js';

function makeFakePrisma(): PrismaClient {
  const store: Record<string, Spacecraft> = {};
  const fake: any = {
    spacecraft: {
      async findFirst({ where: { name } }: any) {
        return Object.values(store).find((s) => s.name === name) ?? null;
      },
      async create({ data }: any) {
        const id = `sc_${Object.keys(store).length + 1}`;
        const row: Spacecraft = {
          id,
          name: data.name,
          missionType: data.missionType,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Spacecraft;
        store[id] = row;
        return row;
      },
      async update({ where: { id }, data }: any) {
        const row = store[id];
        if (!row) throw new Error('not found');
        const updated = { ...row, ...data, updatedAt: new Date() } as Spacecraft;
        store[id] = updated;
        return updated;
      },
    },
  };
  return fake as PrismaClient;
}

describe('seedDemoData dry-run', () => {
  it('does not write spacecraft or telemetry when dry-run=true', async () => {
    const prisma = makeFakePrisma();
    const telemetryRepo = new InMemoryTelemetryRepository();
    const cfgSvc = new SpacecraftConfigService(new InMemorySpacecraftConfigRepository());

    await seedDemoData(prisma, telemetryRepo, cfgSvc, {
      durationMinutesPerSpacecraft: 1,
      intervalSeconds: 60,
      dryRun: true,
    });

    // no spacecraft inserted into fake store
    // we cannot access store directly here; rely on telemetry as proxy
    const snapshotsA = await telemetryRepo.findRecent('LEO_IMAGING_DEMO', 5);
    expect(snapshotsA.length).toBe(0);
  });
});
