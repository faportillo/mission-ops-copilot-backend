import type { DocsRepository } from '../../DocsRepository.js';
import type { OpsDocument } from '../../../../domain/docs/OpsDocument.js';
import { PrismaClient } from '../../../../../prisma/generated/client/index.js';

export class PrismaDocsRepository implements DocsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(doc: OpsDocument): Promise<void> {
    await this.prisma.opsDocument.upsert({
      where: { id: doc.id },
      update: { title: doc.title, content: doc.content, tags: doc.tags },
      create: { id: doc.id, title: doc.title, content: doc.content, tags: doc.tags },
    });
  }

  async search(keyword: string, limit: number): Promise<OpsDocument[]> {
    const q = keyword;
    const rows = await this.prisma.opsDocument.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      },
      take: limit,
    });
    return rows;
  }

  async findById(id: string): Promise<OpsDocument | null> {
    return this.prisma.opsDocument.findUnique({ where: { id } });
  }
}
