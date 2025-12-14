import { promises as fs } from 'fs';
import { join } from 'path';
import type { DocsRepository } from '../DocsRepository.js';
import { OpsDocument } from '../../../domain/docs/OpsDocument.js';

export class FileDocsRepository implements DocsRepository {
  private filePath: string;
  constructor(private dataDir: string) {
    this.filePath = join(dataDir, 'docs.json');
  }

  private async readAll(): Promise<OpsDocument[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(data) as OpsDocument[];
      return parsed.map((d) => OpsDocument.rehydrate({ ...d, tags: d.tags ?? [] }));
    } catch {
      return [];
    }
  }

  private async writeAll(docs: OpsDocument[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(docs, null, 2), 'utf8');
  }

  async save(doc: OpsDocument): Promise<void> {
    const docs = await this.readAll();
    const idx = docs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) docs[idx] = doc;
    else docs.push(doc);
    await this.writeAll(docs);
  }

  async search(keyword: string, limit: number): Promise<OpsDocument[]> {
    const docs = await this.readAll();
    const q = keyword.toLowerCase();
    const results = docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
    return results.slice(0, limit);
  }

  async findById(id: string): Promise<OpsDocument | null> {
    const docs = await this.readAll();
    return docs.find((d) => d.id === id) ?? null;
  }
}
