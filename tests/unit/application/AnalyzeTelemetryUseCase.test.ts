import { describe, it, expect } from 'vitest';
import { AnalyzeTelemetryUseCase } from '../../../src/application/telemetry/AnalyzeTelemetryUseCase.js';
import { InMemoryTelemetryRepository } from '../../../src/infrastructure/persistence/inMemory/InMemoryTelemetryRepository.js';
import { TelemetrySnapshot } from '../../../src/domain/telemetry/TelemetrySnapshot.js';
import { getLogger } from '../../../src/logging/logger.js';
import { InMemorySpacecraftConfigRepository } from '../../../src/infrastructure/persistence/inMemory/InMemorySpacecraftConfigRepository.js';

describe('AnalyzeTelemetryUseCase', () => {
  it('detects threshold anomalies', async () => {
    const repo = new InMemoryTelemetryRepository();
    const logger = getLogger();
    const cfgRepo = new InMemorySpacecraftConfigRepository();
    const uc = new AnalyzeTelemetryUseCase(repo, cfgRepo, logger);
    const ts1 = TelemetrySnapshot.create({
      id: 't1',
      spacecraftId: 'SC-1',
      timestamp: new Date('2025-01-01T00:00:00Z'),
      parameters: { temp: 10 },
    });
    const ts2 = TelemetrySnapshot.create({
      id: 't2',
      spacecraftId: 'SC-1',
      timestamp: new Date('2025-01-01T00:01:00Z'),
      parameters: { temp: 100 },
    });
    await repo.save(ts1);
    await repo.save(ts2);
    await cfgRepo.upsert('SC-1', { parameters: { temp: { warnHigh: 50 } } });
    const anomalies = await uc.execute({ spacecraftId: 'SC-1', limit: 5 });
    expect(anomalies.length).toBeGreaterThan(0);
  });

  it('respects time window when from/to are provided', async () => {
    const repo = new InMemoryTelemetryRepository();
    const logger = getLogger();
    const cfgRepo = new InMemorySpacecraftConfigRepository();
    const uc = new AnalyzeTelemetryUseCase(repo, cfgRepo, logger);
    const sc = 'SC-RANGE';
    await cfgRepo.upsert(sc, { parameters: { temp: { warnHigh: 50, critHigh: 90 } } });
    const base = new Date('2025-01-01T00:00:00Z').getTime();
    const mk = (mins: number, val: number, id: string) =>
      TelemetrySnapshot.create({
        id,
        spacecraftId: sc,
        timestamp: new Date(base + mins * 60_000),
        parameters: { temp: val },
      });
    // t=0 normal, t=30 warn, t=90 crit
    await repo.save(mk(0, 40, 'r0'));
    await repo.save(mk(30, 60, 'r30'));
    await repo.save(mk(90, 100, 'r90'));
    // Window [20, 60] mins should include only r30
    const anomalies = await uc.execute({
      spacecraftId: sc,
      from: new Date(base + 20 * 60_000),
      to: new Date(base + 60 * 60_000),
    });
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].id.includes('r30')).toBe(true);
  });
});
