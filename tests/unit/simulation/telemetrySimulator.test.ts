import { describe, it, expect } from 'vitest';
import { simulateTelemetryForSpacecraft } from '../../../src/simulation/telemetrySimulator.js';
import { InMemoryTelemetryRepository } from '../../../src/infrastructure/persistence/inMemory/InMemoryTelemetryRepository.js';

function fixedRng() {
  return 0.5;
}

const baseNow = new Date('2025-01-01T00:10:00Z').getTime();

describe('telemetrySimulator', () => {
  it('generates the expected number of snapshots for LEO_IMAGING', async () => {
    const repo = new InMemoryTelemetryRepository();
    const sc = {
      id: 'SC-SIM',
      name: 'Sim',
      missionType: 'LEO_IMAGING',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    await simulateTelemetryForSpacecraft(sc, repo, {
      durationMinutes: 2,
      intervalSeconds: 60,
      nowMs: baseNow,
      rng: fixedRng,
    });
    const list = await repo.findRecent('SC-SIM', 10);
    expect(list.length).toBe(2);
    // Repository returns most-recent-first (descending by timestamp)
    expect(list[0].timestamp.getTime()).toBeGreaterThan(list[1].timestamp.getTime());
    const p = list[0].parameters as Record<string, unknown>;
    expect(p).toHaveProperty('battery_soc');
    expect(p).toHaveProperty('imaging_mode');
  });

  it('handles CUBESAT mission type fields', async () => {
    const repo = new InMemoryTelemetryRepository();
    const sc = {
      id: 'SC-CUBE',
      name: 'Cube',
      missionType: 'CUBESAT',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    await simulateTelemetryForSpacecraft(sc, repo, {
      durationMinutes: 1,
      intervalSeconds: 30,
      nowMs: baseNow,
      rng: fixedRng,
    });
    const list = await repo.findRecent('SC-CUBE', 10);
    expect(list.length).toBe(2);
    const p = list[0].parameters as Record<string, unknown>;
    expect(p).toHaveProperty('magnetorquer_current_ma');
    expect(p).toHaveProperty('mode');
  });
});
