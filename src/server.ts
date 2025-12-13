import Fastify from 'fastify';
import { registerHttpRoutes } from './interfaces/http/index.js';
import { createAppContext } from './index.js';
import { loadConfig } from './config/index.js';
import { getLogger } from './logging/logger.js';
import { OutboxDispatcher } from './infrastructure/messaging/OutboxDispatcher.js';
import { PrismaOutboxRepository } from './infrastructure/persistence/db/prisma/PrismaOutboxRepository.js';

async function main() {
  const config = loadConfig();
  const logger = getLogger();
  const ctx = createAppContext();
  const prisma = ctx.prisma;

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
  }).withTypeProvider();

  await registerHttpRoutes(app, ctx);

  try {
    // Start optional Kafka outbox dispatcher
    let dispatcher: OutboxDispatcher | null = null;
    if (config.KAFKA_OUTBOX_ENABLED && config.DATA_BACKEND === 'postgres') {
      const outboxRepo = new PrismaOutboxRepository(prisma);
      dispatcher = new OutboxDispatcher({
        repo: outboxRepo,
        logger,
        time: ctx.time,
        config,
        pollMs: config.KAFKA_OUTBOX_POLL_MS,
        batchSize: config.KAFKA_OUTBOX_BATCH_SIZE,
      });
      await dispatcher.start();
      app.addHook('onClose', async () => {
        await dispatcher?.stop();
      });
    }

    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`HTTP server listening on port ${config.PORT}`);
  } catch (err) {
    logger.error('Failed to start server', { err });
    process.exit(1);
  }
}

main();
