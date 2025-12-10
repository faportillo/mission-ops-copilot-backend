import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../../index.js';

export async function spacecraftRoutes(app: FastifyInstance, ctx: AppContext) {
  const { spacecraftConfigService, listSpacecraftConfigUseCase, countSpacecraftConfigsUseCase } =
    ctx;

  app.withTypeProvider().get('/spacecraft', {}, async (req) => {
    // Parse pagination parameters (limit, offset) from query string
    const { limit = 20, offset = 0 } = req.query as { limit?: number; offset?: number };
    // Ensure numeric and positive values with sensible bounds
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const safeOffset = Math.max(0, Number(offset) || 0);

    // Fetch total count and corresponding page of configs
    const [items, total] = await Promise.all([
      listSpacecraftConfigUseCase.execute({ limit: safeLimit, offset: safeOffset }),
      countSpacecraftConfigsUseCase.execute(),
    ]);
    return {
      total,
      count: items.length,
      limit: safeLimit,
      offset: safeOffset,
      items,
    };
  });

  app.get('/spacecraft/:id/status', async (request) => {
    const { id: spacecraftId } = request.params as { id: string };
    const now = new Date();
    const h1 = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const h6 = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const last = await ctx.telemetryRepository.findRecent(spacecraftId, 1);
    const lastTimestamp = last.length > 0 ? last[0].timestamp : null;

    const [a1, a6, a24] = await Promise.all([
      ctx.analyzeTelemetryUseCase.execute({ spacecraftId, from: h1, to: now }),
      ctx.analyzeTelemetryUseCase.execute({ spacecraftId, from: h6, to: now }),
      ctx.analyzeTelemetryUseCase.execute({ spacecraftId, from: h24, to: now }),
    ]);

    const count1h = a1.length;
    const count6h = a6.length;
    const count24h = a24.length;

    const sevOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
    const highest24 =
      a24.reduce<'LOW' | 'MEDIUM' | 'HIGH' | null>((acc, x) => {
        if (!acc) return x.severity;
        return sevOrder[x.severity] > sevOrder[acc] ? x.severity : acc;
      }, null) ?? 'LOW';

    const overallStatus =
      highest24 === 'HIGH' ? 'CRITICAL' : highest24 === 'MEDIUM' ? 'WARNING' : 'NOMINAL';

    return {
      spacecraftId,
      lastTelemetryTimestamp: lastTimestamp,
      anomalies: {
        last1h: count1h,
        last6h: count6h,
        last24h: count24h,
      },
      highestSeverityLast24h: highest24,
      overallStatus,
    };
  });

  app.get('/spacecraft/:id/config', async (request, reply) => {
    const { id: spacecraftId } = request.params as { id: string };

    const cfg = await spacecraftConfigService.getConfig(spacecraftId);
    if (!cfg) {
      return reply.code(404).send({ error: { message: 'Config not found' } });
    }

    return {
      spacecraftId,
      config: cfg.config,
      status: cfg.status,
      source: cfg.source,
    };
  });

  app.put('/spacecraft/:id/config', async (request, reply) => {
    const { id: spacecraftId } = request.params as { id: string };
    const body = request.body;

    try {
      const updated = await spacecraftConfigService.updateConfig(spacecraftId, body, {
        status: 'approved',
        source: 'manual',
      });

      return {
        spacecraftId,
        config: updated.config,
        status: updated.status,
        source: updated.source,
      };
    } catch (err) {
      request.log.error({ err }, 'Failed to update spacecraft config');
      return reply.code(400).send({ error: { message: 'Invalid config payload' } });
    }
  });
}
