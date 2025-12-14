import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execa } from 'execa';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { AppConfig } from '../../../src/config/schema.js';
import { PrismaOutboxRepository } from '../../../src/infrastructure/persistence/db/prisma/PrismaOutboxRepository.js';
import { OutboxDispatcher } from '../../../src/infrastructure/messaging/OutboxDispatcher.js';
import { SystemTimeProvider } from '../../../src/infrastructure/time/TimeProvider.js';
import { CreateOpsDocumentUseCase } from '../../../src/application/docs/CreateOpsDocumentUseCase.js';
import { PrismaTransactionManager } from '../../../src/infrastructure/persistence/db/prisma/PrismaTransactionManager.js';
import { getPrisma } from '../../../src/infrastructure/db/prisma.js';

// Capture records "sent" to Kafka by mocking the Kafka client
const sent: Array<{
  topic: string;
  record: { key?: string | null; value: any; headers?: Record<string, string> };
}> = [];

vi.mock('../../../src/infrastructure/messaging/KafkaClient.js', () => {
  return {
    createKafkaProducer: () => ({
      connect: vi.fn(async () => {}),
      disconnect: vi.fn(async () => {}),
    }),
    sendRecord: vi.fn(async (_producer, topic: string, record: any) => {
      sent.push({ topic, record });
    }),
  };
});

let container: StartedPostgreSqlContainer;

describe('CreateOpsDocumentUseCase → Kafka outbox (end-to-end)', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    const url = container.getConnectionUri();
    process.env.DATABASE_URL = url;
    process.env.KAFKA_CLIENT_ID = 'test-e2e';
    await execa('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
    });
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  }, 120_000);

  it('publishes OpsDocumentPublished to Kafka with correct payload and headers', async () => {
    const url = process.env.DATABASE_URL!;
    const cfg: AppConfig = {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      PORT: 0,
      DATA_BACKEND: 'postgres',
      DATA_DIR: undefined,
      DATABASE_URL: url,
      KAFKA_BROKERS: 'localhost:29092',
      KAFKA_CLIENT_ID: 'test-e2e',
      KAFKA_OUTBOX_ENABLED: true,
      KAFKA_OUTBOX_POLL_MS: 50,
      KAFKA_OUTBOX_BATCH_SIZE: 10,
    };

    const prisma = getPrisma();
    const outbox = new PrismaOutboxRepository(prisma);
    const time = new SystemTimeProvider();
    const logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      child: () => logger,
    };
    const dispatcher = new OutboxDispatcher({
      repo: outbox,
      logger,
      time,
      config: cfg,
      pollMs: 50,
      batchSize: 10,
    });
    await dispatcher.start();

    const txm = new PrismaTransactionManager(prisma);
    const uc = new CreateOpsDocumentUseCase(txm);
    const input = {
      spacecraftId: 'SC-123',
      title: 'Ops: Communications',
      category: 'general',
      tags: ['ops', 'comms'],
      body: 'Communications procedures and SOPs.',
    };
    const { documentId } = await uc.execute(input);

    // Wait for dispatcher to pick up and "send" the outbox message
    const start = Date.now();
    let published: { topic: string; record: any } | undefined;
    while (Date.now() - start < 3000) {
      published = sent.find((m) => m.topic === 'domain.OpsDocumentPublished');
      if (published) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    await dispatcher.stop();

    expect(published, 'expected a Kafka record to be sent').toBeDefined();
    // Validate headers
    expect(published!.record.headers?.schemaVersion).toBe('1');
    // Validate key
    expect(published!.record.key).toBe('SC-123');
    // Validate payload content
    const payloadJson =
      typeof published!.record.value === 'string'
        ? published!.record.value
        : Buffer.isBuffer(published!.record.value)
          ? published!.record.value.toString('utf-8')
          : String(published!.record.value);
    const payload = JSON.parse(payloadJson);
    expect(payload.eventType).toBe('OpsDocumentPublished');
    expect(payload.documentId).toBe(documentId);
    expect(payload.spacecraftId).toBe('SC-123');
    expect(payload.category).toBe('general');
    expect(payload.tags).toContain('ops');
  }, 120_000);
});
