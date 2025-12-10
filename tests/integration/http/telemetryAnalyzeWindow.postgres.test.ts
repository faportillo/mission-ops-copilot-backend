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

describe('GET /telemetry/analyze with time window (Postgres)', () => {
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

  it('returns anomalies only within [from,to]', async () => {
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
    const spacecraftId = 'SC-WIN';
    await prisma.spacecraft.create({ data: { id: spacecraftId, name: 'Window Craft' } });
    await ctx.spacecraftConfigRepository.upsert(
      spacecraftId,
      { parameters: { temp: { warnHigh: 50, critHigh: 90 } } },
      { status: 'approved', source: 'test' },
    );

    const now = Date.now();
    // Create three snapshots: -3h (warn), -90m (crit), -30m (warn)
    const mk = (msAgo: number, val: number, id: string) =>
      TelemetrySnapshot.create({
        id,
        spacecraftId,
        timestamp: new Date(now - msAgo),
        parameters: { temp: val },
      });
    await ctx.telemetryRepository.save(mk(3 * 3600_000, 60, 'w3h')); // warn, outside 2h window
    await ctx.telemetryRepository.save(mk(90 * 60_000, 100, 'c90m')); // crit, inside
    await ctx.telemetryRepository.save(mk(30 * 60_000, 60, 'w30m')); // warn, inside

    const from = new Date(now - 2 * 3600_000).toISOString();
    const to = new Date(now).toISOString();
    const res = await app.inject({
      method: 'GET',
      url: `/telemetry/analyze?spacecraftId=${spacecraftId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    });
    expect(res.statusCode).toBe(200);
    const anomalies = res.json() as Array<{ id: string; severity: string }>;
    const ids = anomalies.map((a) => a.id);
    expect(ids.some((id) => id.includes('c90m'))).toBe(true);
    expect(ids.some((id) => id.includes('w30m'))).toBe(true);
    expect(ids.some((id) => id.includes('w3h'))).toBe(false);

    await app.close();
  }, 120_000);
});
