import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createAppContext } from '../../../src/index.js';
import type { AppConfig } from '../../../src/config/schema.js';
import { PrismaSpacecraftConfigRepository } from '../../../src/infrastructure/persistence/db/prisma/PrismaSpacecraftConfigRepository.js';
import { getPrisma } from '../../../src/infrastructure/db/prisma.js';

let container: StartedPostgreSqlContainer;

describe('PrismaSpacecraftConfigRepository (integration)', () => {
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

  it('upserts, reads, pages, and counts configs', async () => {
    const url = process.env.DATABASE_URL!;
    const cfg: AppConfig = {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      PORT: 0,
      DATA_BACKEND: 'postgres',
      DATA_DIR: undefined,
      DATABASE_URL: url,
    };
    const ctx = createAppContext(cfg);
    // Sanity: use the Postgres repo directly
    const repo = new PrismaSpacecraftConfigRepository();

    const scId = 'SC-DB-CFG';
    // Ensure FK exists
    const prisma = getPrisma();
    await prisma.spacecraft.create({
      data: { id: scId, name: 'DB Test Craft' },
    });
    const saved = await repo.upsert(
      scId,
      { parameters: { temp: { warnHigh: 44 } } },
      { status: 'approved', source: 'test' },
    );
    expect(saved.spacecraftId).toBe(scId);
    expect((saved as any).config?.parameters?.temp?.warnHigh).toBe(44);
    expect(saved.status).toBe('approved');
    expect(saved.source).toBe('test');

    const got = await repo.getBySpacecraftId(scId);
    expect(got?.spacecraftId).toBe(scId);

    const total = await repo.countConfigs();
    expect(total).toBeGreaterThan(0);

    const page = await repo.listConfigsPaged({ limit: 10, offset: 0 });
    expect(page.length).toBeGreaterThan(0);

    // ensure ctx wiring created service without throwing (side-effect)
    expect(ctx.spacecraftConfigRepository).toBeDefined();
  }, 120_000);
});
