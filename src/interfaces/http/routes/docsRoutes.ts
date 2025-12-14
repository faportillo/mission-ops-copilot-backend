import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { CreateOpsDocumentInput, SearchDocsQuery } from '../http-types.js';
import type { AppContext } from '../../../index.js';

export async function docsRoutes(app: FastifyInstance, ctx: AppContext) {
  app.withTypeProvider().post('/docs', {}, async (req, reply) => {
    const body = CreateOpsDocumentInput.parse(req.body);
    const id = body.id ?? uuidv4();
    ctx.logger.info('POST /docs received', { id, title: body.title });

    const doc = await ctx.createOpsDocumentUseCase.execute({
      spacecraftId: body.spacecraftId,
      title: body.title,
      body: body.body,
      tags: body.tags,
      category: body.category ?? 'general',
    });
    ctx.logger.info('POST /docs saved', { documentId: doc.documentId });
    return reply.code(201).send({ documentId: doc.documentId });
  });

  app.withTypeProvider().get('/docs/search', {}, async (req) => {
    const query = SearchDocsQuery.parse(req.query);
    const results = await ctx.searchDocsUseCase.execute(query.q, query.limit);
    ctx.logger.debug('GET /docs/search', { q: query.q, count: results.length });
    return results;
  });
}
