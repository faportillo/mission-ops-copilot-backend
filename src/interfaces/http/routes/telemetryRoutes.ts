import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../../index.js';
import {
  PostTelemetryBody,
  GetTelemetryQuery,
  AnalyzeTelemetryQuery,
  BatchTelemetryBody,
} from '../http-types.js';
import { TelemetrySnapshot } from '../../../domain/telemetry/TelemetrySnapshot.js';
import { v4 as uuidv4 } from 'uuid';

export async function telemetryRoutes(app: FastifyInstance, ctx: AppContext) {
  app.withTypeProvider().post('/telemetry', {}, async (req, reply) => {
    const body = PostTelemetryBody.parse(req.body);
    ctx.logger.info('POST /telemetry received', {
      spacecraftId: body.spacecraftId,
      timestamp: body.timestamp?.toISOString?.() ?? String(body.timestamp),
    });
    const id = body.id ?? uuidv4();
    const snapshot = TelemetrySnapshot.create({
      id,
      spacecraftId: body.spacecraftId,
      timestamp: body.timestamp,
      parameters: body.parameters,
    });
    await ctx.telemetryService.saveSnapshot(snapshot);
    ctx.logger.info('POST /telemetry saved', {
      id: snapshot.id,
      spacecraftId: snapshot.spacecraftId,
    });
    return reply.code(201).send({ id: snapshot.id });
  });

  app.withTypeProvider().post('/telemetry/batch', {}, async (req, reply) => {
    const body = BatchTelemetryBody.parse(req.body);
    const snapshots = body.snapshots.map((s) => {
      const id = s.id ?? uuidv4();
      return TelemetrySnapshot.create({
        id,
        spacecraftId: s.spacecraftId,
        timestamp: s.timestamp,
        parameters: s.parameters,
      });
    });
    await ctx.telemetryService.saveSnapshots(snapshots);
    return reply.code(201).send({ count: snapshots.length });
  });

  app.withTypeProvider().get('/telemetry', {}, async (req) => {
    const query = GetTelemetryQuery.parse(req.query);
    const list = await ctx.listTelemetryUseCase.execute(query.spacecraftId, query.limit);
    ctx.logger.debug('GET /telemetry list', {
      spacecraftId: query.spacecraftId,
      count: list.length,
    });
    return list;
  });

  app.withTypeProvider().get('/telemetry/analyze', {}, async (req) => {
    const query = AnalyzeTelemetryQuery.parse(req.query);
    const anomalies = await ctx.analyzeTelemetryUseCase.execute({
      spacecraftId: query.spacecraftId,
      limit: query.limit,
      from: query.from,
      to: query.to,
    });
    ctx.logger.info('GET /telemetry/analyze result', {
      spacecraftId: query.spacecraftId,
      anomalies: anomalies.length,
    });
    return anomalies;
  });
}
