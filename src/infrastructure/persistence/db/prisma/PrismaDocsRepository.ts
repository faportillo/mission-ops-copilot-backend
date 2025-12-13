import type { DocsRepository } from '../../DocsRepository.js';
import type { OpsDocument } from '../../../../domain/docs/OpsDocument.js';
import { getPrisma } from '../../../db/prisma.js';

export class PrismaDocsRepository implements DocsRepository {
  async save(doc: OpsDocument): Promise<void> {
    const prisma = getPrisma();
    await prisma.opsDocument.upsert({
      where: { id: doc.id },
      update: { title: doc.title, content: doc.content, tags: doc.tags },
      create: { id: doc.id, title: doc.title, content: doc.content, tags: doc.tags },
    });
  }

  async search(keyword: string, limit: number): Promise<OpsDocument[]> {
    const prisma = getPrisma();
    const q = keyword;
    const rows = await prisma.opsDocument.findMany({
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
    const prisma = getPrisma();
    return prisma.opsDocument.findUnique({ where: { id } });
  }
}
