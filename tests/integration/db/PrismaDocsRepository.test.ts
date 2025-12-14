import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { AppConfig } from '../../../src/config/schema.js';
import { createAppContext } from '../../../src/index.js';
import { PrismaDocsRepository } from '../../../src/infrastructure/persistence/db/prisma/PrismaDocsRepository.js';
import { getPrisma } from '../../../src/infrastructure/db/prisma.js';
import { OpsDocument } from '../../../src/domain/docs/OpsDocument.js';

let container: StartedPostgreSqlContainer;

describe('PrismaDocsRepository (integration)', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    const url = container.getConnectionUri();
    process.env.DATABASE_URL = url;
    await execa('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
    });
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  }, 120_000);

  it('saves, finds by id, and searches documents', async () => {
    const url = process.env.DATABASE_URL!;
    const cfg: AppConfig = {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      PORT: 0,
      DATA_BACKEND: 'postgres',
      DATA_DIR: undefined,
      DATABASE_URL: url,
      KAFKA_CLIENT_ID: 'test',
      KAFKA_OUTBOX_ENABLED: false,
      KAFKA_OUTBOX_POLL_MS: 1000,
      KAFKA_OUTBOX_BATCH_SIZE: 10,
    };
    const ctx = createAppContext(cfg);
    const repo = new PrismaDocsRepository(getPrisma());

    const doc = OpsDocument.publish({
      id: `doc_${Date.now()}`,
      title: 'Mission Ops Handbook',
      body: 'Procedures and checklists for operations.',
      tags: ['ops', 'handbook'],
      category: 'general',
    });
    await repo.save(doc);

    const byId = await repo.findById(doc.id);
    expect(byId?.id).toBe(doc.id);
    expect(byId?.title).toBe('Mission Ops Handbook');

    const results = await repo.search('handbook', 10);
    expect(results.some((d) => d.id === doc.id)).toBe(true);

    // ensure ctx wiring created docs repository
    expect(ctx.docsRepository).toBeDefined();
  }, 120_000);
});
