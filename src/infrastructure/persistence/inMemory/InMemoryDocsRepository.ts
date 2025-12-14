import type { DocsRepository } from '../DocsRepository.js';
import type { OpsDocument } from '../../../domain/docs/OpsDocument.js';

export class InMemoryDocsRepository implements DocsRepository {
  private storage: Map<string, OpsDocument> = new Map();

  async save(doc: OpsDocument): Promise<void> {
    this.storage.set(doc.id, doc);
  }

  async search(keyword: string, limit: number): Promise<OpsDocument[]> {
    const q = keyword.toLowerCase();
    const results = Array.from(this.storage.values()).filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
    return results.slice(0, limit);
  }

  async findById(id: string): Promise<OpsDocument | null> {
    return this.storage.get(id) ?? null;
  }
}
