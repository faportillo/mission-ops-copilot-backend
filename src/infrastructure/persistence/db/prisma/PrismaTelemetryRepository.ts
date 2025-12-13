import type { TelemetryRepository } from '../../TelemetryRepository.js';
import { TelemetrySnapshot } from '../../../../domain/telemetry/TelemetrySnapshot.js';
import { PrismaClient } from '../../../../../prisma/generated/client/index.js';

export class PrismaTelemetryRepository implements TelemetryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(snapshot: TelemetrySnapshot): Promise<void> {
    await this.prisma.telemetrySnapshot.upsert({
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
    const rows = await this.prisma.telemetrySnapshot.findMany({
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
    const r = await this.prisma.telemetrySnapshot.findUnique({ where: { id } });
    return r
      ? TelemetrySnapshot.create({
          id: r.id,
          spacecraftId: r.spacecraftId,
          timestamp: r.timestamp,
          parameters: r.parameters as Record<string, number | string | boolean>,
        })
      : null;
  }

  async findInRange(spacecraftId: string, from: Date, to: Date): Promise<TelemetrySnapshot[]> {
    const rows = await this.prisma.telemetrySnapshot.findMany({
      where: {
        spacecraftId,
        timestamp: { gte: from, lte: to },
      },
      orderBy: { timestamp: 'asc' },
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
}
