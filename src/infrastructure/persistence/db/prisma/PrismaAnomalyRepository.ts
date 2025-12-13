import type { AnomalyRepository } from '../../AnomalyRepository.js';
import type { TelemetryAnomaly } from '../../../../domain/telemetry/TelemetryAnomaly.js';
import { getPrisma } from '../../../db/prisma.js';

export class PrismaAnomalyRepository implements AnomalyRepository {
  async saveManyUnique(anomalies: TelemetryAnomaly[]): Promise<number> {
    if (anomalies.length === 0) return 0;
    const prisma = getPrisma();
    const data = anomalies.map((a) => ({
      id: a.id,
      spacecraftId: a.spacecraftId,
      timestamp: a.timestamp,
      parameter: a.parameter,
      value: a.value as any,
      severity: a.severity,
      description: a.description,
      detectedAt: a.detectedAt ?? new Date(),
      windowStart: a.windowStart ?? null,
      windowEnd: a.windowEnd ?? null,
    }));
    const res = await prisma.telemetryAnomaly.createMany({
      data,
      skipDuplicates: true,
    });
    return res.count;
  }

  async findRecent(spacecraftId: string, limit: number): Promise<TelemetryAnomaly[]> {
    const prisma = getPrisma();
    const rows = await prisma.telemetryAnomaly.findMany({
      where: { spacecraftId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      spacecraftId: r.spacecraftId,
      timestamp: r.timestamp,
      parameter: r.parameter,
      value: r.value as any,
      severity: r.severity as any,
      description: r.description,
      detectedAt: r.detectedAt ?? undefined,
      windowStart: r.windowStart ?? undefined,
      windowEnd: r.windowEnd ?? undefined,
    }));
  }

  async findInRange(spacecraftId: string, from: Date, to: Date): Promise<TelemetryAnomaly[]> {
    const prisma = getPrisma();
    const rows = await prisma.telemetryAnomaly.findMany({
      where: { spacecraftId, timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      spacecraftId: r.spacecraftId,
      timestamp: r.timestamp,
      parameter: r.parameter,
      value: r.value as any,
      severity: r.severity as any,
      description: r.description,
      detectedAt: r.detectedAt ?? undefined,
      windowStart: r.windowStart ?? undefined,
      windowEnd: r.windowEnd ?? undefined,
    }));
  }
}
