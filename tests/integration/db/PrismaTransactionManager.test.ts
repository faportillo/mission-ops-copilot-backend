import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { getPrisma } from '../../../src/infrastructure/db/prisma.js';
import { PrismaTransactionManager } from '../../../src/infrastructure/persistence/db/prisma/PrismaTransactionManager.js';

let container: StartedPostgreSqlContainer;

describe('PrismaTransactionManager (integration)', () => {
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

  it('commits: persists doc and outbox together', async () => {
    const prisma = getPrisma();
    const txm = new PrismaTransactionManager(prisma);
    const id = `doc_${Date.now()}`;

    await txm.withTransaction(async (ctx) => {
      await ctx.docs.save({
        id,
        title: 'TXM Doc',
        body: 'Atomic write content',
        tags: ['txm'],
      } as any);
      await ctx.outbox.enqueue({
        type: 'OpsDocumentPublished',
        topic: 'domain.OpsDocumentPublished',
        key: id,
        payload: { documentId: id },
      });
      return true;
    });

    const savedDoc = await prisma.opsDocument.findUnique({ where: { id } });
    expect(savedDoc).toBeTruthy();
    const outboxRows = await prisma.outboxEvent.findMany({ where: { key: id } as any });
    expect(outboxRows.length).toBe(1);
  }, 120_000);

  it('rolls back: neither doc nor outbox are persisted on error', async () => {
    const prisma = getPrisma();
    const txm = new PrismaTransactionManager(prisma);
    const id = `doc_${Date.now()}_rb`;

    await expect(
      txm.withTransaction(async (ctx) => {
        await ctx.docs.save({
          id,
          title: 'Rollback Doc',
          body: 'Should rollback',
          tags: [],
        } as any);
        await ctx.outbox.enqueue({
          type: 'OpsDocumentPublished',
          topic: 'domain.OpsDocumentPublished',
          key: id,
          payload: { documentId: id },
        });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow();

    const rolledDoc = await prisma.opsDocument.findUnique({ where: { id } });
    expect(rolledDoc).toBeNull();
    const outboxRows = await prisma.outboxEvent.findMany({ where: { key: id } as any });
    expect(outboxRows.length).toBe(0);
  }, 120_000);
});
