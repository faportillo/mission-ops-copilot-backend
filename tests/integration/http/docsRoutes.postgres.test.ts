import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { execa } from 'execa';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { registerHttpRoutes } from '../../../src/interfaces/http/index.js';
import { createAppContext } from '../../../src/index.js';
import type { AppConfig } from '../../../src/config/schema.js';

let container: StartedPostgreSqlContainer;

describe('HTTP docs routes with Postgres (Testcontainers)', () => {
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

  it('POST /docs then GET /docs/search finds the document', async () => {
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

    const resPost = await app.inject({
      method: 'POST',
      url: '/docs',
      payload: {
        spacecraftId: 'sc-1',
        title: 'Operations Handbook',
        body: 'This is the mission operations handbook content.',
        tags: ['ops', 'handbook'],
      },
    });
    expect(resPost.statusCode).toBe(201);
    const { documentId } = resPost.json() as { documentId: string };
    expect(documentId).toBeDefined();

    const resSearch = await app.inject({
      method: 'GET',
      url: '/docs/search?q=handbook&limit=5',
    });
    expect(resSearch.statusCode).toBe(200);
    const results = resSearch.json() as Array<{ id: string; title: string }>;
    expect(results.some((d) => d.id === documentId)).toBe(true);

    await app.close();
  }, 120_000);
});
