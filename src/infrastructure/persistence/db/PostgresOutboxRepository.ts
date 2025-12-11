import { getPrisma } from '../../db/prisma.js';
import type { NewOutboxMessage, OutboxMessage, OutboxRepository } from '../OutboxRepository.js';

function toDomain(row: any): OutboxMessage {
  return {
    id: row.id,
    type: row.type,
    topic: row.topic,
    key: row.key ?? null,
    headers: (row.headers as Record<string, string> | null) ?? null,
    payload: row.payload,
    availableAt: row.availableAt,
    createdAt: row.createdAt,
    processed_at: row.processed_at,
    retries: row.retries,
    lastError: row.lastError ?? null,
  };
}

export class PostgresOutboxRepository implements OutboxRepository {
  async enqueue(message: NewOutboxMessage): Promise<OutboxMessage> {
    const prisma = getPrisma();
    const created = await prisma.outboxEvent.create({
      data: {
        type: message.type,
        topic: message.topic,
        key: message.key,
        headers: message.headers ?? undefined,
        payload: message.payload as any,
        availableAt: message.availableAt ?? new Date(),
      },
    });
    return toDomain(created);
  }

  async fetchPending(limit: number, now: Date): Promise<OutboxMessage[]> {
    const prisma = getPrisma();
    const rows = await prisma.outboxEvent.findMany({
      where: {
        processed_at: null,
        availableAt: { lte: now },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: limit,
    });
    return rows.map(toDomain);
  }

  async markProcessed(id: string, processedAt: Date): Promise<void> {
    const prisma = getPrisma();
    await prisma.outboxEvent.update({
      where: { id },
      data: { processed_at: processedAt, lastError: null },
    });
  }

  async recordFailure(id: string, errorMessage: string, nextAvailableAt: Date): Promise<void> {
    const prisma = getPrisma();
    await prisma.outboxEvent.update({
      where: { id },
      data: {
        retries: { increment: 1 },
        lastError: errorMessage.slice(0, 1000),
        availableAt: nextAvailableAt,
      },
    });
  }
}
