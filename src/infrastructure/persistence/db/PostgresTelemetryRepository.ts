import type { TelemetryRepository } from '../TelemetryRepository.js';
import { TelemetrySnapshot } from '../../../domain/telemetry/TelemetrySnapshot.js';
import { getPrisma } from '../../../infrastructure/db/prisma.js';

export class PostgresTelemetryRepository implements TelemetryRepository {
  async save(snapshot: TelemetrySnapshot): Promise<void> {
    const prisma = getPrisma();
    await prisma.telemetrySnapshot.upsert({
      where: { id: snapshot.id },
      update: {
        spacecraftId: snapshot.spacecraftId,
        timestamp: snapshot.timestamp,
        parameters: snapshot.parameters as unknown as object,
      },
      create: {
        id: snapshot.id,
        spacecraftId: snapshot.spacecraftId,
        timestamp: snapshot.timestamp,
        parameters: snapshot.parameters as unknown as object,
      },
    });
  }

  async findRecent(spacecraftId: string, limit: number): Promise<TelemetrySnapshot[]> {
    const prisma = getPrisma();
    const rows = await prisma.telemetrySnapshot.findMany({
      where: { spacecraftId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map((r) =>
      TelemetrySnapshot.create({
        id: r.id,
        spacecraftId: r.spacecraftId,
        timestamp: r.timestamp,
        parameters: r.parameters as Record<string, number | string | boolean>,
      }),
    );
  }

  async findById(id: string): Promise<TelemetrySnapshot | null> {
    const prisma = getPrisma();
    const r = await prisma.telemetrySnapshot.findUnique({ where: { id } });
    return r
      ? TelemetrySnapshot.create({
          id: r.id,
          spacecraftId: r.spacecraftId,
          timestamp: r.timestamp,
          parameters: r.parameters as Record<string, number | string | boolean>,
        })
      : null;
  }
}
