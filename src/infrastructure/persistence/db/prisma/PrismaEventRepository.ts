import type { EventRepository } from '../../EventRepository.js';
import type { MissionEvent } from '../../../../domain/events/MissionEvent.js';
import { PrismaClient } from '../../../../../prisma/generated/client/index.js';

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: MissionEvent): Promise<void> {
    await this.prisma.missionEvent.upsert({
      where: { id: event.id },
      update: {
        spacecraftId: event.spacecraftId,
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity,
        message: event.message,
        metadata: (event.metadata ?? {}) as object,
      },
      create: {
        id: event.id,
        spacecraftId: event.spacecraftId,
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity,
        message: event.message,
        metadata: (event.metadata ?? {}) as object,
      },
    });
  }

  async findRecent(spacecraftId: string, limit: number): Promise<MissionEvent[]> {
    const rows = await this.prisma.missionEvent.findMany({
      where: { spacecraftId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      spacecraftId: r.spacecraftId,
      timestamp: r.timestamp,
      type: r.type as MissionEvent['type'],
      severity: r.severity as MissionEvent['severity'],
      message: r.message,
      metadata: (r.metadata as Record<string, unknown> | null) ?? undefined,
    }));
  }

  async findById(id: string): Promise<MissionEvent | null> {
    const r = await this.prisma.missionEvent.findUnique({ where: { id } });
    return r
      ? {
          id: r.id,
          spacecraftId: r.spacecraftId,
          timestamp: r.timestamp,
          type: r.type as MissionEvent['type'],
          severity: r.severity as MissionEvent['severity'],
          message: r.message,
          metadata: (r.metadata as Record<string, unknown>) ?? undefined,
        }
      : null;
  }
}
