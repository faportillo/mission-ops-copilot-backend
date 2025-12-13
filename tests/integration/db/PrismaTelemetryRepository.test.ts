import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaTelemetryRepository } from '../../../src/infrastructure/persistence/db/prisma/PrismaTelemetryRepository.js';
import { TelemetrySnapshot } from '../../../src/domain/telemetry/TelemetrySnapshot.js';
import type { AppConfig } from '../../../src/config/schema.js';
import { createAppContext } from '../../../src/index.js';
import { getPrisma } from '../../../src/infrastructure/db/prisma.js';

let container: StartedPostgreSqlContainer;

describe('PrismaTelemetryRepository (integration)', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    const url = container.getConnectionUri();
    process.env.DATABASE_URL = url;
    // Push Prisma schema to the test DB
    await execa('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
    });
  }, 120_000);

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
    await container.stop();
  }, 120_000);

  it('saves and finds recent telemetry snapshots via app context wiring', async () => {
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
    // Sanity: repo is postgres
    expect(ctx.telemetryRepository).instanceOf(PrismaTelemetryRepository);

    const s1 = TelemetrySnapshot.create({
      id: 'psql-a',
      spacecraftId: 'SC-PSQL',
      timestamp: new Date('2025-01-01T00:00:00Z'),
      parameters: { temp: 11 },
    });
    const s2 = TelemetrySnapshot.create({
      id: 'psql-b',
      spacecraftId: 'SC-PSQL',
      timestamp: new Date('2025-01-01T00:01:00Z'),
      parameters: { temp: 12 },
    });
    await ctx.telemetryRepository.save(s1);
    await ctx.telemetryRepository.save(s2);
    const recent = await ctx.telemetryRepository.findRecent('SC-PSQL', 2);
    expect(recent.map((r) => r.id)).toEqual(['psql-b', 'psql-a']);
    // Ensure class instance with method
    const diff = recent[0].diffFrom(recent[1]);
    expect(diff.changed.length).toBeGreaterThan(0);
  }, 120_000);
});
