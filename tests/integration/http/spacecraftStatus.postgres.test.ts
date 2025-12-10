import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { execa } from 'execa';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { registerHttpRoutes } from '../../../src/interfaces/http/index.js';
import { createAppContext } from '../../../src/index.js';
import type { AppConfig } from '../../../src/config/schema.js';
import { TelemetrySnapshot } from '../../../src/domain/telemetry/TelemetrySnapshot.js';
import { getPrisma } from '../../../src/infrastructure/db/prisma.js';

let container: StartedPostgreSqlContainer;

describe('GET /spacecraft/:id/status (Postgres)', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    const url = container.getConnectionUri();
    process.env.DATABASE_URL = url;
    await execa('npx', ['prisma', 'generate'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    await execa('npx', ['prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
    });
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  }, 120_000);

  it('returns last timestamp, anomaly counts, and overall status', async () => {
    const url = container.getConnectionUri();
    const cfg: AppConfig = {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      PORT: 0,
      DATA_BACKEND: 'postgres',
      DATA_DIR: undefined,
      DATABASE_URL: url,
    };
    const ctx = createAppContext(cfg);
    const app = Fastify({ logger: false }).withTypeProvider();
    await registerHttpRoutes(app, ctx);

    const prisma = getPrisma();
    const spacecraftId = 'SC-STATUS';
    await prisma.spacecraft.create({ data: { id: spacecraftId, name: 'Status Craft' } });
    await ctx.spacecraftConfigRepository.upsert(
      spacecraftId,
      { parameters: { temp: { warnHigh: 50, critHigh: 90 } } },
      { status: 'approved', source: 'test' },
    );

    const now = Date.now();
    const mk = (msAgo: number, val: number, id: string) =>
      TelemetrySnapshot.create({
        id,
        spacecraftId,
        timestamp: new Date(now - msAgo),
        parameters: { temp: val },
      });
    // Seed: last 30m warn, 2h normal, 20h critical
    await ctx.telemetryRepository.save(mk(30 * 60_000, 60, 'w30m'));
    await ctx.telemetryRepository.save(mk(2 * 3600_000, 40, 'n2h'));
    await ctx.telemetryRepository.save(mk(20 * 3600_000, 100, 'c20h'));

    const res = await app.inject({
      method: 'GET',
      url: `/spacecraft/${spacecraftId}/status`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.spacecraftId).toBe(spacecraftId);
    expect(body.lastTelemetryTimestamp).toBeTruthy();
    expect(body.anomalies.last1h).toBeGreaterThanOrEqual(1); // w30m inside 1h
    expect(body.anomalies.last6h).toBeGreaterThanOrEqual(1); // includes w30m
    expect(body.anomalies.last24h).toBeGreaterThanOrEqual(2); // includes c20h + w30m
    expect(body.highestSeverityLast24h).toBe('HIGH');
    expect(body.overallStatus).toBe('CRITICAL');

    await app.close();
  }, 120_000);
});
