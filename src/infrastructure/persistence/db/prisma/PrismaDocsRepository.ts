import type { DocsRepository } from '../../DocsRepository.js';
import { OpsDocument } from '../../../../domain/docs/OpsDocument.js';
import type { OpsDocument as PrismaOpsDocument } from '../../../../../prisma/generated/client/index.js';
import type { PrismaTx } from '../../../db/prisma.js';

export class PrismaDocsRepository implements DocsRepository {
  constructor(private readonly prisma: PrismaTx) {}

  async save(doc: OpsDocument): Promise<void> {
    await this.prisma.opsDocument.upsert({
      where: { id: doc.id },
      update: {
        title: doc.title,
        category: doc.category,
        tags: doc.tags,
        body: doc.body,
        spacecraftId: doc.spacecraftId,
        publishedAt: doc.publishedAt,
      },
      create: {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        tags: doc.tags,
        body: doc.body,
        spacecraftId: doc.spacecraftId,
        publishedAt: doc.publishedAt,
      },
    });
  }

  async search(keyword: string, limit: number): Promise<OpsDocument[]> {
    const q = keyword;
    const rows = await this.prisma.opsDocument.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      },
      take: limit,
    });
    return rows.map((r: PrismaOpsDocument) =>
      OpsDocument.rehydrate({
        id: r.id,
        spacecraftId: r.spacecraftId ?? null,
        title: r.title,
        category: r.category,
        tags: r.tags ?? [],
        body: r.body,
        publishedAt: r.publishedAt,
      }),
    );
  }

  async findById(id: string): Promise<OpsDocument | null> {
    const r = await this.prisma.opsDocument.findUnique({ where: { id } });
    if (!r) return null;
    return OpsDocument.rehydrate({
      id: r.id,
      spacecraftId: r.spacecraftId ?? null,
      title: r.title,
      category: r.category,
      tags: r.tags ?? [],
      body: r.body,
      publishedAt: r.publishedAt,
    });
  }
}
