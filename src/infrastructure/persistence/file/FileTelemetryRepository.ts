import { promises as fs } from 'fs';
import { join } from 'path';
import type { TelemetryRepository } from '../TelemetryRepository.js';
import { TelemetrySnapshot } from '../../../domain/telemetry/TelemetrySnapshot.js';

type TelemetryRecord = {
  id: string;
  spacecraftId: string;
  timestamp: string;
  parameters: Record<string, number | string | boolean>;
};

export class FileTelemetryRepository implements TelemetryRepository {
  private filePath: string;
  constructor(private dataDir: string) {
    this.filePath = join(dataDir, 'telemetry.json');
  }

  private async readAll(): Promise<TelemetryRecord[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data) as TelemetryRecord[];
    } catch (err: unknown) {
      return [];
    }
  }

  private async writeAll(records: TelemetryRecord[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf8');
  }

  async save(snapshot: TelemetrySnapshot): Promise<void> {
    const records = await this.readAll();
    const idx = records.findIndex((r) => r.id === snapshot.id);
    const rec: TelemetryRecord = {
      id: snapshot.id,
      spacecraftId: snapshot.spacecraftId,
      timestamp: snapshot.timestamp.toISOString(),
      parameters: snapshot.parameters,
    };
    if (idx >= 0) records[idx] = rec;
    else records.push(rec);
    await this.writeAll(records);
  }

  async findRecent(spacecraftId: string, limit: number): Promise<TelemetrySnapshot[]> {
    const records = await this.readAll();
    return records
      .filter((r) => r.spacecraftId === spacecraftId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map((r) =>
        TelemetrySnapshot.create({
          id: r.id,
          spacecraftId: r.spacecraftId,
          timestamp: new Date(r.timestamp),
          parameters: r.parameters,
        }),
      );
  }

  async findById(id: string): Promise<TelemetrySnapshot | null> {
    const records = await this.readAll();
    const r = records.find((x) => x.id === id);
    return r
      ? TelemetrySnapshot.create({
          id: r.id,
          spacecraftId: r.spacecraftId,
          timestamp: new Date(r.timestamp),
          parameters: r.parameters,
        })
      : null;
  }

  async findInRange(spacecraftId: string, from: Date, to: Date): Promise<TelemetrySnapshot[]> {
    const records = await this.readAll();
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return records
      .filter((r) => r.spacecraftId === spacecraftId)
      .filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= fromMs && t <= toMs;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((r) =>
        TelemetrySnapshot.create({
          id: r.id,
          spacecraftId: r.spacecraftId,
          timestamp: new Date(r.timestamp),
          parameters: r.parameters,
        }),
      );
  }
}
